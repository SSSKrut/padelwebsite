import { defineHandler } from "./lib/apiHandler";
import { prisma } from "./lib/prisma";
import { z } from "zod";

const overrideSchema = z.object({
  eventId: z.string().uuid(),
  courtNumber: z.number().int().min(1),
  isManual: z.boolean(),
});

const deleteSchema = z.object({
  eventId: z.string().uuid(),
  courtNumber: z.number().int().min(1),
});

const parseBody = (rawBody: string | null) => {
  if (!rawBody) return {};
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
};

export const handler = defineHandler({
  method: ["PATCH", "DELETE"],
  requireAdmin: true,
  handler: async ({ event }) => {
    const body = parseBody(event.body ?? null);
    if (body === null) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON in request body" }) };
    }

    if (event.httpMethod === "PATCH") {
      const parsed = overrideSchema.safeParse(body);
      if (!parsed.success) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "Validation Error",
            details: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          }),
        };
      }

      const { eventId, courtNumber, isManual } = parsed.data;

      const eventRecord = await prisma.event.findUnique({
        where: { id: eventId },
        select: { matchTableStatus: true },
      });

      if (!eventRecord) {
        return { statusCode: 404, body: JSON.stringify({ error: "Event not found" }) };
      }

      if (eventRecord.matchTableStatus !== "OPEN") {
        return { statusCode: 400, body: JSON.stringify({ error: "Match table is not open" }) };
      }

      if (!isManual) {
        await prisma.eventCourtOverride.deleteMany({
          where: { eventId, courtNumber },
        });

        return { success: true };
      }

      const override = await prisma.eventCourtOverride.upsert({
        where: { eventId_courtNumber: { eventId, courtNumber } },
        create: { eventId, courtNumber, isManual: true },
        update: { isManual: true },
      });

      return override;
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

    await prisma.eventCourtOverride.deleteMany({
      where: { eventId: parsed.data.eventId, courtNumber: parsed.data.courtNumber },
    });

    return { success: true };
  },
});
