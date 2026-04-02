import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    verificationToken: {
      deleteMany: vi.fn(),
    },
  },
}));

import { cleanupVerificationTokens } from "../functions/lib/cleanupVerificationTokens";
import { prisma } from "../functions/lib/prisma";

describe("cleanupVerificationTokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.verificationToken.deleteMany).mockResolvedValue({ count: 3 } as never);
  });

  it("deletes used or expired tokens", async () => {
    const count = await cleanupVerificationTokens(new Date("2026-04-02T00:00:00Z"));

    expect(count).toBe(3);
    expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { usedAt: { not: null } },
          { expiresAt: { lt: new Date("2026-04-02T00:00:00Z") } },
        ],
      },
    });
  });
});
