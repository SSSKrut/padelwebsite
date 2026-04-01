import { prisma } from "./lib/prisma";
import { defineHandler } from "./lib/apiHandler";
import { verifyUser } from "./lib/auth";

export const handler = defineHandler({
  method: "GET",
  handler: async ({ event }) => {
    // Optional auth — check if current user is premium
    let isPremium = false;
    try {
      const currentUser = await verifyUser(event);
      isPremium = (currentUser.premiumSubscriptions?.length ?? 0) > 0;
    } catch {
      // Not logged in or invalid token — that's fine
    }

    const now = new Date();

    const events = await prisma.event.findMany({
      where: isPremium
        ? { status: { in: ["PUBLISHED", "ARCHIVED", "SCHEDULED"] } }
        : {
            OR: [
              { status: { in: ["PUBLISHED", "ARCHIVED"] } },
              { status: "SCHEDULED", publishAt: { lte: now } },
            ],
          },
      orderBy: { date: "asc" },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });

    return events;
  },
});
