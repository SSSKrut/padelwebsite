import type { Handler } from "@netlify/functions";
import { verifyUser, sanitizeUser } from "./lib/auth";

export const handler: Handler = async (event) => {
  try {
    const user = await verifyUser(event);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: sanitizeUser(user) }),
    };
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized." }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
