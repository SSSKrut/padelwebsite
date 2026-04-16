import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { MATCH_PAIRINGS } from "./matchTable";
import {
  ROUND_ROBIN_4P_PAIRINGS,
  normalizeMatchFormatConfig,
  type MatchFormatConfig,
} from "./matchFormat";

interface EventScoreRollbackRow {
  userId: string;
  previousElo: number;
}

export const generateCourtAssignments = (
  participants: Array<{ id: string; elo?: number }>,
  config?: MatchFormatConfig,
) => {
  const resolved = normalizeMatchFormatConfig(config);
  const courtSize = resolved.distribution.courtSize;
  const courts: Array<{ courtNumber: number; userIds: string[] }> = [];

  const ordered = [...participants];
  if (resolved.distribution.mode === "RANDOM") {
    for (let i = ordered.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    }
  } else {
    ordered.sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0));
  }

  if (!ordered.length) {
    return courts;
  }

  if (resolved.distribution.balance === "snake") {
    const courtCount = Math.ceil(ordered.length / courtSize);
    for (let i = 0; i < courtCount; i += 1) {
      courts.push({ courtNumber: i + 1, userIds: [] });
    }

    ordered.forEach((participant, index) => {
      const cycle = Math.floor(index / courtCount);
      const position = index % courtCount;
      const targetIndex = cycle % 2 === 0 ? position : courtCount - 1 - position;
      courts[targetIndex].userIds.push(participant.id);
    });

    return courts;
  }

  let courtNumber = 1;
  for (let i = 0; i < ordered.length; i += courtSize) {
    const group = ordered.slice(i, i + courtSize).map((p) => p.id);
    courts.push({ courtNumber, userIds: group });
    courtNumber += 1;
  }

  return courts;
};

export const buildMatchesForCourt = (
  courtNumber: number,
  userIds: string[],
  config?: MatchFormatConfig,
) => {
  const resolved = normalizeMatchFormatConfig(config);
  if (resolved.teamSize !== 2) return [];

  let pairings: Array<{ round: number; pair1: [number, number]; pair2: [number, number] }> = [];

  if (resolved.pairingStrategy === "CUSTOM") {
    pairings = (resolved.customMatches ?? []).map((match) => ({
      round: match.round,
      pair1: match.pair1,
      pair2: match.pair2,
    }));
  } else if (resolved.pairingStrategy === "ROUND_ROBIN_4P" || resolved.playersPerCourt === 4) {
    if (userIds.length !== 4) return [];
    pairings = ROUND_ROBIN_4P_PAIRINGS;
  } else {
    if (userIds.length !== 5) return [];
    pairings = MATCH_PAIRINGS;
  }

  return pairings
    .filter((pairing) =>
      pairing.pair1.concat(pairing.pair2).every((index) => index >= 0 && index < userIds.length),
    )
    .map((pairing) => {
      const pair1Player1Id = userIds[pairing.pair1[0]];
      const pair1Player2Id = userIds[pairing.pair1[1]];
      const pair2Player1Id = userIds[pairing.pair2[0]];
      const pair2Player2Id = userIds[pairing.pair2[1]];

      return {
        id: randomUUID(),
        eventId: "",
        courtNumber,
        round: pairing.round,
        pair1Player1Id,
        pair1Player2Id,
        pair2Player1Id,
        pair2Player2Id,
      };
    });
};

export const loadRegenerationGuard = async (eventId: string) => {
  const eventRecord = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      matchTableStatus: true,
      matchTableConfirmedAt: true,
      formatConfig: true,
      format: { select: { config: true } },
    },
  });

  if (!eventRecord) {
    return {
      ok: false as const,
      response: { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) },
    };
  }

  if (eventRecord.matchTableStatus !== "CONFIRMED") {
    return { ok: true as const, eventRecord, rollbackScores: [] as EventScoreRollbackRow[] };
  }

  if (!eventRecord.matchTableConfirmedAt) {
    return {
      ok: false as const,
      response: {
        statusCode: 400,
        body: JSON.stringify({ error: "Match table confirmation timestamp missing" }),
      },
    };
  }

  const rollbackScores = await prisma.eventScore.findMany({
    where: { eventId },
    select: { userId: true, previousElo: true },
  });

  if (!rollbackScores.length) {
    return { ok: true as const, eventRecord, rollbackScores };
  }

  const laterScore = await prisma.eventScore.findFirst({
    where: {
      userId: { in: rollbackScores.map((score) => score.userId) },
      eventId: { not: eventId },
      createdAt: { gt: eventRecord.matchTableConfirmedAt },
    },
    select: { id: true },
  });

  if (laterScore) {
    return {
      ok: false as const,
      response: {
        statusCode: 400,
        body: JSON.stringify({
          error: "Cannot regenerate match table after later events have updated ELO",
        }),
      },
    };
  }

  return { ok: true as const, eventRecord, rollbackScores };
};
