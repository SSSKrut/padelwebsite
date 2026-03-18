import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";
import { defineHandler } from "./lib/apiHandler";

export const handler = defineHandler({
  method: ["GET", "PATCH"],
  requireAuth: true,
  bodySchema: z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters").optional(),
    lastName: z.string().min(2, "Last name must be at least 2 characters").optional(),
    phone: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
  }).optional(),
  handler: async ({ event, body, user }) => {
    
    if (event.httpMethod === "GET") {
      const fullUser = await prisma.user.findUnique({
        where: { id: user!.id },
        include: {
          achievements: {
            include: {
              achievement: true
            },
            orderBy: { dateAwarded: "desc" }
          },
          registrations: {
            include: {
              event: {
                include: {
                  _count: {
                    select: { participants: true }
                  }
                }
              }
            },
            orderBy: {
              event: {
                date: "desc"
              }
            }
          }
        },
      });

      if (!fullUser) {
        return { statusCode: 404, body: JSON.stringify({ error: "User not found" }) };
      }

      // Hide password
      const { passwordHash, ...safeUser } = fullUser;
      return safeUser;
    }

    if (event.httpMethod === "PATCH") {
      if (!body || Object.keys(body).length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: "No fields provided to update" }) };
      }

      const updateData: Record<string, any> = {};

      if (body.firstName) updateData.firstName = body.firstName;
      if (body.lastName) updateData.lastName = body.lastName;
      if (body.phone !== undefined) updateData.phone = body.phone;

      if (body.newPassword) {
        if (!body.currentPassword) {
          return { statusCode: 400, body: JSON.stringify({ error: "Current password is required to set a new password." }) };
        }
        const dbUser = await prisma.user.findUnique({ where: { id: user!.id } });
        const valid = dbUser && await bcrypt.compare(body.currentPassword, dbUser.passwordHash);
        if (!valid) {
          return { statusCode: 401, body: JSON.stringify({ error: "Current password is incorrect." }) };
        }
        updateData.passwordHash = await bcrypt.hash(body.newPassword, 12);
      }

      if (Object.keys(updateData).length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: "No fields provided to update" }) };
      }

      const updatedUser = await prisma.user.update({
        where: { id: user!.id },
        data: updateData,
      });

      const { passwordHash, ...safeUser } = updatedUser;
      return { message: "Profile updated successfully", user: safeUser };
    }

    return { statusCode: 405, body: "Method not allowed" };
  },
});
