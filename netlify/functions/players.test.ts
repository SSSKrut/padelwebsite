import { vi, describe, it, expect, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindMany: vi.fn(),
  publicName: vi.fn((f: string, l: string) => `${f} ${l.charAt(0)}.`),
}));

vi.mock("./lib/prisma", () => ({
  prisma: {
    user: { findMany: mocks.userFindMany },
  },
}));

vi.mock("./lib/sanitize", () => ({
  publicName: mocks.publicName,
}));

import { handler } from "./players";

describe("players", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should exclude UNVERIFIED_USER from rankings query", async () => {
    mocks.userFindMany.mockResolvedValue([]);

    await handler({} as any, {} as any);

    const args = mocks.userFindMany.mock.calls[0][0];
    expect(args).toHaveProperty("where");
  });
});
