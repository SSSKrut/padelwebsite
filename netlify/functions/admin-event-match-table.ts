import { defineHandler } from "./lib/apiHandler";
import { prisma } from "./lib/prisma";
import { z } from "zod";
import {
  ELO_K_FACTOR,
  calculateEloRating,
  loadMatchTable,
  resultFromScores,
} from "./lib/matchTable";
import {
  generateCourtAssignments,
  buildMatchesForCourt,
  loadRegenerationGuard,
} from "./lib/matchTableOps";
import { normalizeMatchFormatConfig, validateMatchFormatConfig } from "./lib/matchFormat";

const generateSchema = z.object({ 
  eventId: z.string().uuid(),
  mode: z.enum(["AUTO_COURTS", "MANUAL_ELO"]).optional().default("AUTO_COURTS"),
});
const eventIdSchema = z.object({ eventId: z.string().uuid() });
const assignmentsSchema = z.object({
  eventId: z.string().uuid(),
  assignments: z.array(
    z.object({
      userId: z.string().uuid(),
      courtNumber: z.number().int().min(1),
    }),
  ),
});

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
}

interface ManualEloRow {
  userId: string;
  newElo: number;
}

export const handler = defineHandler({
  method: ["POST", "PATCH", "PUT"],
  requireAdmin: true,
  handler: async ({ event }) => {
    if (event.httpMethod === "POST") {
      const parsed = generateSchema.safeParse(event.body ? JSON.parse(event.body) : {});
      if (!parsed.success) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "Validation Error",
            details: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          }),
        };
      }

      const { eventId, mode } = parsed.data;

      const guard = await loadRegenerationGuard(eventId);
      if (!guard.ok) {
        return guard.response;
      }

      const participants = await prisma.eventRegistration.findMany({
        where: { eventId },
        select: {
          user: {
            select: { id: true, elo: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      if (!participants.length) {
        return { statusCode: 400, body: JSON.stringify({ error: "Event has no participants" }) };
      }

      const formatConfig = normalizeMatchFormatConfig(
        guard.eventRecord.formatConfig ?? guard.eventRecord.format?.config,
      );
      const validation = validateMatchFormatConfig(formatConfig);
      if (!validation.ok) {
        return { statusCode: 400, body: JSON.stringify({ error: validation.error }) };
      }

      if (mode !== "MANUAL_ELO" && !formatConfig.distribution.allowBench) {
        const remainder = participants.length % formatConfig.distribution.courtSize;
        if (remainder !== 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: "Participant count must be divisible by court size when bench is disabled",
            }),
          };
        }
      }

      const participantRows = participants.map((p) => ({ id: p.user.id, elo: p.user.elo }));
      const sortedParticipants = [...participantRows].sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0));

      let courts = generateCourtAssignments(participantRows, formatConfig);

      if (mode === "MANUAL_ELO") {
        courts = [{ courtNumber: 1, userIds: sortedParticipants.map((p) => p.id) }];
      }

      await prisma.$transaction(async (tx) => {
        if (guard.rollbackScores.length > 0 && guard.eventRecord.matchTableStatus === "CONFIRMED") {
          for (const score of guard.rollbackScores) {
            await tx.user.update({
              where: { id: score.userId },
              data: { elo: score.previousElo },
            });
          }

          await tx.eventScore.deleteMany({ where: { eventId } });
        }

        await tx.eventMatch.deleteMany({ where: { eventId } });
        await tx.eventCourtAssignment.deleteMany({ where: { eventId } });
        await tx.eventManualElo.deleteMany({ where: { eventId } });

        const assignmentRows = courts.flatMap((court) =>
          court.userIds.map((userId) => ({
            eventId,
            userId,
            courtNumber: court.courtNumber,
          })),
        );

        if (assignmentRows.length > 0) {
          await tx.eventCourtAssignment.createMany({ data: assignmentRows, skipDuplicates: true });
        }

        const matchRows = courts.flatMap((court) =>
          buildMatchesForCourt(court.courtNumber, court.userIds, formatConfig).map((match) => ({
            id: match.id,
            eventId,
            courtNumber: match.courtNumber,
            round: match.round,
            pair1Player1Id: match.pair1Player1Id,
            pair1Player2Id: match.pair1Player2Id,
            pair2Player1Id: match.pair2Player1Id,
            pair2Player2Id: match.pair2Player2Id,
          })),
        );

        if (matchRows.length > 0) {
          await tx.eventMatch.createMany({ data: matchRows });
        }

        await tx.event.update({
          where: { id: eventId },
          data: {
            matchTableStatus: "OPEN",
            matchTableGeneratedAt: new Date(),
            matchTableConfirmedAt: null,
            matchTableMode: mode,
          },
        });
      });

      const table = await loadMatchTable(eventId);
      return table ?? { eventId, status: "OPEN", courts: [], matches: [] };
    }

    if (event.httpMethod === "PATCH") {
      const parsed = assignmentsSchema.safeParse(event.body ? JSON.parse(event.body) : {});
      if (!parsed.success) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "Validation Error",
            details: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          }),
        };
      }

      const { eventId, assignments } = parsed.data;

      const guard = await loadRegenerationGuard(eventId);
      if (!guard.ok) {
        return guard.response;
      }

      const participants = await prisma.eventRegistration.findMany({
        where: { eventId },
        select: { userId: true },
      });

      const participantIds = new Set(participants.map((p) => p.userId));
      const assignmentIds = new Set(assignments.map((a) => a.userId));

      const missing = participants.find((p) => !assignmentIds.has(p.userId));
      if (missing) {
        return { statusCode: 400, body: JSON.stringify({ error: "Assignments missing participants" }) };
      }

      const invalid = assignments.find((a) => !participantIds.has(a.userId));
      if (invalid) {
        return { statusCode: 400, body: JSON.stringify({ error: "Assignments contain unknown users" }) };
      }

      const formatConfig = normalizeMatchFormatConfig(
        guard.eventRecord.formatConfig ?? guard.eventRecord.format?.config,
      );
      const validation = validateMatchFormatConfig(formatConfig);
      if (!validation.ok) {
        return { statusCode: 400, body: JSON.stringify({ error: validation.error }) };
      }

      if (!formatConfig.distribution.allowBench) {
        const invalidCourt = assignments.find(
          (assignment) =>
            assignments.filter((a) => a.courtNumber === assignment.courtNumber).length !==
            formatConfig.distribution.courtSize,
        );
        if (invalidCourt) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: "Court size must match format when bench is disabled",
            }),
          };
        }
      }

      const courtsMap = new Map<number, string[]>();
      assignments.forEach((assignment) => {
        const group = courtsMap.get(assignment.courtNumber) ?? [];
        group.push(assignment.userId);
        courtsMap.set(assignment.courtNumber, group);
      });

      await prisma.$transaction(async (tx) => {
        if (guard.rollbackScores.length > 0 && guard.eventRecord.matchTableStatus === "CONFIRMED") {
          for (const score of guard.rollbackScores) {
            await tx.user.update({
              where: { id: score.userId },
              data: { elo: score.previousElo },
            });
          }

          await tx.eventScore.deleteMany({ where: { eventId } });
        }

        await tx.eventMatch.deleteMany({ where: { eventId } });
        await tx.eventCourtAssignment.deleteMany({ where: { eventId } });
        await tx.eventManualElo.deleteMany({ where: { eventId } });

        const assignmentRows = Array.from(courtsMap.entries()).flatMap(([courtNumber, userIds]) =>
          userIds.map((userId) => ({
            eventId,
            userId,
            courtNumber,
          })),
        );

        if (assignmentRows.length > 0) {
          await tx.eventCourtAssignment.createMany({ data: assignmentRows, skipDuplicates: true });
        }

        const matchRows = Array.from(courtsMap.entries()).flatMap(([courtNumber, userIds]) =>
          buildMatchesForCourt(courtNumber, userIds, formatConfig).map((match) => ({
            id: match.id,
            eventId,
            courtNumber: match.courtNumber,
            round: match.round,
            pair1Player1Id: match.pair1Player1Id,
            pair1Player2Id: match.pair1Player2Id,
            pair2Player1Id: match.pair2Player1Id,
            pair2Player2Id: match.pair2Player2Id,
          })),
        );

        if (matchRows.length > 0) {
          await tx.eventMatch.createMany({ data: matchRows });
        }

        await tx.event.update({
          where: { id: eventId },
          data: {
            matchTableStatus: "OPEN",
            matchTableGeneratedAt: new Date(),
            matchTableConfirmedAt: null,
          },
        });
      });

      const table = await loadMatchTable(eventId);
      return table ?? { eventId, status: "OPEN", courts: [], matches: [] };
    }

    const parsed = eventIdSchema.safeParse(event.body ? JSON.parse(event.body) : {});
    if (!parsed.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Validation Error",
          details: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        }),
      };
    }

    const { eventId } = parsed.data;

    const eventRecord = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        matchTableStatus: true,
        formatConfig: true,
        format: { select: { config: true } },
      },
    });

    if (!eventRecord) {
      return { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) };
    }

    if (eventRecord.matchTableStatus !== "OPEN") {
      return { statusCode: 400, body: JSON.stringify({ error: "Match table is not open" }) };
    }

    const assignments: AssignmentRow[] = await prisma.eventCourtAssignment.findMany({
      where: { eventId },
      select: { userId: true, courtNumber: true },
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
      },
    });

    const manualOverrides = await prisma.eventCourtOverride.findMany({
      where: { eventId, isManual: true },
      select: { courtNumber: true },
    });
    const manualOverrideSet = new Set(manualOverrides.map((row) => row.courtNumber));

    const formatConfig = normalizeMatchFormatConfig(
      eventRecord.formatConfig ?? eventRecord.format?.config,
    );
    const validation = validateMatchFormatConfig(formatConfig);
    if (!validation.ok) {
      return { statusCode: 400, body: JSON.stringify({ error: validation.error }) };
    }

    const courtsMap = new Map<number, string[]>();
    assignments.forEach((assignment) => {
      const group = courtsMap.get(assignment.courtNumber) ?? [];
      group.push(assignment.userId);
      courtsMap.set(assignment.courtNumber, group);
    });

    const fullCourts = new Set<number>();
    const manualPlayerIds = new Set<string>();

    courtsMap.forEach((players, courtNumber) => {
      if (manualOverrideSet.has(courtNumber)) {
        players.forEach((id) => manualPlayerIds.add(id));
        return;
      }

      if (players.length === formatConfig.playersPerCourt) {
        fullCourts.add(courtNumber);
      } else {
        players.forEach((id) => manualPlayerIds.add(id));
      }
    });

    const relevantMatches = matches.filter((match) => fullCourts.has(match.courtNumber));
    const completedMatches = relevantMatches.filter((match) => match.status === "COMPLETED");

    const missingScore = completedMatches.find((match) => match.score1 === null || match.score2 === null);
    if (missingScore) {
      return { statusCode: 400, body: JSON.stringify({ error: "All match scores must be filled" }) };
    }

    const manualEloRows: ManualEloRow[] = await prisma.eventManualElo.findMany({
      where: { eventId },
      select: { userId: true, newElo: true },
    });

    const manualEloMap = new Map(manualEloRows.map((row) => [row.userId, row.newElo]));
    const missingManual = Array.from(manualPlayerIds).filter((id) => !manualEloMap.has(id));

    if (missingManual.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Manual ELO is required for courts with fewer than 5 players" }),
      };
    }

    const playerIds = new Set<string>();
    relevantMatches.forEach((match) => {
      playerIds.add(match.pair1Player1Id);
      playerIds.add(match.pair1Player2Id);
      playerIds.add(match.pair2Player1Id);
      playerIds.add(match.pair2Player2Id);
    });

    const players = await prisma.user.findMany({
      where: { id: { in: Array.from(playerIds) } },
      select: { id: true, elo: true },
    });

    const manualPlayers = await prisma.user.findMany({
      where: { id: { in: Array.from(manualPlayerIds) } },
      select: { id: true, elo: true },
    });

    const eloMap = new Map(players.map((player) => [player.id, player.elo]));
    const manualEloCurrentMap = new Map(manualPlayers.map((player) => [player.id, player.elo]));
    const ratingChangeSum = new Map<string, number>();

    const ratingSettings = await prisma.userRatingSettings.findMany({
      where: {
        userId: { in: Array.from(playerIds) },
        ratingSystem: "ELO",
      },
      select: { userId: true, kFactor: true },
    });

    const kFactorMap = new Map(ratingSettings.map((setting) => [setting.userId, setting.kFactor]));
    const getKFactor = (userId: string) => kFactorMap.get(userId) ?? ELO_K_FACTOR;

    completedMatches.forEach((match) => {
      const pair1Rating = ((eloMap.get(match.pair1Player1Id) ?? 0) + (eloMap.get(match.pair1Player2Id) ?? 0)) / 2;
      const pair2Rating = ((eloMap.get(match.pair2Player1Id) ?? 0) + (eloMap.get(match.pair2Player2Id) ?? 0)) / 2;
      const score = resultFromScores(match.score1 ?? 0, match.score2 ?? 0);

      const { ratingChange1, ratingChange2 } = calculateEloRating(pair1Rating, pair2Rating, score);

      [match.pair1Player1Id, match.pair1Player2Id].forEach((id) => {
        ratingChangeSum.set(id, (ratingChangeSum.get(id) ?? 0) + ratingChange1);
      });

      [match.pair2Player1Id, match.pair2Player2Id].forEach((id) => {
        ratingChangeSum.set(id, (ratingChangeSum.get(id) ?? 0) + ratingChange2);
      });
    });

    const updates: Array<{ userId: string; previousElo: number; newElo: number }> = [];

    await prisma.$transaction(async (tx) => {
      for (const [userId, ratingChange] of ratingChangeSum.entries()) {
        const previousElo = eloMap.get(userId) ?? 0;
        const delta = Math.round(ratingChange * getKFactor(userId));
        const newElo = previousElo + delta;

        await tx.eventScore.upsert({
          where: { eventId_userId: { eventId, userId } },
          update: { previousElo, newElo },
          create: { eventId, userId, previousElo, newElo },
        });

        await tx.user.update({
          where: { id: userId },
          data: { elo: newElo },
        });

        updates.push({ userId, previousElo, newElo });
      }

      for (const [userId, newElo] of manualEloMap.entries()) {
        if (!manualPlayerIds.has(userId)) continue;
        const previousElo = manualEloCurrentMap.get(userId) ?? 0;

        await tx.eventScore.upsert({
          where: { eventId_userId: { eventId, userId } },
          update: { previousElo, newElo },
          create: { eventId, userId, previousElo, newElo },
        });

        await tx.user.update({
          where: { id: userId },
          data: { elo: newElo },
        });

        updates.push({ userId, previousElo, newElo });
      }

      await tx.event.update({
        where: { id: eventId },
        data: {
          matchTableStatus: "CONFIRMED",
          matchTableConfirmedAt: new Date(),
        },
      });
    });

    return {
      eventId,
      updatedPlayers: updates,
      manualPlayers: Array.from(manualPlayerIds),
      status: "CONFIRMED",
    };
  },
});
