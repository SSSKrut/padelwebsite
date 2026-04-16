import { defineHandler } from "./lib/apiHandler";
import { prisma } from "./lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  strategyKey: z.string().min(1, "Strategy key is required"),
  description: z.string().optional().nullable(),
  config: z.any().optional().nullable(),
});

const updateSchema = createSchema.partial().extend({
  id: z.string().uuid(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
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
  method: ["GET", "POST", "PATCH", "DELETE"],
  requireAdmin: true,
  handler: async ({ event }) => {
    if (event.httpMethod === "GET") {
      return prisma.eventFormat.findMany({
        orderBy: { name: "asc" },
      });
    }

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

      const { name, strategyKey, description, config } = parsed.data;
      const existing = await prisma.eventFormat.findFirst({
        where: { strategyKey },
        select: { id: true },
      });

      if (existing) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "strategyKey already exists" }),
        };
      }

      return prisma.eventFormat.create({
        data: {
          name,
          strategyKey,
          description: description ?? null,
          config: config ?? null,
        },
      });
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

      const { id, name, strategyKey, description, config } = parsed.data;

      if (strategyKey) {
        const existing = await prisma.eventFormat.findFirst({
          where: { strategyKey, id: { not: id } },
          select: { id: true },
        });

        if (existing) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "strategyKey already exists" }),
          };
        }
      }

      return prisma.eventFormat.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(strategyKey !== undefined && { strategyKey }),
          ...(description !== undefined && { description: description ?? null }),
          ...(config !== undefined && { config: config ?? null }),
        },
      });
    }

    if (event.httpMethod === "DELETE") {
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

      await prisma.eventFormat.delete({ where: { id: parsed.data.id } });
      return { success: true };
    }

    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  },
});
