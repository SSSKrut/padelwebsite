import { vi, describe, it, expect, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindMany: vi.fn(),
  weeklyRatingFindFirst: vi.fn(),
  weeklyRatingFindMany: vi.fn(),
  publicName: vi.fn((f: string, l: string) => `${f} ${l.charAt(0)}.`),
}));

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    user: { findMany: mocks.userFindMany },
    userWeeklyRating: {
      findFirst: mocks.weeklyRatingFindFirst,
      findMany: mocks.weeklyRatingFindMany,
    },
  },
}));

vi.mock("../functions/lib/sanitize", () => ({
  publicName: mocks.publicName,
}));

import { handler } from "../functions/players";

describe("players", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should exclude UNVERIFIED_USER from rankings query", async () => {
    mocks.userFindMany.mockResolvedValue([]);
    mocks.weeklyRatingFindFirst.mockResolvedValue(null);
    mocks.weeklyRatingFindMany.mockResolvedValue([]);

    await handler({} as any, {} as any);

    const args = mocks.userFindMany.mock.calls[0][0];
    expect(args).toHaveProperty("where");
  });

  it("computes weekly rating and rank deltas from snapshots", async () => {
    mocks.userFindMany.mockResolvedValue([
      { id: "u1", firstName: "Alice", lastName: "Ace", elo: 1200, achievements: [], role: "USER" },
      { id: "u2", firstName: "Bob", lastName: "Bravo", elo: 1100, achievements: [], role: "USER" },
    ] as any);
    const weekStart = new Date("2026-04-14T00:00:00.000Z");
    mocks.weeklyRatingFindFirst.mockResolvedValue({ weekStart } as any);
    mocks.weeklyRatingFindMany.mockResolvedValue([
      { userId: "u1", rating: 1150, rank: 2 },
      { userId: "u2", rating: 1120, rank: 1 },
    ] as any);

    const response = await handler({} as any, {} as any);
    const body = JSON.parse(response.body ?? "[]");

    expect(body[0].ratingDelta).toBe(50);
    expect(body[0].rankDelta).toBe(1);
    expect(body[1].ratingDelta).toBe(-20);
    expect(body[1].rankDelta).toBe(-1);
  });
});
