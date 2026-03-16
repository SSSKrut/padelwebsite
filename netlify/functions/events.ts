import { z } from "zod";
import { prisma } from "./lib/prisma";
import { defineHandler } from "./lib/apiHandler";

export const handler = defineHandler({
  method: "GET",
  handler: async () => {
    // Return all non-draft events
    const events = await prisma.event.findMany({
      where: {
        status: { in: ["PUBLISHED", "ARCHIVED"] }
      },
      orderBy: { date: "asc" },
      include: {
        _count: {
          select: { participants: true }
        }
      }
    });

    return events;
  },
});
