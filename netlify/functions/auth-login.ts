import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./lib/prisma";
import { signAccessToken, signRefreshToken } from "./lib/jwt";
import { makeAccessCookie, makeRefreshCookie } from "./lib/cookies";
import { sanitizeUser } from "./lib/auth";
import { defineHandler } from "./lib/apiHandler";
import { checkRateLimit, rateLimitedResponse } from "./lib/rateLimit";

const LOGIN_RATE_LIMIT = { maxAttempts: 10, windowMs: 15 * 60 * 1000 }; // 10 attempts per 15 min

const RequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const handler = defineHandler({
  method: "POST",
  bodySchema: RequestSchema,
  handler: async ({ body, event }) => {
    const ip = event.headers["x-forwarded-for"]?.split(",")[0]?.trim() || event.headers["client-ip"] || "unknown";
    const rl = checkRateLimit(`login:${ip}`, LOGIN_RATE_LIMIT);
    if (!rl.allowed) return rateLimitedResponse(rl.retryAfterMs);

    const email = body.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        achievements: { include: { achievement: true } },
        premiumSubscriptions: { where: { revokedAt: null }, take: 1 },
      },
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
