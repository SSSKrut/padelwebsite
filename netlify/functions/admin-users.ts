import type { Handler, HandlerEvent } from "@netlify/functions";
import { prisma } from "./lib/prisma";
import { verifyAdmin } from "./lib/auth";

export const handler: Handler = async (event) => {
  let currentUser;
  try {
    currentUser = await verifyAdmin(event);
  } catch (err: any) {
    return { statusCode: err.message === "Forbidden" ? 403 : 401, body: JSON.stringify({ error: err.message }) };
  }

  try {
    if (event.httpMethod === "GET") {
      // List all users, optionally filtered by role
      const role = event.queryStringParameters?.role;
      const users = await prisma.user.findMany({
        where: role ? { role: role as any } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          achievements: {
            include: {
              achievement: true
            }
          },
          premiumSubscriptions: { where: { revokedAt: null }, take: 1 },
        },
      });

      return {
        statusCode: 200,
        body: JSON.stringify(users),
      };
    }

    if (event.httpMethod === "PATCH") {
      const body = JSON.parse(event.body || "{}");
      if (!body.userId) {
         return { statusCode: 400, body: JSON.stringify({ error: "Missing userId" }) };
      }

      if (body.role) {
         const targetUser = await prisma.user.findUnique({ where: { id: body.userId } });
         if (!targetUser) {
             return { statusCode: 404, body: JSON.stringify({ error: "User not found" }) };
         }
         
         const involvesAdmin = targetUser.role === 'ADMIN' || body.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN' || body.role === 'SUPER_ADMIN';
         if (involvesAdmin && currentUser.role !== 'SUPER_ADMIN') {
              return { statusCode: 403, body: JSON.stringify({ error: "Only SUPER_ADMIN can manage admins" }) };
         }
      }

      const updateData: any = {};
      if (body.role) updateData.role = body.role;
      if (body.elo !== undefined) updateData.elo = Number(body.elo);

      const updatedUser = await prisma.user.update({
        where: { id: body.userId },
        data: updateData,
        include: {
          achievements: {
            include: {
              achievement: true
            }
          }
        }
      });

      return {
        statusCode: 200,
        body: JSON.stringify(updatedUser),
      };
    }

    return { statusCode: 405, body: "Method not allowed" };
  } catch (error) {
    console.error("Admin Users Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
