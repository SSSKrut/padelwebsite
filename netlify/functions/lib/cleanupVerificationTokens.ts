import { prisma } from "./prisma";

export async function cleanupVerificationTokens(now: Date = new Date()) {
  const result = await prisma.verificationToken.deleteMany({
    where: {
      OR: [
        { usedAt: { not: null } },
        { expiresAt: { lt: now } },
      ],
    },
  });

  return result.count;
}
