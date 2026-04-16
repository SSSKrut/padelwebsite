import type { Handler } from "@netlify/functions";
import { prisma } from "./lib/prisma";
import { verifyAdmin } from "./lib/auth";

export const handler: Handler = async (event) => {
  // Try to verify admin
  try {
    await verifyAdmin(event);
  } catch (err: any) {
    return { statusCode: err.message === "Forbidden" ? 403 : 401, body: JSON.stringify({ error: err.message }) };
  }

  try {
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const {
        title,
        description,
        date,
        endDate,
        location,
        status,
        publishAt,
        maxParticipants,
        price,
        disclaimer,
        formatId,
        formatConfig,
      } = body;

      if (!title || !date) {
        return { statusCode: 400, body: JSON.stringify({ error: "Title and Date are required" }) };
      }

      if (maxParticipants !== undefined) {
        const parsed = parseInt(maxParticipants);
        if (isNaN(parsed) || parsed < 1) {
          return { statusCode: 400, body: JSON.stringify({ error: "maxParticipants must be a positive number" }) };
        }
      }

      if (status === "SCHEDULED" && !publishAt) {
        return { statusCode: 400, body: JSON.stringify({ error: "publishAt is required for SCHEDULED status" }) };
      }

      let resolvedFormatId: string | null | undefined = undefined;
      let resolvedFormatConfig: any = formatConfig;

      if (formatId !== undefined) {
        resolvedFormatId = formatId || null;
        if (resolvedFormatId) {
          const format = await prisma.eventFormat.findUnique({
            where: { id: resolvedFormatId },
            select: { config: true },
          });

          if (!format) {
            return { statusCode: 400, body: JSON.stringify({ error: "Invalid formatId" }) };
          }

          if (resolvedFormatConfig === undefined) {
            resolvedFormatConfig = format.config ?? null;
          }
        } else if (resolvedFormatConfig === undefined) {
          resolvedFormatConfig = null;
        }
      }

      const eventItem = await prisma.event.create({
        data: {
          title,
          description,
          date: new Date(date),
          endDate: endDate ? new Date(endDate) : null,
          location,
          status: status || "DRAFT",
          publishAt: status === "SCHEDULED" && publishAt ? new Date(publishAt) : null,
          maxParticipants: maxParticipants ? parseInt(maxParticipants) : 16,
          price: price || null,
          disclaimer: disclaimer || null,
          ...(resolvedFormatId !== undefined && { formatId: resolvedFormatId }),
          ...(resolvedFormatConfig !== undefined && { formatConfig: resolvedFormatConfig }),
        },
      });

      return { statusCode: 201, body: JSON.stringify(eventItem) };
    }

    if (event.httpMethod === "GET") {
      const events = await prisma.event.findMany({
        orderBy: { date: "desc" },
      });
      return { statusCode: 200, body: JSON.stringify(events) };
    }

    if (event.httpMethod === "PATCH") {
      const body = JSON.parse(event.body || "{}");
      const {
        id,
        title,
        description,
        date,
        endDate,
        location,
        status,
        publishAt,
        maxParticipants,
        price,
        disclaimer,
        formatId,
        formatConfig,
      } = body;
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: "Event ID required" }) };

      if (maxParticipants !== undefined) {
        const parsed = parseInt(maxParticipants);
        if (isNaN(parsed) || parsed < 1) {
          return { statusCode: 400, body: JSON.stringify({ error: "maxParticipants must be a positive number" }) };
        }
      }

      if (status === "SCHEDULED" && publishAt === undefined) {
        // If switching to SCHEDULED, check existing event for publishAt
        const existing = await prisma.event.findUnique({ where: { id } });
        if (!existing?.publishAt && !publishAt) {
          return { statusCode: 400, body: JSON.stringify({ error: "publishAt is required for SCHEDULED status" }) };
        }
      }

      let resolvedFormatId: string | null | undefined = undefined;
      let resolvedFormatConfig: any = undefined;

      if (formatId !== undefined) {
        resolvedFormatId = formatId || null;
        if (resolvedFormatId) {
          const format = await prisma.eventFormat.findUnique({
            where: { id: resolvedFormatId },
            select: { config: true },
          });

          if (!format) {
            return { statusCode: 400, body: JSON.stringify({ error: "Invalid formatId" }) };
          }

          if (formatConfig === undefined) {
            resolvedFormatConfig = format.config ?? null;
          }
        } else if (formatConfig === undefined) {
          resolvedFormatConfig = null;
        }
      }

      if (formatConfig !== undefined) {
        resolvedFormatConfig = formatConfig;
      }

      const updatedEvent = await prisma.event.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(date !== undefined && { date: new Date(date) }),
          ...(date !== undefined && { reminderSentAt: null }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
          ...(location !== undefined && { location }),
          ...(status !== undefined && { status }),
          ...(publishAt !== undefined && { publishAt: publishAt ? new Date(publishAt) : null }),
          // Clear publishAt when moving away from SCHEDULED
          ...(status !== undefined && status !== "SCHEDULED" && { publishAt: null }),
          ...(maxParticipants !== undefined && { maxParticipants: parseInt(maxParticipants) }),
          ...(price !== undefined && { price: price || null }),
          ...(disclaimer !== undefined && { disclaimer: disclaimer || null }),
          ...(resolvedFormatId !== undefined && { formatId: resolvedFormatId }),
          ...(resolvedFormatConfig !== undefined && { formatConfig: resolvedFormatConfig }),
        }
      });
      return { statusCode: 200, body: JSON.stringify(updatedEvent) };
    }

    if (event.httpMethod === "DELETE") {
      const body = JSON.parse(event.body || "{}");
      if (!body.id) return { statusCode: 400, body: JSON.stringify({ error: "Event ID required" }) };
      await prisma.event.delete({ where: { id: body.id } });
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, body: "Method not allowed" };
  } catch (error) {
    console.error("Admin Events Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
