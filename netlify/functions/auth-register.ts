import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./lib/prisma";
import { signAccessToken, signRefreshToken } from "./lib/jwt";
import { makeAccessCookie, makeRefreshCookie } from "./lib/cookies";
import { sanitizeUser } from "./lib/auth";
import { defineHandler } from "./lib/apiHandler";
import { createToken, buildActionUrl } from "./lib/tokens";
import { sendEmail } from "./lib/email";

const RequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional().nullable(),
});

export const handler = defineHandler({
  method: "POST",
  bodySchema: RequestSchema,
  handler: async ({ body }) => {
    const email = body.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { statusCode: 409, body: JSON.stringify({ error: "Email already registered." }) };
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, firstName: body.firstName, lastName: body.lastName, phone: body.phone },
      include: { achievements: { include: { achievement: true } } },
    });

    try {
      const { token } = await createToken(user.id, "EMAIL_VERIFICATION");
      const actionUrl = buildActionUrl("/verify-email", token);
      await sendEmail({
        to: user.email,
        userId: user.id,
        template: "email-verification",
        data: { firstName: user.firstName, actionUrl },
      });
    } catch (err) {
      console.error("[Register] Verification email failed:", err);
    }

    const tokenPayload = { sub: user.id };
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(tokenPayload),
      signRefreshToken(tokenPayload),
    ]);

    return {
      statusCode: 201,
      multiValueHeaders: {
        "Set-Cookie": [makeAccessCookie(accessToken), makeRefreshCookie(refreshToken)],
        "Content-Type": ["application/json"],
      },
      body: JSON.stringify({ user: sanitizeUser(user) }),
    };
  },
});
