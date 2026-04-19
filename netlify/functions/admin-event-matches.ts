import { defineHandler } from "./lib/apiHandler";
import { prisma } from "./lib/prisma";
import { z } from "zod";

const matchStatusSchema = z.enum([
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "ABANDONED",
  "WALKOVER",
  "NO_CONTEST",
]);

const createSchema = z.object({
  eventId: z.string().uuid(),
  courtNumber: z.number().int().min(1),
  round: z.number().int().min(1),
  pair1Player1Id: z.string().uuid(),
  pair1Player2Id: z.string().uuid(),
  pair2Player1Id: z.string().uuid(),
  pair2Player2Id: z.string().uuid(),
  status: matchStatusSchema.optional(),
});

const updateSchema = createSchema
  .partial()
  .extend({ eventId: z.string().uuid(), matchId: z.string().uuid() });

const deleteSchema = z.object({
  eventId: z.string().uuid(),
  matchId: z.string().uuid(),
});

const parseBody = (rawBody: string | null) => {
  if (!rawBody) return {};
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
};

type MatchPlayerPayload = {
  pair1Player1Id?: string;
  pair1Player2Id?: string;
  pair2Player1Id?: string;
  pair2Player2Id?: string;
};

const collectPlayerIds = (payload: MatchPlayerPayload) =>
  [
    payload.pair1Player1Id,
    payload.pair1Player2Id,
    payload.pair2Player1Id,
    payload.pair2Player2Id,
  ].filter(Boolean) as string[];

export const handler = defineHandler({
  method: ["POST", "PATCH", "DELETE"],
  requireAdmin: true,
  handler: async ({ event, user }) => {
    const body = parseBody(event.body ?? null);
    if (body === null) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON in request body" }) };
    }

    if (event.httpMethod === "POST") {
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "Validation Error",
            details: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          }),
        };
      }

      const payload = parsed.data;

      const eventRecord = await prisma.event.findUnique({
        where: { id: payload.eventId },
        select: { matchTableStatus: true },
      });

      if (!eventRecord) {
        return { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) };
      }

      if (eventRecord.matchTableStatus !== "OPEN") {
        return { statusCode: 400, body: JSON.stringify({ error: "Match table is not open" }) };
      }

      // Custom matches are allowed for any open match table; validation happens per match inputs.

      const playerIds = collectPlayerIds(payload);
      const uniquePlayers = new Set(playerIds);
      if (uniquePlayers.size !== playerIds.length) {
        return { statusCode: 400, body: JSON.stringify({ error: "Duplicate players in match" }) };
      }

      const participants = await prisma.eventRegistration.findMany({
        where: { eventId: payload.eventId },
        select: { userId: true },
      });
      const participantIds = new Set(participants.map((p) => p.userId));
      const invalid = playerIds.find((id) => !participantIds.has(id));
      if (invalid) {
        return { statusCode: 400, body: JSON.stringify({ error: "Players must be registered for the event" }) };
      }

      const created = await prisma.eventMatch.create({
        data: {
          eventId: payload.eventId,
          courtNumber: payload.courtNumber,
          round: payload.round,
          pair1Player1Id: payload.pair1Player1Id,
          pair1Player2Id: payload.pair1Player2Id,
          pair2Player1Id: payload.pair2Player1Id,
          pair2Player2Id: payload.pair2Player2Id,
          status: payload.status ?? "SCHEDULED",
          updatedById: user?.id ?? null,
        },
      });

      return created;
    }

    if (event.httpMethod === "PATCH") {
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "Validation Error",
            details: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          }),
        };
      }

      const payload = parsed.data;

      const eventRecord = await prisma.event.findUnique({
        where: { id: payload.eventId },
        select: { matchTableStatus: true },
      });

      if (!eventRecord) {
        return { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) };
      }

      if (eventRecord.matchTableStatus !== "OPEN") {
        return { statusCode: 400, body: JSON.stringify({ error: "Match table is not open" }) };
      }

      // Custom matches are allowed for any open match table; validation happens per match inputs.

      const playerIds = collectPlayerIds(payload);
      if (playerIds.length) {
        const uniquePlayers = new Set(playerIds);
        if (uniquePlayers.size !== playerIds.length) {
          return { statusCode: 400, body: JSON.stringify({ error: "Duplicate players in match" }) };
        }

        const participants = await prisma.eventRegistration.findMany({
          where: { eventId: payload.eventId },
          select: { userId: true },
        });
        const participantIds = new Set(participants.map((p) => p.userId));
        const invalid = playerIds.find((id) => !participantIds.has(id));
        if (invalid) {
          return { statusCode: 400, body: JSON.stringify({ error: "Players must be registered for the event" }) };
        }
      }

      const updateData: Record<string, unknown> = {
        ...(payload.courtNumber !== undefined && { courtNumber: payload.courtNumber }),
        ...(payload.round !== undefined && { round: payload.round }),
        ...(payload.pair1Player1Id !== undefined && { pair1Player1Id: payload.pair1Player1Id }),
        ...(payload.pair1Player2Id !== undefined && { pair1Player2Id: payload.pair1Player2Id }),
        ...(payload.pair2Player1Id !== undefined && { pair2Player1Id: payload.pair2Player1Id }),
        ...(payload.pair2Player2Id !== undefined && { pair2Player2Id: payload.pair2Player2Id }),
        ...(payload.status !== undefined && { status: payload.status }),
        updatedById: user?.id ?? null,
      };

      if (
        payload.pair1Player1Id !== undefined ||
        payload.pair1Player2Id !== undefined ||
        payload.pair2Player1Id !== undefined ||
        payload.pair2Player2Id !== undefined ||
        payload.courtNumber !== undefined ||
        payload.round !== undefined
      ) {
        updateData.score1 = null;
        updateData.score2 = null;
      }

      const updated = await prisma.eventMatch.update({
        where: { id: payload.matchId },
        data: updateData,
      });

      return updated;
    }

    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Validation Error",
          details: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        }),
      };
    }

    const eventRecord = await prisma.event.findUnique({
      where: { id: parsed.data.eventId },
      select: { matchTableStatus: true },
    });

    if (!eventRecord) {
      return { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) };
    }

    if (eventRecord.matchTableStatus !== "OPEN") {
      return { statusCode: 400, body: JSON.stringify({ error: "Match table is not open" }) };
    }

    await prisma.eventMatch.delete({ where: { id: parsed.data.matchId } });
    return { success: true };
  },
});
