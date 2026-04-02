import type { Handler } from "@netlify/functions";
import { prisma } from "./lib/prisma";
import { defineHandler } from "./lib/apiHandler";

type UserRow = {
  userId: string;
  userName: string;
  userSurname: string;
  mail: string;
  isPremiumUser: boolean;
  elo: number;
};

function escapeCsv(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function sanitizeFilePart(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "event";
}

function buildCsv(rows: UserRow[]): string {
  const header = "user id,usr name,user surname,mail,is a premium user,elo";
  const lines = rows.map((row) =>
    [
      escapeCsv(row.userId),
      escapeCsv(row.userName),
      escapeCsv(row.userSurname),
      escapeCsv(row.mail),
      escapeCsv(row.isPremiumUser ? "true" : "false"),
      escapeCsv(String(row.elo)),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

export const handler: Handler = defineHandler({
  method: "GET",
  requireAdmin: true,
  handler: async ({ event }) => {
    const eventId = event.queryStringParameters?.eventId;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (eventId) {
      const eventWithUsers = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          title: true,
          participants: {
            orderBy: { createdAt: "asc" },
            select: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  elo: true,
                  premiumSubscriptions: {
                    where: { revokedAt: null },
                    take: 1,
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!eventWithUsers) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Event not found" }),
        };
      }

      const rows: UserRow[] = eventWithUsers.participants.map((registration) => ({
        userId: registration.user.id,
        userName: registration.user.firstName,
        userSurname: registration.user.lastName,
        mail: registration.user.email,
        isPremiumUser: registration.user.premiumSubscriptions.length > 0,
        elo: registration.user.elo,
      }));

      const csv = buildCsv(rows);
      const eventName = sanitizeFilePart(eventWithUsers.title);
      const eventUuidPart = eventWithUsers.id.split("-")[0] ?? eventWithUsers.id.slice(0, 8);
      const fileName = `${eventName}_${eventUuidPart}.csv`;

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=${fileName}`,
          "Cache-Control": "no-store",
        },
        body: csv,
      };
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        elo: true,
        premiumSubscriptions: {
          where: { revokedAt: null },
          take: 1,
          select: { id: true },
        },
      },
    });

    const rows: UserRow[] = users.map((item) => ({
      userId: item.id,
      userName: item.firstName,
      userSurname: item.lastName,
      mail: item.email,
      isPremiumUser: item.premiumSubscriptions.length > 0,
      elo: item.elo,
    }));

    const csv = buildCsv(rows);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=users_dump_${timestamp}.csv`,
        "Cache-Control": "no-store",
      },
      body: csv,
    };
  },
});
