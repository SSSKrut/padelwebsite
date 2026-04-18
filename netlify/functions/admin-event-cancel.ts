import { z } from "zod";
import { defineHandler } from "./lib/apiHandler";
import { prisma } from "./lib/prisma";
import { sendEmail } from "./lib/email";
import { buildEventEmailData } from "./lib/eventEmail";
import { buildSiteUrl } from "./lib/siteUrl";

const bodySchema = z.object({
  eventId: z.string().min(1),
  message: z.string().min(1, "Cancellation message is required"),
});

export const handler = defineHandler({
  method: "POST",
  requireAdmin: true,
  bodySchema,
  handler: async ({ body, user }) => {
    const { eventId, message } = body;

    // Load event with participants and waitlisted users
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        participants: {
          include: { user: { select: { id: true, email: true, firstName: true } } },
        },
        waitlist: {
          include: { user: { select: { id: true, email: true, firstName: true } } },
        },
        cancellation: true,
      },
    });

    if (!event) {
      return { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) };
    }

    if (event.cancellation) {
      return { statusCode: 400, body: JSON.stringify({ error: "Event is already cancelled" }) };
    }

    // Archive the event and create cancellation record
    await prisma.$transaction([
      prisma.event.update({
        where: { id: eventId },
        data: { status: "ARCHIVED" },
      }),
      prisma.eventCancellation.create({
        data: {
          eventId,
          cancelledById: user.id,
          message,
        },
      }),
    ]);

    // Collect all users to notify (participants + waitlist)
    const allUsers = [
      ...event.participants.map((p) => p.user),
      ...event.waitlist.map((w) => w.user),
    ];

    // Deduplicate by user id
    const uniqueUsers = Array.from(
      new Map(allUsers.map((u) => [u.id, u])).values()
    );

    // Build shared email data from event
    const emailData = buildEventEmailData(event);

    // Send cancellation emails (fire-and-forget, don't block response)
    const emailPromises = uniqueUsers.map((recipient) =>
      sendEmail({
        to: recipient.email,
        userId: recipient.id,
        template: "event-cancelled",
        data: {
          firstName: recipient.firstName,
          ...emailData,
          cancelMessage: message,
          actionUrl: buildSiteUrl("/events"),
        },
      }).catch((err) => {
        console.error(`[CancelEvent] Failed to email ${recipient.email}:`, err);
      })
    );

    // Wait for all emails but don't fail the request if some fail
    await Promise.allSettled(emailPromises);

    return {
      cancelled: true,
      notified: uniqueUsers.length,
    };
  },
});
