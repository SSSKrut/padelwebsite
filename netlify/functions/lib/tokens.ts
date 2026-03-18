import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { TokenType } from "../../../generated/prisma";

const TOKEN_TTL: Record<TokenType, number> = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET: 60 * 60 * 1000,          // 1 hour
};

/** Create a token, invalidating any unused tokens of the same type for this user. */
export async function createToken(userId: string, type: TokenType) {
  // Invalidate previous unused tokens of the same type
  await prisma.verificationToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL[type]);

  return prisma.verificationToken.create({
    data: { token, type, expiresAt, userId },
  });
}

/** Consume a token — returns the token record if valid, throws otherwise. */
export async function consumeToken(token: string, expectedType: TokenType) {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record) throw new TokenError("Invalid or expired link.");
  if (record.type !== expectedType) throw new TokenError("Invalid or expired link.");
  if (record.usedAt) throw new TokenError("This link has already been used.");
  if (record.expiresAt < new Date()) throw new TokenError("This link has expired.");

  // Mark as used
  await prisma.verificationToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record;
}

export function buildActionUrl(path: string, token: string): string {
  const base = (process.env.SITE_URL || "http://localhost:8080").replace(/\/$/, "");
  return `${base}${path}?token=${token}`;
}

class TokenError extends Error {
  statusCode = 400;
}
