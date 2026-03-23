import { prisma } from "./prisma";
import { sendEmail } from "./email";

/**
 * Finds PUBLISHED events starting in ~24h (24–25h window) that haven't had
 * reminders sent yet, and emails each participant individually.
 * Returns the number of events processed.
 */
export async function sendEventReminders(): Promise<number> {
  const now = new Date();
  const from = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      date: { gte: from, lte: to },
      reminderSentAt: null,
    },
    include: {
      participants: {
        include: {
          user: { select: { email: true, firstName: true } },
        },
      },
    },
  });

  for (const event of events) {
    const eventDate = event.date.toISOString().split("T")[0];
    const eventTime = event.date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Vienna" });

    for (const reg of event.participants) {
      try {
        await sendEmail({
          to: reg.user.email,
          template: "event-reminder",
          data: {
            firstName: reg.user.firstName,
            eventTitle: event.title,
            eventDate,
            eventTime,
            eventVenue: event.location ?? undefined,
            actionUrl: `https://sunsetpadel.at/events/${event.id}`,
          },
        });
      } catch (err) {
        console.error(`[event-reminder] Failed to send to ${reg.user.email} for event ${event.id}:`, err);
      }
    }

    await prisma.event.update({
      where: { id: event.id },
      data: { reminderSentAt: now },
    });

    console.log(`[event-reminder] Sent ${event.participants.length} reminder(s) for "${event.title}"`);
  }

  console.log(`[event-reminder] Processed ${events.length} event(s) at ${now.toISOString()}`);
  return events.length;
}
