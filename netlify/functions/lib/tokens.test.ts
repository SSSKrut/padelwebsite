import { vi, describe, it, expect, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const updateMany = vi.fn().mockResolvedValue({ count: 0 });
  const create = vi.fn().mockResolvedValue({ id: "tok-1", token: "mock-token" });
  const $transaction = vi.fn();
  return { updateMany, create, $transaction };
});

vi.mock("./prisma", () => ({
  prisma: {
    verificationToken: { updateMany: mocks.updateMany, create: mocks.create },
    $transaction: mocks.$transaction,
  },
}));

vi.mock("../../../generated/prisma", () => ({
  TokenType: { EMAIL_VERIFICATION: "EMAIL_VERIFICATION", PASSWORD_RESET: "PASSWORD_RESET" },
}));

import { createToken } from "./tokens";

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
});
