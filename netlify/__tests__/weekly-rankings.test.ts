import { describe, it, expect, vi, beforeEach } from "vitest";
import { rebuildWeeklyRankings, getWeekStart } from "../functions/lib/weeklyRankings";
import { prisma } from "../functions/lib/prisma";

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    user: { findMany: vi.fn() },
    userWeeklyRating: { upsert: vi.fn() },
  },
}));

describe("weekly rankings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates weekly snapshots for ranked users", async () => {
    const reference = new Date("2026-04-16T10:00:00.000Z");
    const weekStart = getWeekStart(reference);

    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "u1", elo: 1200 },
      { id: "u2", elo: 1100 },
    ] as any);

    const result = await rebuildWeeklyRankings(reference);

    expect(result.weekStart.toISOString()).toBe(weekStart.toISOString());
    expect(result.updated).toBe(2);
    expect(prisma.userWeeklyRating.upsert).toHaveBeenCalledWith({
      where: { userId_weekStart: { userId: "u1", weekStart } },
      update: { rating: 1200, rank: 1 },
      create: { userId: "u1", weekStart, rating: 1200, rank: 1 },
    });
    expect(prisma.userWeeklyRating.upsert).toHaveBeenCalledWith({
      where: { userId_weekStart: { userId: "u2", weekStart } },
      update: { rating: 1100, rank: 2 },
      create: { userId: "u2", weekStart, rating: 1100, rank: 2 },
    });
  });
});
