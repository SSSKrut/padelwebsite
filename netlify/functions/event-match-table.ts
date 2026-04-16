import { defineHandler } from "./lib/apiHandler";
import { prisma } from "./lib/prisma";
import { loadMatchTable } from "./lib/matchTable";
import { z } from "zod";

const updateScoreSchema = z
  .object({
    eventId: z.string().uuid(),
    matchId: z.string().uuid(),
    score1: z.number().int().min(0).optional(),
    score2: z.number().int().min(0).optional(),
    status: z
      .enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "ABANDONED", "WALKOVER", "NO_CONTEST"])
      .optional(),
  })
  .refine((data) => data.score1 !== undefined || data.score2 !== undefined || data.status !== undefined, {
    message: "Provide scores or status",
  })
  .refine(
    (data) =>
      (data.score1 === undefined && data.score2 === undefined) ||
      (data.score1 !== undefined && data.score2 !== undefined),
    {
      message: "Both scores are required when updating scores",
    },
  );

export const handler = defineHandler({
  method: ["GET", "PATCH"],
  requireAuth: true,
  handler: async ({ event, user }) => {
    if (!user) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

    const ensureAccess = async (eventId: string) => {
      if (isAdmin) return true;
      const registration = await prisma.eventRegistration.findUnique({
        where: { eventId_userId: { eventId, userId: user.id } },
        select: { id: true },
      });
      return !!registration;
    };

    if (event.httpMethod === "GET") {
      const eventId = event.queryStringParameters?.eventId ?? "";

      if (!eventId) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing eventId" }) };
      }

      const hasAccess = await ensureAccess(eventId);
      if (!hasAccess) {
        return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
      }

      const table = await loadMatchTable(eventId);
      if (!table) {
        return { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) };
      }

      return table;
    }

    const parsedBody = updateScoreSchema.safeParse(event.body ? JSON.parse(event.body) : {});
    if (!parsedBody.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Validation Error",
          details: parsedBody.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        }),
      };
    }

    const { eventId, matchId, score1, score2, status } = parsedBody.data;

    const hasAccess = await ensureAccess(eventId);
    if (!hasAccess) {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
    }

    const eventRecord = await prisma.event.findUnique({
      where: { id: eventId },
      select: { matchTableStatus: true },
    });

    if (!eventRecord) {
      return { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) };
    }

    if (eventRecord.matchTableStatus !== "OPEN") {
      return { statusCode: 400, body: JSON.stringify({ error: "Match table is not open for edits" }) };
    }

    const matchRecord = await prisma.eventMatch.findUnique({
      where: { id: matchId },
      select: {
        eventId: true,
        pair1Player1Id: true,
        pair1Player2Id: true,
        pair2Player1Id: true,
        pair2Player2Id: true,
        score1: true,
        score2: true,
      },
    });

    if (!matchRecord || matchRecord.eventId !== eventId) {
      return { statusCode: 404, body: JSON.stringify({ error: "Match not found" }) };
    }

    if (!isAdmin) {
      const allowedPlayer = [
        matchRecord.pair1Player1Id,
        matchRecord.pair1Player2Id,
        matchRecord.pair2Player1Id,
        matchRecord.pair2Player2Id,
      ].includes(user.id);

      if (!allowedPlayer) {
        return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
      }

      if (status && !["IN_PROGRESS", "COMPLETED", "ABANDONED"].includes(status)) {
        return { statusCode: 403, body: JSON.stringify({ error: "Status update not allowed" }) };
      }
    }

    const nextStatus = status ?? (score1 !== undefined ? "COMPLETED" : undefined);
    if (nextStatus === "COMPLETED") {
      const nextScore1 = score1 ?? matchRecord.score1;
      const nextScore2 = score2 ?? matchRecord.score2;
      if (nextScore1 === null || nextScore2 === null || nextScore1 === undefined || nextScore2 === undefined) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Scores are required to mark match as completed" }),
        };
      }
    }

    const updated = await prisma.eventMatch.updateMany({
      where: { id: matchId, eventId },
      data: {
        ...(score1 !== undefined && { score1 }),
        ...(score2 !== undefined && { score2 }),
        ...(nextStatus && { status: nextStatus }),
        updatedById: user.id,
      },
    });

    if (updated.count === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: "Match not found" }) };
    }

    return { success: true };
  },
});
