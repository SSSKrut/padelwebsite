import { defineHandler } from "./lib/apiHandler";
import { prisma } from "./lib/prisma";
import { z } from "zod";

export const handler = defineHandler({
  method: "DELETE",
  requireAdmin: true,
  handler: async ({ event }) => {
    const parsedBody = z
      .object({
        eventId: z.string().uuid(),
        userId: z.string().uuid(),
      })
      .safeParse(event.body ? JSON.parse(event.body) : {});

    if (!parsedBody.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Validation Error",
          details: parsedBody.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        }),
      };
    }

    const { eventId, userId } = parsedBody.data;

    return await prisma.$transaction(async (tx) => {
      const existingRegistration = await tx.eventRegistration.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId,
          },
        },
        select: {
          id: true,
        },
      });

      if (!existingRegistration) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Player is not registered for this event" }),
        };
      }

      await tx.eventRegistration.delete({
        where: { id: existingRegistration.id },
      });

      let promotedUserId: string | null = null;
      while (true) {
        const nextWaitlistEntry = await tx.eventWaitlist.findFirst({
          where: { eventId },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });

        if (!nextWaitlistEntry) {
          break;
        }

        const alreadyRegistered = await tx.eventRegistration.findUnique({
          where: {
            eventId_userId: {
              eventId,
              userId: nextWaitlistEntry.userId,
            },
          },
          select: { id: true },
        });

        if (alreadyRegistered) {
          await tx.eventWaitlist.delete({ where: { id: nextWaitlistEntry.id } });
          continue;
        }

        await tx.eventRegistration.create({
          data: {
            eventId,
            userId: nextWaitlistEntry.userId,
          },
        });

        await tx.eventWaitlist.delete({ where: { id: nextWaitlistEntry.id } });
        promotedUserId = nextWaitlistEntry.userId;
        break;
      }

      return {
        message: promotedUserId
          ? "Player removed from event registration and first waitlisted player promoted"
          : "Player removed from event registration",
        removed: true,
        promotedUserId,
      };
    });
  },
});