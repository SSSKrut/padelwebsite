import { prisma } from "./prisma";
import { publicName } from "./sanitize";
import { normalizeMatchFormatConfig } from "./matchFormat";

export const MATCH_PAIRINGS: Array<{ round: number; pair1: [number, number]; pair2: [number, number] }> = [
  { round: 1, pair1: [1, 2], pair2: [3, 4] },
  { round: 2, pair1: [0, 3], pair2: [2, 4] },
  { round: 3, pair1: [0, 4], pair2: [1, 3] },
  { round: 4, pair1: [0, 2], pair2: [1, 4] },
  { round: 5, pair1: [0, 1], pair2: [2, 3] },
];

export const ELO_K_FACTOR = 40;

export type MatchTableStatus = "DRAFT" | "OPEN" | "CONFIRMED";

export interface MatchTablePlayer {
  previousElo?: number;
  newElo?: number;
  id: string;
  name: string;
  elo: number;
  manualElo?: number;
  isWinner?: boolean;
}

export interface MatchTableCourt {
  courtNumber: number;
  players: MatchTablePlayer[];
  isManual: boolean;
  manualOverride?: boolean;
}

export interface MatchTableMatch {
  id: string;
  courtNumber: number;
  round: number;
  pair1: [MatchTablePlayer, MatchTablePlayer];
  pair2: [MatchTablePlayer, MatchTablePlayer];
  score1: number | null;
  score2: number | null;
  status?: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "WALKOVER" | "NO_CONTEST";
  updatedAt: string | null;
  updatedBy?: MatchTablePlayer | null;
}

export interface MatchTableResponse {
  mode: "AUTO_COURTS" | "MANUAL_ELO";
  eventId: string;
  status: MatchTableStatus;
  generatedAt: string | null;
  confirmedAt: string | null;
  courts: MatchTableCourt[];
  matches: MatchTableMatch[];
}

interface EventRow {
  matchTableStatus: MatchTableStatus;
  matchTableGeneratedAt: Date | null;
  matchTableConfirmedAt: Date | null;
  matchTableMode: "AUTO_COURTS" | "MANUAL_ELO";
  formatConfig: unknown | null;
  format: { config: unknown | null } | null;
}

interface AssignmentRow {
  userId: string;
  courtNumber: number;
}

interface MatchRow {
  id: string;
  courtNumber: number;
  round: number;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "WALKOVER" | "NO_CONTEST";
  pair1Player1Id: string;
  pair1Player2Id: string;
  pair2Player1Id: string;
  pair2Player2Id: string;
  score1: number | null;
  score2: number | null;
  updatedAt: Date | null;
  updatedById: string | null;
}

interface ManualEloRow {
  userId: string;
  previousElo: number | null;
  newElo: number;
  isWinner: boolean;
}

export function calculateEloRating(rating1: number, rating2: number, score: number) {
  const expected1 = 1 / (1 + 10 ** ((rating2 - rating1) / 400));
  const expected2 = 1 / (1 + 10 ** ((rating1 - rating2) / 400));

  const ratingChange1 = score - expected1;
  const ratingChange2 = (1 - score) - expected2;

  return {
    ratingChange1: Math.round(ratingChange1 * 10) / 10,
    ratingChange2: Math.round(ratingChange2 * 10) / 10,
  };
}

export function resultFromScores(score1: number, score2: number) {
  if (score1 === score2) return 0.5;
  return score1 > score2 ? 1 : 0;
}

