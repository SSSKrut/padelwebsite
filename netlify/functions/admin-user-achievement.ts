import type { Handler } from "@netlify/functions";
import { prisma } from "./lib/prisma";
import { verifyAdmin } from "./lib/auth";

export const handler: Handler = async (event) => {
  try {
    await verifyAdmin(event);
  } catch (err: any) {
    return { statusCode: err.message === "Forbidden" ? 403 : 401, body: JSON.stringify({ error: err.message }) };
  }

  try {
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { userId, achievementId } = body;

      if (!userId || !achievementId) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing parameters" }) };
      }

      const userAchievement = await prisma.userAchievement.create({
        data: {
          userId,
          achievementId,
        },
      });

      return { statusCode: 201, body: JSON.stringify(userAchievement) };
    }
    
    if (event.httpMethod === "DELETE") {
      const body = JSON.parse(event.body || "{}");
      const { userAchievementId } = body;

      if (!userAchievementId) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing userAchievementId" }) };
      }

      await prisma.userAchievement.delete({
        where: { id: userAchievementId },
      });

      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, body: "Method not allowed" };
  } catch (error) {
    console.error("Grant/Remove Achievement Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
