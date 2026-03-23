import type { Handler } from "@netlify/functions";
import { verifyAdmin } from "./lib/auth";
import { prisma } from "./lib/prisma";

export const handler: Handler = async (event) => {
  let currentUser;
  try {
    currentUser = await verifyAdmin(event);
  } catch (err: any) {
    return { statusCode: err.message === "Forbidden" ? 403 : 401, body: JSON.stringify({ error: err.message }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    if (!body.userId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing userId" }) };
    }

    if (event.httpMethod === "POST") {
      // Grant premium
      const existing = await prisma.premiumSubscription.findFirst({
        where: { userId: body.userId, revokedAt: null },
      });
      if (existing) {
        return { statusCode: 409, body: JSON.stringify({ error: "User already has active premium" }) };
      }

      const sub = await prisma.premiumSubscription.create({
        data: {
          userId: body.userId,
          grantedById: currentUser.id,
        },
      });

      return { statusCode: 200, body: JSON.stringify({ message: "Premium granted", subscription: sub }) };
    }

    if (event.httpMethod === "DELETE") {
      // Revoke premium
      const active = await prisma.premiumSubscription.findFirst({
        where: { userId: body.userId, revokedAt: null },
      });
      if (!active) {
        return { statusCode: 404, body: JSON.stringify({ error: "No active premium subscription found" }) };
      }

      await prisma.premiumSubscription.update({
        where: { id: active.id },
        data: { revokedAt: new Date() },
      });

      return { statusCode: 200, body: JSON.stringify({ message: "Premium revoked" }) };
    }

    return { statusCode: 405, body: "Method not allowed" };
  } catch (error) {
    console.error("Admin Premium Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
