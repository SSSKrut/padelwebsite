import { prisma } from "./lib/prisma";
import { defineHandler } from "./lib/apiHandler";
import { verifyUser } from "./lib/auth";

export const handler = defineHandler({
  method: "GET",
  handler: async ({ event }) => {
    // Optional auth — check if current user is premium/admin
    let isPremium = false;
    let isAdmin = false;
    try {
      const currentUser = await verifyUser(event);
      isPremium = (currentUser.premiumSubscriptions?.length ?? 0) > 0;
      isAdmin = currentUser.role === "ADMIN" || currentUser.role === "SUPER_ADMIN";
    } catch {
      // Not logged in or invalid token — that's fine
    }

    const events = await prisma.event.findMany({
      where: (isPremium || isAdmin)
        ? { status: { in: ["PUBLISHED", "ARCHIVED", "SCHEDULED"] } }
        : { status: { in: ["PUBLISHED", "ARCHIVED"] } },
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
