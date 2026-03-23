import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    premiumSubscription: { findFirst: vi.fn() },
  },
}));

import { isUserPremium } from "../functions/lib/premium";
import { prisma } from "../functions/lib/prisma";

const USER_ID = "11111111-2222-3333-4444-555555555555";

describe("isUserPremium", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when user has active subscription", async () => {
    vi.mocked(prisma.premiumSubscription.findFirst).mockResolvedValue({
      id: "sub-1",
      userId: USER_ID,
      grantedById: "admin-1",
      grantedAt: new Date(),
      revokedAt: null,
    } as never);

    expect(await isUserPremium(USER_ID)).toBe(true);
    expect(prisma.premiumSubscription.findFirst).toHaveBeenCalledWith({
      where: { userId: USER_ID, revokedAt: null },
    });
  });

  it("returns false when user has no subscriptions", async () => {
    vi.mocked(prisma.premiumSubscription.findFirst).mockResolvedValue(null);
    expect(await isUserPremium(USER_ID)).toBe(false);
  });

  it("returns false when all subscriptions are revoked", async () => {
    vi.mocked(prisma.premiumSubscription.findFirst).mockResolvedValue(null);
    expect(await isUserPremium(USER_ID)).toBe(false);
  });
});
