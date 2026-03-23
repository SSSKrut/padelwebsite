import { prisma } from "./prisma";

/**
 * Returns true if the user has an active (non-revoked) premium subscription.
 */
export async function isUserPremium(userId: string): Promise<boolean> {
  const sub = await prisma.premiumSubscription.findFirst({
    where: { userId, revokedAt: null },
  });
  return sub !== null;
}
