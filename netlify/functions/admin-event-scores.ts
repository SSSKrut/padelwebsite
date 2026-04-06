import { defineHandler } from "./lib/apiHandler";
import { prisma } from "./lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

const scorePayloadSchema = z.object({
  eventId: z.string().uuid(),
  scores: z.array(
    z.object({
      userId: z.string().uuid(),
      newElo: z.number().int().min(0),
    }),
  ),
});

const scoreQuerySchema = z.object({
  eventId: z.string().uuid(),
});

export const handler = defineHandler({
  method: ["GET", "POST"],
  requireAdmin: true,
  bodySchema: scorePayloadSchema,
  handler: async ({ event, body }) => {
    if (event.httpMethod === "GET") {
      const queryParse = scoreQuerySchema.safeParse({
        eventId: event.queryStringParameters?.eventId,
      });

      if (!queryParse.success) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing or invalid eventId" }),
        };
      }

      const eventId = queryParse.data.eventId;

      const scores = await prisma.$queryRaw<
        Array<{ userId: string; previousElo: number; newElo: number; createdAt: Date; updatedAt: Date }>
      >`
        SELECT "userId", "previousElo", "newElo", "createdAt", "updatedAt"
        FROM "EventScore"
        WHERE "eventId" = ${eventId}
        ORDER BY "createdAt" ASC, "userId" ASC
      `;

      return {
        eventId,
        scores: scores.map((score) => ({
          ...score,
          createdAt: score.createdAt instanceof Date ? score.createdAt.toISOString() : score.createdAt,
          updatedAt: score.updatedAt instanceof Date ? score.updatedAt.toISOString() : score.updatedAt,
        })),
      };
    }

    const { eventId, scores } = body;

    if (!scores.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Scores list is empty" }),
      };
    }

    const eventRecord = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!eventRecord) {
      return { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) };
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedEntries: Array<{ userId: string; previousElo: number; newElo: number }> = [];

      for (const entry of scores) {
        const user = await tx.user.findUnique({
          where: { id: entry.userId },
          select: { elo: true },
        });

        if (!user) {
          const error = new Error("User not found");
          (error as Error & { statusCode?: number }).statusCode = 404;
          throw error;
        }

        const previousElo = user.elo;
        const newElo = entry.newElo;

        await tx.$executeRaw`
          INSERT INTO "EventScore" ("id", "eventId", "userId", "previousElo", "newElo", "createdAt", "updatedAt")
          VALUES (${randomUUID()}, ${eventId}, ${entry.userId}, ${previousElo}, ${newElo}, NOW(), NOW())
          ON CONFLICT ("eventId", "userId") DO UPDATE SET
            "previousElo" = EXCLUDED."previousElo",
            "newElo" = EXCLUDED."newElo",
            "updatedAt" = NOW()
        `;

        await tx.user.update({
          where: { id: entry.userId },
          data: { elo: newElo },
        });

        updatedEntries.push({ userId: entry.userId, previousElo, newElo });
      }

      return {
        updated: updatedEntries.length,
        entries: updatedEntries,
      };
    });

    return {
      message: `Updated ${result.updated} participant score(s).`,
      ...result,
    };
  },
});
