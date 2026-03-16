import { prisma } from "./lib/prisma";
import { defineHandler } from "./lib/apiHandler";

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

    // Map user.firstName and user.lastName to user.name
    const formattedEvent = {
      ...padelEvent,
      participants: padelEvent.participants.map(p => ({
        ...p,
        user: {
          ...p.user,
          name: `${p.user.firstName} ${p.user.lastName}`.trim(),
        }
      }))
    };

    return formattedEvent;
  }
});
