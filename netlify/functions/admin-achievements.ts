import type { Handler } from "@netlify/functions";
import { prisma } from "./lib/prisma";
import { verifyAdmin } from "./lib/auth";

export const handler: Handler = async (event) => {
  // Try to verify admin
  try {
    await verifyAdmin(event);
  } catch (err: any) {
    return { statusCode: err.message === "Forbidden" ? 403 : 401, body: JSON.stringify({ error: err.message }) };
  }

  try {
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { title, description, icon } = body;

      if (!title) {
        return { statusCode: 400, body: JSON.stringify({ error: "Title is required" }) };
      }

      const achievement = await prisma.achievement.create({
        data: { title, description, icon },
      });

      return { statusCode: 201, body: JSON.stringify(achievement) };
    }

    if (event.httpMethod === "GET") {
      const achievements = await prisma.achievement.findMany({
        orderBy: { title: "asc" },
      });
      return { statusCode: 200, body: JSON.stringify(achievements) };
    }

    if (event.httpMethod === "PATCH") {
      const body = JSON.parse(event.body || "{}");
      const { id, title, description, icon } = body;
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: "Achievement ID required" }) };
      
      const updatedAch = await prisma.achievement.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(icon !== undefined && { icon }),
        }
      });
      return { statusCode: 200, body: JSON.stringify(updatedAch) };
    }

    if (event.httpMethod === "DELETE") {
      const body = JSON.parse(event.body || "{}");
      if (!body.id) return { statusCode: 400, body: JSON.stringify({ error: "Achievement ID required" }) };
      await prisma.achievement.delete({ where: { id: body.id } });
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, body: "Method not allowed" };
  } catch (error) {
    console.error("Admin Achievements Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
