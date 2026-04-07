import { defineHandler } from "./lib/apiHandler";
import { prisma } from "./lib/prisma";
import { z } from "zod";

const manualEloSchema = z.object({
  eventId: z.string().uuid(),
  entries: z.array(
    z.object({
      userId: z.string().uuid(),
      newElo: z.number().int().min(0),
      isWinner: z.boolean().optional(),
    }),
  ),
});

export const handler = defineHandler({
  method: "POST",
  requireAdmin: true,
  handler: async ({ event }) => {
    const parsed = manualEloSchema.safeParse(event.body ? JSON.parse(event.body) : {});
    if (!parsed.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Validation Error",
          details: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        }),
      };
    }

    const { eventId, entries } = parsed.data;

    const eventRecord = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!eventRecord) {
      return { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) };
    }

    if (!entries.length) {
      return { statusCode: 400, body: JSON.stringify({ error: "Entries list is empty" }) };
    }

    const participantIds = await prisma.eventRegistration.findMany({
      where: { eventId },
      select: { userId: true },
    });

    const participantSet = new Set(participantIds.map((p) => p.userId));
    const invalidEntry = entries.find((entry) => !participantSet.has(entry.userId));

    if (invalidEntry) {
      return { statusCode: 400, body: JSON.stringify({ error: "User is not registered for this event" }) };
    }

    const users = await prisma.user.findMany({
      where: { id: { in: entries.map((entry) => entry.userId) } },
      select: { id: true, elo: true },
    });

    const userEloMap = new Map(users.map((user) => [user.id, user.elo] as const));
    const missingUser = entries.find((entry) => !userEloMap.has(entry.userId));

    if (missingUser) {
      return { statusCode: 404, body: JSON.stringify({ error: "User not found" }) };
    }

    await prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const isWinner = entry.isWinner ?? false;
        const previousElo = userEloMap.get(entry.userId) ?? 0;
        await tx.eventManualElo.upsert({
          where: { eventId_userId: { eventId, userId: entry.userId } },
          update: { newElo: entry.newElo, isWinner, previousElo },
          create: { eventId, userId: entry.userId, newElo: entry.newElo, isWinner, previousElo },
        });
      }
    });

    return { success: true };
  },
});
