import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";
import { DEFAULT_EMAIL_PREFERENCES, normalizeEmailPreferences } from "./lib/emailPreferences";
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
    emailPreferences: z
      .object({
        welcome: z.boolean().optional(),
        emailVerification: z.boolean().optional(),
        accountApproved: z.boolean().optional(),
        eventRegistration: z.boolean().optional(),
        eventWaitlist: z.boolean().optional(),
        eventWaitlistPromotion: z.boolean().optional(),
        eventCancelled: z.boolean().optional(),
        eventReminder: z.boolean().optional(),
      })
      .optional(),
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
          },
          premiumSubscriptions: { where: { revokedAt: null }, take: 1 },
          emailPreferences: {
            select: {
              welcome: true,
              emailVerification: true,
              passwordReset: true,
              accountApproved: true,
              eventRegistration: true,
              eventWaitlist: true,
              eventWaitlistPromotion: true,
              eventCancelled: true,
              eventReminder: true,
            },
          },
        },
      });

      if (!fullUser) {
        return { statusCode: 404, body: JSON.stringify({ error: "User not found" }) };
      }

      // Hide password, add computed isPremium
      const { passwordHash, premiumSubscriptions, emailPreferences, ...safeUser } = fullUser;
      return {
        ...safeUser,
        emailPreferences: normalizeEmailPreferences(emailPreferences),
        isPremium: (premiumSubscriptions?.length ?? 0) > 0,
      };
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

      const preferenceUpdate = Object.fromEntries(
        Object.entries(body.emailPreferences ?? {}).filter(([, value]) => value !== undefined),
      ) as Record<string, boolean>;

      delete preferenceUpdate.passwordReset;

      const hasProfileUpdate = Object.keys(updateData).length > 0;
      const hasPreferenceUpdate = Object.keys(preferenceUpdate).length > 0;

      if (!hasProfileUpdate && !hasPreferenceUpdate) {
        return { statusCode: 400, body: JSON.stringify({ error: "No fields provided to update" }) };
      }

      if (hasProfileUpdate) {
        await prisma.user.update({
          where: { id: user!.id },
          data: updateData,
        });
      }

      if (hasPreferenceUpdate) {
        await prisma.userEmailPreferences.upsert({
          where: { userId: user!.id },
          create: {
            userId: user!.id,
            ...DEFAULT_EMAIL_PREFERENCES,
            ...preferenceUpdate,
          },
          update: preferenceUpdate,
        });
      }

      const refreshedUser = await prisma.user.findUnique({
        where: { id: user!.id },
        include: {
          emailPreferences: {
            select: {
              welcome: true,
              emailVerification: true,
              passwordReset: true,
              accountApproved: true,
              eventRegistration: true,
              eventWaitlist: true,
              eventWaitlistPromotion: true,
              eventCancelled: true,
              eventReminder: true,
            },
          },
        },
      });

      if (!refreshedUser) {
        return { statusCode: 404, body: JSON.stringify({ error: "User not found" }) };
      }

      const { passwordHash, emailPreferences, ...safeUser } = refreshedUser;
      return {
        message: "Profile updated successfully",
        user: {
          ...safeUser,
          emailPreferences: normalizeEmailPreferences(emailPreferences),
        },
      };
    }

    return { statusCode: 405, body: "Method not allowed" };
  },
});
