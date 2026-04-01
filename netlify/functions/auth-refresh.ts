import type { Handler } from "@netlify/functions";
import { verifyToken, signAccessToken } from "./lib/jwt";
import { parseCookies, makeAccessCookie } from "./lib/cookies";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const cookies = parseCookies(event.headers["cookie"] ?? event.headers["Cookie"]);
    const token = cookies["refresh_token"];

    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: "No refresh token." }) };
    }

    const payload = await verifyToken(token);
    const userId = payload.sub as string;

    const newAccessToken = await signAccessToken({ sub: userId });

    return {
      statusCode: 200,
      multiValueHeaders: {
        "Set-Cookie": [makeAccessCookie(newAccessToken)],
        "Content-Type": ["application/json"],
      },
      body: JSON.stringify({ ok: true }),
    };
  } catch {
    return { statusCode: 401, body: JSON.stringify({ error: "Invalid or expired refresh token." }) };
  }
};
