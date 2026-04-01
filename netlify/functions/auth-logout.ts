import type { Handler } from "@netlify/functions";
import { clearCookies } from "./lib/cookies";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  return {
    statusCode: 200,
    multiValueHeaders: {
      "Set-Cookie": clearCookies(),
      "Content-Type": ["application/json"],
    },
    body: JSON.stringify({ ok: true }),
  };
};
