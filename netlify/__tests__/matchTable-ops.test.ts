import { describe, it, expect } from "vitest";
import { buildMatchesForCourt, generateCourtAssignments } from "../functions/lib/matchTableOps";

const makeParticipants = (count: number) =>
  Array.from({ length: count }, (_, idx) => ({
    id: `player-${idx + 1}`,
    elo: 1000 - idx * 10,
  }));

describe("matchTableOps", () => {
  it("assigns courts by ELO buckets", () => {
    const participants = makeParticipants(10);
    const courts = generateCourtAssignments(participants, {
      playersPerCourt: 5,
      distribution: { mode: "ELO_BUCKET", balance: "straight" },
    });

    expect(courts).toHaveLength(2);
    expect(courts[0].userIds).toEqual(["player-1", "player-2", "player-3", "player-4", "player-5"]);
    expect(courts[1].userIds).toEqual(["player-6", "player-7", "player-8", "player-9", "player-10"]);
  });

  it("assigns courts using snake balance", () => {
    const participants = makeParticipants(6);
    const courts = generateCourtAssignments(participants, {
      playersPerCourt: 3,
      distribution: { mode: "ELO_BUCKET", balance: "snake" },
    });

    expect(courts).toHaveLength(2);
    expect(courts[0].userIds).toEqual(["player-1", "player-4", "player-5"]);
    expect(courts[1].userIds).toEqual(["player-2", "player-3", "player-6"]);
  });

  it("builds round robin matches for 4 players", () => {
    const matches = buildMatchesForCourt(1, ["a", "b", "c", "d"], {
      playersPerCourt: 4,
    });

    expect(matches).toHaveLength(3);
    expect(matches[0]).toMatchObject({
      courtNumber: 1,
      round: 1,
      pair1Player1Id: "a",
      pair1Player2Id: "b",
      pair2Player1Id: "c",
      pair2Player2Id: "d",
    });
  });

  it("builds custom matches when pairingStrategy=CUSTOM", () => {
    const matches = buildMatchesForCourt(2, ["p1", "p2", "p3", "p4"], {
      pairingStrategy: "CUSTOM",
      customMatches: [{ round: 1, pair1: [0, 1], pair2: [2, 3] }],
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      courtNumber: 2,
      round: 1,
      pair1Player1Id: "p1",
      pair1Player2Id: "p2",
      pair2Player1Id: "p3",
      pair2Player2Id: "p4",
    });
  });
});
