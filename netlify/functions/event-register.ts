import { defineHandler } from "./lib/apiHandler";
import { z } from "zod";
import { prisma } from "./lib/prisma";
import { isUserPremium } from "./lib/premium";

export const handler = defineHandler({
  method: "POST",
  requireAuth: true,
  bodySchema: z.object({
    eventId: z.string().uuid(),
  }),
  handler: async ({ body, user }) => {
    const { eventId } = body;

    const targetEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: { participants: true }
        }
      }
    });

    if (!targetEvent) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Event not found" }),
      };
    }

    // Status check: PUBLISHED is open to all; SCHEDULED is premium-only early access
    if (targetEvent.status !== "PUBLISHED") {
      if (targetEvent.status === "SCHEDULED") {
        const premium = await isUserPremium(user!.id);
        if (!premium) {
          return {
            statusCode: 403,
            body: JSON.stringify({ error: "Event is not yet open for registration" }),
          };
        }
      } else {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Event is not open for registration" }),
        };
      }
    }

    // 24h lock before event start — applies to EVERYONE
    const MS_IN_DAY = 24 * 60 * 60 * 1000;
    const isLocked = targetEvent.date.getTime() - new Date().getTime() < MS_IN_DAY;

    if (isLocked) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Registration/unregistration is locked within 24 hours of the event start" }),
      };
    }

    // Use a transaction to prevent race conditions on participant count
    return await prisma.$transaction(async (tx) => {
      const existingRegistration = await tx.eventRegistration.findFirst({
        where: {
          eventId,
          userId: user!.id,
        },
      });

      if (existingRegistration) {
        await tx.eventRegistration.delete({
          where: { id: existingRegistration.id },
        });
        return { message: "Successfully unregistered", registered: false };
      }

      // Re-check participant count inside the transaction
      const count = await tx.eventRegistration.count({ where: { eventId } });
      if (count >= targetEvent.maxParticipants) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Event is already full" }),
        };
      }

      await tx.eventRegistration.create({
        data: {
          eventId,
          userId: user!.id,
        }
      });

      return { message: "Successfully registered", registered: true };
    });
  }
});
