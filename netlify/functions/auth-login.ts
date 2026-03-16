import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./lib/prisma";
import { signAccessToken, signRefreshToken } from "./lib/jwt";
import { makeAccessCookie, makeRefreshCookie } from "./lib/cookies";
import { sanitizeUser } from "./lib/auth";
import { defineHandler } from "./lib/apiHandler";

const RequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const handler = defineHandler({
  method: "POST",
  bodySchema: RequestSchema,
  handler: async ({ body }) => {
    const email = body.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      include: { achievements: { include: { achievement: true } } },
    });
    
    if (!user) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials." }) };
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials." }) };
    }

    const tokenPayload = { sub: user.id };
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(tokenPayload),
      signRefreshToken(tokenPayload),
    ]);

    return {
      statusCode: 200,
      multiValueHeaders: {
        "Set-Cookie": [makeAccessCookie(accessToken), makeRefreshCookie(refreshToken)],
        "Content-Type": ["application/json"],
      },
      body: JSON.stringify({ user: sanitizeUser(user) }),
    };
  },
});
