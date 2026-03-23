import { prisma } from "./lib/prisma";
import { defineHandler } from "./lib/apiHandler";
import { publicName } from "./lib/sanitize";
import { verifyUser } from "./lib/auth";

export const handler = defineHandler({
  method: "GET",
  requireAuth: false,
  handler: async ({ event }) => {
    const eventId = event.queryStringParameters?.id;

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
          }
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

    // SCHEDULED events are only visible to premium users (early access)
    if (padelEvent.status === "SCHEDULED") {
      try {
        const currentUser = await verifyUser(event);
        const isPremium = (currentUser.premiumSubscriptions?.length ?? 0) > 0;
        if (!isPremium) {
          return { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) };
        }
      } catch {
        return { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) };
      }
    }

    // Map user.firstName and user.lastName to user.name
    const formattedEvent = {
      ...padelEvent,
      participants: padelEvent.participants.map(p => ({
        ...p,
        user: {
          ...p.user,
          name: publicName(p.user.firstName, p.user.lastName),
        }
      }))
    };

    return formattedEvent;
  }
});
