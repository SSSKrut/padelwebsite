import { schedule } from "@netlify/functions";
import { publishScheduledEvents } from "./lib/publishScheduled";

// Runs every 5 minutes in production
export const handler = schedule("*/5 * * * *", async () => {
  await publishScheduledEvents();
  return { statusCode: 200 };
});
