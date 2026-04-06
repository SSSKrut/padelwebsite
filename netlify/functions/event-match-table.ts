import { defineHandler } from "./lib/apiHandler";
import { prisma } from "./lib/prisma";
import { loadMatchTable } from "./lib/matchTable";
import { z } from "zod";

const updateScoreSchema = z.object({
  eventId: z.string().uuid(),
  matchId: z.string().uuid(),
  score1: z.number().int().min(0),
  score2: z.number().int().min(0),
});

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

    const { eventId, matchId, score1, score2 } = parsedBody.data;

    const hasAccess = await ensureAccess(eventId);
    if (!hasAccess) {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
    }

    const statusRows = await prisma.$queryRaw<{ matchTableStatus: string }[]>`
      SELECT "matchTableStatus"
      FROM "Event"
      WHERE "id" = ${eventId}
      LIMIT 1
    `;

    if (!statusRows.length) {
      return { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) };
    }

    if (statusRows[0].matchTableStatus !== "OPEN") {
      return { statusCode: 400, body: JSON.stringify({ error: "Match table is not open for edits" }) };
    }

    const updated = await prisma.$executeRaw`
      UPDATE "EventMatch"
      SET "score1" = ${score1},
          "score2" = ${score2},
          "updatedById" = ${user.id},
          "updatedAt" = NOW()
      WHERE "id" = ${matchId}
        AND "eventId" = ${eventId}
    `;

    if (!updated) {
      return { statusCode: 404, body: JSON.stringify({ error: "Match not found" }) };
    }

    return { success: true };
  },
});
