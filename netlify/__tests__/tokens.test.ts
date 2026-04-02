import { vi, describe, it, expect, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const updateMany = vi.fn().mockResolvedValue({ count: 0 });
  const create = vi.fn().mockResolvedValue({ id: "tok-1", token: "mock-token" });
  const findUnique = vi.fn();
  const update = vi.fn().mockResolvedValue({} as never);
  const $transaction = vi.fn();
  return { updateMany, create, findUnique, update, $transaction };
});

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    verificationToken: {
      updateMany: mocks.updateMany,
      create: mocks.create,
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
    $transaction: mocks.$transaction,
  },
}));

vi.mock("../../generated/prisma", () => ({
  TokenType: { EMAIL_VERIFICATION: "EMAIL_VERIFICATION", PASSWORD_RESET: "PASSWORD_RESET" },
}));

import { createToken, consumeToken } from "../functions/lib/tokens";

describe("createToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.$transaction.mockImplementation(async (fn) =>
      fn({
        verificationToken: { updateMany: mocks.updateMany, create: mocks.create },
      })
    );
  });

  it("should use a transaction to atomically invalidate old tokens and create new one", async () => {
    await createToken("user-1", "EMAIL_VERIFICATION" as any);
    expect(mocks.$transaction).toHaveBeenCalled();
  });

  it("invalidates previous unused tokens when creating a new one", async () => {
    await createToken("user-1", "EMAIL_VERIFICATION" as any);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", type: "EMAIL_VERIFICATION", usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
  });

  it("marks tokens as used when consuming", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "tok-1",
      token: "mock-token",
      type: "EMAIL_VERIFICATION",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      user: { id: "user-1" },
    } as any);

    await consumeToken("mock-token", "EMAIL_VERIFICATION" as any);

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "tok-1" },
      data: { usedAt: expect.any(Date) },
    });
  });
});
