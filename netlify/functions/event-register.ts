import { defineHandler } from "./lib/apiHandler";
import { z } from "zod";
import { prisma } from "./lib/prisma";
import { isUserPremium } from "./lib/premium";
import { sendEmail } from "./lib/email";
import { buildEventEmailData } from "./lib/eventEmail";

export const handler = defineHandler({
  method: "POST",
  requireAuth: true,
  bodySchema: z.object({
    eventId: z.string().uuid(),
  }),
  handler: async ({ body, user }) => {
    const { eventId } = body;
    const isPremiumUser = await isUserPremium(user!.id);

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

    const eventEmailData = buildEventEmailData(targetEvent);

    // Status check: PUBLISHED is open to all.
    // SCHEDULED is restricted to premium users and admins.
    if (targetEvent.status !== "PUBLISHED") {
      if (targetEvent.status === "SCHEDULED") {
        const isCurrentUserAdmin = user!.role === "ADMIN" || user!.role === "SUPER_ADMIN";

        if (!isPremiumUser && !isCurrentUserAdmin) {
          return {
            statusCode: 403,
            body: JSON.stringify({ error: "Event is not open for registration" }),
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
    const result = await prisma.$transaction(async (tx) => {
      const getPriorityWaitlistOrder = async () => {
        const waitlistEntries = await tx.eventWaitlist.findMany({
          where: { eventId },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                premiumSubscriptions: {
                  where: { revokedAt: null },
                  select: { id: true },
                  take: 1,
                },
              },
            },
          },
        });

        const premiumEntries = waitlistEntries.filter((entry) => entry.user.premiumSubscriptions.length > 0);
        const regularEntries = waitlistEntries.filter((entry) => entry.user.premiumSubscriptions.length === 0);

        return [...premiumEntries, ...regularEntries];
      };

      const existingRegistration = await tx.eventRegistration.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId: user!.id,
          },
        },
      });

      const existingWaitlistEntry = await tx.eventWaitlist.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId: user!.id,
          },
        },
      });

      const promoteNextWaitlistedUser = async () => {
        while (true) {
          const waitlistOrder = await getPriorityWaitlistOrder();
          const nextWaitlistEntry = waitlistOrder[0] ?? null;

          if (!nextWaitlistEntry) {
            return null;
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
          return nextWaitlistEntry.userId;
        }
      };

      if (existingRegistration) {
        await tx.eventRegistration.delete({
          where: { id: existingRegistration.id },
        });

        const promotedUserId = await promoteNextWaitlistedUser();

        return {
          message: promotedUserId
            ? "Successfully unregistered. First player in waitlist has been promoted"
            : "Successfully unregistered",
          registered: false,
          waitlisted: false,
          promotedUserId,
        };
      }

      if (existingWaitlistEntry) {
        await tx.eventWaitlist.delete({ where: { id: existingWaitlistEntry.id } });
        return {
          message: "Removed from waitlist",
          registered: false,
          waitlisted: false,
        };
      }

      // Re-check participant count inside the transaction
      const count = await tx.eventRegistration.count({ where: { eventId } });
      const waitlistHasEntries = await tx.eventWaitlist.findFirst({
        where: { eventId },
        select: { id: true },
      });

      if (count >= targetEvent.maxParticipants || waitlistHasEntries) {
        const createdWaitlistEntry = await tx.eventWaitlist.create({
          data: {
            eventId,
            userId: user!.id,
          },
          select: { id: true },
        });

        const waitlistOrder = await getPriorityWaitlistOrder();

        const waitlistPosition = waitlistOrder.findIndex((entry) => entry.id === createdWaitlistEntry.id) + 1;
        const waitlistAhead = waitlistPosition > 0 ? waitlistPosition - 1 : 0;

        return {
          message: isPremiumUser
            ? "Event is full. You were added to the premium waitlist"
            : "Event is full. You were added to the waitlist",
          registered: false,
          waitlisted: true,
          waitlistPosition,
          waitlistAhead,
        };
      }

      await tx.eventRegistration.create({
        data: {
          eventId,
          userId: user!.id,
        }
      });

      return {
        message: "Successfully registered",
        registered: true,
        waitlisted: false,
      };
    });

    const safeSendEmail = async (options: Parameters<typeof sendEmail>[0], context: string) => {
      try {
        await sendEmail(options);
      } catch (err) {
        console.error(`[event-register] Failed to send ${context} email:`, err);
      }
    };

    if (result.registered) {
      await safeSendEmail(
        {
          to: user!.email,
          template: "event-registration",
          data: {
            firstName: user!.firstName,
            ...eventEmailData,
          },
        },
        "registration",
      );
    }

    if (result.waitlisted) {
      await safeSendEmail(
        {
          to: user!.email,
          template: "event-waitlist",
          data: {
            firstName: user!.firstName,
            isPremium: isPremiumUser,
            ...eventEmailData,
          },
        },
        "waitlist",
      );
    }

    if (result.promotedUserId) {
      const promotedUser = await prisma.user.findUnique({
        where: { id: result.promotedUserId },
        select: { email: true, firstName: true },
      });

      if (promotedUser) {
        await safeSendEmail(
          {
            to: promotedUser.email,
            template: "event-waitlist-promotion",
            data: {
              firstName: promotedUser.firstName,
              ...eventEmailData,
            },
          },
          "waitlist promotion",
        );
      }
    }

    return result;
  }
});
