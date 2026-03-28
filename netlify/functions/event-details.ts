import { prisma } from "./lib/prisma";
import { defineHandler } from "./lib/apiHandler";
import { publicName } from "./lib/sanitize";
import { verifyUser } from "./lib/auth";

export const handler = defineHandler({
  method: "GET",
  requireAuth: false,
  handler: async ({ event }) => {
    const eventId = event.queryStringParameters?.id;
    let currentUser: Awaited<ReturnType<typeof verifyUser>> | null = null;

    try {
      currentUser = await verifyUser(event);
    } catch {
      currentUser = null;
    }

    const isCurrentUserPremium = (currentUser?.premiumSubscriptions?.length ?? 0) > 0;
    const isCurrentUserAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";

    if (!eventId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing event ID" }) };
    }

    const padelEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                elo: true
              }
            }
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
        waitlist: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                elo: true,
              },
            },
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        }
      }
    });

    if (!padelEvent) {
      return { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) };
    }

    // DRAFT events are not visible to anyone via public API
    if (padelEvent.status === "DRAFT") {
      return { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) };
    }

    // SCHEDULED events are only visible to premium users within 24h of publishAt (early access)
    if (padelEvent.status === "SCHEDULED") {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      if (!padelEvent.publishAt || padelEvent.publishAt > in24h) {
        return { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) };
      }

      if (!isCurrentUserPremium) {
        return { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) };
      }
    }

    const waitlist = padelEvent.waitlist ?? [];

    const formattedWaitlist = waitlist.map((entry) => ({
      ...entry,
      user: {
        ...entry.user,
        name: publicName(entry.user.firstName, entry.user.lastName),
      },
    }));

    const currentUserWaitlistIndex = currentUser
      ? formattedWaitlist.findIndex((entry) => entry.user.id === currentUser!.id)
      : -1;

    // Map user.firstName and user.lastName to user.name
    const formattedEvent = {
      ...padelEvent,
      participants: padelEvent.participants.map(p => ({
        ...p,
        user: {
          ...p.user,
          name: publicName(p.user.firstName, p.user.lastName),
        }
      })),
      waitlistCount: formattedWaitlist.length,
      currentUserWaitlistPosition: currentUserWaitlistIndex >= 0 ? currentUserWaitlistIndex + 1 : null,
      currentUserWaitlistAhead: currentUserWaitlistIndex >= 0 ? currentUserWaitlistIndex : null,
      waitlist: isCurrentUserAdmin ? formattedWaitlist : [],
    };

    return formattedEvent;
  }
});
