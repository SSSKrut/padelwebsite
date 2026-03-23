import type { Handler } from "@netlify/functions";
import { verifyAdmin } from "./lib/auth";
import { sendEventReminders } from "./lib/sendEventReminders";

export const handler: Handler = async (event) => {
  try {
    await verifyAdmin(event);
  } catch (err: any) {
    return { statusCode: err.message === "Forbidden" ? 403 : 401, body: JSON.stringify({ error: err.message }) };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const count = await sendEventReminders();

  return {
    statusCode: 200,
    body: JSON.stringify({ reminders: count }),
  };
};
