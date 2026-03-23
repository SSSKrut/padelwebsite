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

    const MS_IN_DAY = 24 * 60 * 60 * 1000;
    const isLocked = targetEvent.date.getTime() - new Date().getTime() < MS_IN_DAY;

    let premiumBypass = false;
    if (isLocked) {
      const premium = await isUserPremium(user!.id);
      if (!premium) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Registration/unregistration is locked within 24 hours of the event start" }),
        };
      }
      premiumBypass = true;
    }

    const existingRegistration = await prisma.eventRegistration.findFirst({
      where: {
        eventId,
        userId: user!.id,
      },
    });

    if (existingRegistration) {
      await prisma.eventRegistration.delete({
        where: { id: existingRegistration.id },
      });
      return { message: "Successfully unregistered", registered: false, premiumBypass };
    }

    // Checking if the event is full before registering
    if (targetEvent._count.participants >= targetEvent.maxParticipants) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Event is already full" }),
      };
    }

    await prisma.eventRegistration.create({
      data: {
        eventId,
        userId: user!.id,
      }
    });

    return { message: "Successfully registered", registered: true, premiumBypass };
  }
});
