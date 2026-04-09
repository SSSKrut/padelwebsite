import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { MATCH_PAIRINGS } from "./matchTable";

interface EventScoreRollbackRow {
  userId: string;
  previousElo: number;
}

export const generateCourtAssignments = (participants: Array<{ id: string }>) => {
  const courts: Array<{ courtNumber: number; userIds: string[] }> = [];
  let courtNumber = 1;
  for (let i = 0; i < participants.length; i += 5) {
    const group = participants.slice(i, i + 5).map((p) => p.id);
    courts.push({ courtNumber, userIds: group });
    courtNumber += 1;
  }
  return courts;
};

export const buildMatchesForCourt = (courtNumber: number, userIds: string[]) => {
  if (userIds.length !== 5) return [];
  return MATCH_PAIRINGS.map((pairing) => {
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
    select: { id: true, matchTableStatus: true, matchTableConfirmedAt: true },
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
