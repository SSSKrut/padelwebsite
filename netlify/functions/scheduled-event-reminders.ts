import { schedule } from "@netlify/functions";
import { sendEventReminders } from "./lib/sendEventReminders";

// Runs every 5 minutes in production
export const handler = schedule("*/5 * * * *", async () => {
  await sendEventReminders();
  return { statusCode: 200 };
});