export async function loadMatchTable(eventId: string): Promise<MatchTableResponse | null> {
  const eventRow: EventRow | null = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      matchTableStatus: true,
      matchTableGeneratedAt: true,
      matchTableConfirmedAt: true,
      matchTableMode: true,
      formatConfig: true,
      format: { select: { config: true } },
    },
  });

  if (!eventRow) return null;

  const assignments: AssignmentRow[] = await prisma.eventCourtAssignment.findMany({
    where: { eventId },
    select: { userId: true, courtNumber: true },
    orderBy: [{ courtNumber: "asc" }, { createdAt: "asc" }],
  });

  const matches: MatchRow[] = await prisma.eventMatch.findMany({
    where: { eventId },
    select: {
      id: true,
      courtNumber: true,
      round: true,
      status: true,
      pair1Player1Id: true,
      pair1Player2Id: true,
      pair2Player1Id: true,
      pair2Player2Id: true,
      score1: true,
      score2: true,
      updatedAt: true,
      updatedById: true,
    },
    orderBy: [{ courtNumber: "asc" }, { round: "asc" }],
  });

  const manualEloRows: ManualEloRow[] = await prisma.eventManualElo.findMany({
    where: { eventId },
    select: { userId: true, previousElo: true, newElo: true, isWinner: true },
  });

  let manualOverrides: Array<{ courtNumber: number }> = [];
  try {
    manualOverrides = await prisma.eventCourtOverride.findMany({
      where: { eventId, isManual: true },
      select: { courtNumber: true },
    });
  } catch (error: any) {
    if (error?.code === "P2021") {
      console.warn("[matchTable] EventCourtOverride table missing; proceeding without manual overrides.");
    } else {
      throw error;
    }
  }
  const manualOverrideSet = new Set(manualOverrides.map((row) => row.courtNumber));

  const manualEloMap = new Map(manualEloRows.map((row) => [row.userId, row]));

  const userIds = new Set<string>();
  assignments.forEach((assignment) => userIds.add(assignment.userId));
  matches.forEach((match) => {
    userIds.add(match.pair1Player1Id);
    userIds.add(match.pair1Player2Id);
    userIds.add(match.pair2Player1Id);
    userIds.add(match.pair2Player2Id);
    if (match.updatedById) userIds.add(match.updatedById);
  });

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, firstName: true, lastName: true, elo: true },
  });

  const eventScores = await prisma.eventScore.findMany({
    where: { eventId, userId: { in: Array.from(userIds) } },
    select: { userId: true, previousElo: true, newElo: true },
  });
  
  const scoreMap = new Map(eventScores.map((s) => [s.userId, s]));

  const userMap = new Map<string, MatchTablePlayer>(
    users.map((user) => {
      const score = scoreMap.get(user.id);
      const manualData = manualEloMap.get(user.id);
      const manualPrevious = manualData?.previousElo ?? undefined;
      const baseElo = score ? score.previousElo : manualPrevious ?? user.elo;
      return [
        user.id,
        {
          id: user.id,
          name: publicName(user.firstName, user.lastName),
          elo: baseElo,
          manualElo: manualData?.newElo,
          isWinner: manualData?.isWinner,
          previousElo: score?.previousElo ?? manualPrevious,
          newElo: score?.newElo,
        },
      ];
    }),
  );

  const courtsMap = new Map<number, MatchTableCourt>();

  assignments.forEach((assignment) => {
    const player = userMap.get(assignment.userId);
    if (!player) return;
    const court = courtsMap.get(assignment.courtNumber) ?? {
      courtNumber: assignment.courtNumber,
      players: [],
      isManual: false,
    };
    court.players.push(player);
    courtsMap.set(assignment.courtNumber, court);
  });

  const formatConfig = normalizeMatchFormatConfig(eventRow.formatConfig ?? eventRow.format?.config);
  const playersPerCourt = formatConfig.playersPerCourt;

  const courts = Array.from(courtsMap.values()).sort((a, b) => a.courtNumber - b.courtNumber);
  courts.forEach((court) => {
    court.players.sort((a, b) => b.elo - a.elo);
    court.manualOverride = manualOverrideSet.has(court.courtNumber);
    court.isManual = court.manualOverride || court.players.length < playersPerCourt;
  });

  const formattedMatches: MatchTableMatch[] = matches.map((match) => {
    const pair1 = [
      userMap.get(match.pair1Player1Id),
      userMap.get(match.pair1Player2Id),
    ].filter(Boolean) as [MatchTablePlayer, MatchTablePlayer];

    const pair2 = [
      userMap.get(match.pair2Player1Id),
      userMap.get(match.pair2Player2Id),
    ].filter(Boolean) as [MatchTablePlayer, MatchTablePlayer];

    return {
      id: match.id,
      courtNumber: match.courtNumber,
      round: match.round,
      pair1,
      pair2,
      score1: match.score1,
      score2: match.score2,
      status: match.status,
      updatedAt: match.updatedAt ? match.updatedAt.toISOString() : null,
      updatedBy: match.updatedById ? userMap.get(match.updatedById) ?? null : null,
    };
  });

  return {
    eventId,
    mode: eventRow.matchTableMode,
    status: eventRow.matchTableStatus,
    generatedAt: eventRow.matchTableGeneratedAt ? eventRow.matchTableGeneratedAt.toISOString() : null,
    confirmedAt: eventRow.matchTableConfirmedAt ? eventRow.matchTableConfirmedAt.toISOString() : null,
    courts,
    matches: formattedMatches,
  };
}
