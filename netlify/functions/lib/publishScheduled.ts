import { prisma } from "./prisma";

/**
 * Finds all SCHEDULED events whose publishAt has passed and transitions them to PUBLISHED.
 * Shared between the cron function (production) and the manual trigger (dev/admin).
 */
export async function publishScheduledEvents() {
  const now = new Date();

  const result = await prisma.event.updateMany({
    where: {
      status: "SCHEDULED",
      publishAt: { lte: now },
    },
    data: {
      status: "PUBLISHED",
      publishAt: null,
    },
  });

  console.log(`[scheduled-publish] ${result.count} event(s) published at ${now.toISOString()}`);

  return result.count;
}
