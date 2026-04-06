import { defineHandler } from "./lib/apiHandler";
import { prisma } from "./lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

const manualEloSchema = z.object({
  eventId: z.string().uuid(),
  entries: z.array(
    z.object({
      userId: z.string().uuid(),
      newElo: z.number().int().min(0),
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

    await prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        await tx.$executeRaw`
          INSERT INTO "EventManualElo" ("id", "eventId", "userId", "newElo", "createdAt", "updatedAt")
          VALUES (${randomUUID()}, ${eventId}, ${entry.userId}, ${entry.newElo}, NOW(), NOW())
          ON CONFLICT ("eventId", "userId") DO UPDATE SET
            "newElo" = EXCLUDED."newElo",
            "updatedAt" = NOW()
        `;
      }
    });

    return { success: true };
  },
});
