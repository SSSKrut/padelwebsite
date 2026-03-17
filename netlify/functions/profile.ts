import { z } from "zod";
import { prisma } from "./lib/prisma";
import { defineHandler } from "./lib/apiHandler";

export const handler = defineHandler({
  method: ["GET", "PATCH"],
  requireAuth: true,
  bodySchema: z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters").optional(),
    lastName: z.string().min(2, "Last name must be at least 2 characters").optional(),
    phone: z.string().optional(),
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

      const updatedUser = await prisma.user.update({
        where: { id: user!.id },
        data: {
          ...(body.firstName && { firstName: body.firstName }),
          ...(body.lastName && { lastName: body.lastName }),
          ...(body.phone !== undefined && { phone: body.phone }),
        }
      });

      const { passwordHash, ...safeUser } = updatedUser;
      return { message: "Profile updated successfully", user: safeUser };
    }

    return { statusCode: 405, body: "Method not allowed" };
  },
});
