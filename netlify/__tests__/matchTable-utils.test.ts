import { describe, it, expect, vi } from "vitest";
import { calculateEloRating, resultFromScores, loadMatchTable } from "../functions/lib/matchTable";
import { prisma } from "../functions/lib/prisma";

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    event: { findUnique: vi.fn() },
    eventCourtAssignment: { findMany: vi.fn() },
    eventMatch: { findMany: vi.fn() },
    eventManualElo: { findMany: vi.fn() },
    eventCourtOverride: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    eventScore: { findMany: vi.fn() },
  },
}));

describe("matchTable utils", () => {
  it("derives result from scores", () => {
    expect(resultFromScores(6, 4)).toBe(1);
    expect(resultFromScores(4, 6)).toBe(0);
    expect(resultFromScores(6, 6)).toBe(0.5);
  });

  it("calculates Elo rating deltas with equal ratings", () => {
    const { ratingChange1, ratingChange2 } = calculateEloRating(1000, 1000, 1);
    expect(ratingChange1).toBe(0.5);
    expect(ratingChange2).toBe(-0.5);
  });

  it("loads match table and attaches previous/new elo correctly from EventScore", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      matchTableStatus: "CONFIRMED",
      matchTableMode: "AUTO_COURTS",
      matchTableGeneratedAt: null,
      matchTableConfirmedAt: new Date(),
    } as any);

    vi.mocked(prisma.eventCourtAssignment.findMany).mockResolvedValue([
      { userId: "u1", courtNumber: 1 },
    ] as any);

    vi.mocked(prisma.eventMatch.findMany).mockResolvedValue([] as any);

    vi.mocked(prisma.eventManualElo.findMany).mockResolvedValue([
      { userId: "u1", newElo: 1200, isWinner: false },
    ] as any);

    vi.mocked(prisma.eventCourtOverride.findMany).mockResolvedValue([] as any);

    vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: "u1", firstName: "Test", lastName: "One", elo: 1200 }] as any);
    
    vi.mocked(prisma.eventScore.findMany).mockResolvedValue([{ userId: "u1", previousElo: 1000, newElo: 1200 }] as any);

    const matchTable = await loadMatchTable("event-1");

    expect(matchTable).toBeDefined();
    expect(matchTable!.courts.length).toBe(1);
    const p1 = matchTable!.courts[0].players[0];
    expect(p1.id).toBe("u1");
    // Should inject previousElo
    expect(p1.previousElo).toBe(1000);
    // Should inject newElo
    expect(p1.newElo).toBe(1200);
    // Should fallback primary elo to previousElo to show correctly in UI
    expect(p1.elo).toBe(1000);
    // Should preserve manual elo
    expect(p1.manualElo).toBe(1200);
  });

  it("loads match table and without EventScore fallback is User.elo", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      matchTableStatus: "OPEN",
      matchTableMode: "AUTO_COURTS",
      matchTableGeneratedAt: new Date(),
      matchTableConfirmedAt: null,
    } as any);

    vi.mocked(prisma.eventCourtAssignment.findMany).mockResolvedValue([
      { userId: "u1", courtNumber: 1 },
    ] as any);

    vi.mocked(prisma.eventMatch.findMany).mockResolvedValue([] as any);

    vi.mocked(prisma.eventManualElo.findMany).mockResolvedValue([
      { userId: "u1", newElo: 1500, isWinner: false },
    ] as any);

    vi.mocked(prisma.eventCourtOverride.findMany).mockResolvedValue([] as any);

    vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: "u1", firstName: "Test", lastName: "Two", elo: 1000 }] as any);
    
    vi.mocked(prisma.eventScore.findMany).mockResolvedValue([] as any);

    const matchTable = await loadMatchTable("event-2");

    expect(matchTable).toBeDefined();
    const p1 = matchTable!.courts[0].players[0];
    expect(p1.previousElo).toBeUndefined();
    expect(p1.newElo).toBeUndefined();
    expect(p1.elo).toBe(1000);
    expect(p1.manualElo).toBe(1500);
  });

  it("loads match table when EventCourtOverride table is missing", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      matchTableStatus: "OPEN",
      matchTableMode: "AUTO_COURTS",
      matchTableGeneratedAt: new Date(),
      matchTableConfirmedAt: null,
    } as any);

    vi.mocked(prisma.eventCourtAssignment.findMany).mockResolvedValue([
      { userId: "u1", courtNumber: 1 },
    ] as any);

    vi.mocked(prisma.eventMatch.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.eventManualElo.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.eventCourtOverride.findMany).mockRejectedValue({ code: "P2021" } as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "u1", firstName: "Test", lastName: "User", elo: 1000 },
    ] as any);
    vi.mocked(prisma.eventScore.findMany).mockResolvedValue([] as any);

    const matchTable = await loadMatchTable("event-missing-override");

    expect(matchTable).toBeDefined();
    expect(matchTable!.courts[0].manualOverride).toBe(false);
  });

  it("marks courts as manual when a manual override exists", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      matchTableStatus: "OPEN",
      matchTableMode: "AUTO_COURTS",
      matchTableGeneratedAt: new Date(),
      matchTableConfirmedAt: null,
    } as any);

    vi.mocked(prisma.eventCourtAssignment.findMany).mockResolvedValue([
      { userId: "u1", courtNumber: 1 },
      { userId: "u2", courtNumber: 1 },
      { userId: "u3", courtNumber: 1 },
      { userId: "u4", courtNumber: 1 },
      { userId: "u5", courtNumber: 1 },
    ] as any);

    vi.mocked(prisma.eventMatch.findMany).mockResolvedValue([] as any);

    vi.mocked(prisma.eventManualElo.findMany).mockResolvedValue([] as any);

    vi.mocked(prisma.eventCourtOverride.findMany).mockResolvedValue([{ courtNumber: 1 }] as any);

    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "u1", firstName: "A", lastName: "One", elo: 1100 },
      { id: "u2", firstName: "B", lastName: "Two", elo: 1090 },
      { id: "u3", firstName: "C", lastName: "Three", elo: 1080 },
      { id: "u4", firstName: "D", lastName: "Four", elo: 1070 },
      { id: "u5", firstName: "E", lastName: "Five", elo: 1060 },
    ] as any);

    vi.mocked(prisma.eventScore.findMany).mockResolvedValue([] as any);

    const matchTable = await loadMatchTable("event-3");

    expect(matchTable).toBeDefined();
    const court = matchTable!.courts[0];
    expect(court.manualOverride).toBe(true);
    expect(court.isManual).toBe(true);
  });
});
