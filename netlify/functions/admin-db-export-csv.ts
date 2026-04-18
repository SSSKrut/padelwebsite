import type { Handler } from "@netlify/functions";
import * as XLSX from "xlsx";
import { prisma } from "./lib/prisma";
import { defineHandler } from "./lib/apiHandler";
import { loadMatchTable, type MatchTableResponse } from "./lib/matchTable";
import { calculateCourtStandings } from "./lib/standings";

type UserRow = {
  userId: string;
  userName: string;
  userSurname: string;
  mail: string;
  isPremiumUser: boolean;
  elo: number;
};

type SheetData = {
  name: string;
  header: string[];
  rows: (string | number | boolean)[][];
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

function buildXlsx(sheets: SheetData[]): Buffer {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const data = [sheet.header, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function buildStandingsRows(matchTable: MatchTableResponse | null): (string | number)[][] {
  if (!matchTable) return [];
  const rows: (string | number)[][] = [];

  const matchesByCourt = new Map<number, MatchTableResponse["matches"]>();
  matchTable.matches.forEach((match) => {
    const list = matchesByCourt.get(match.courtNumber) ?? [];
    list.push(match);
    matchesByCourt.set(match.courtNumber, list);
  });

  matchTable.courts.forEach((court) => {
    if (court.isManual) return;
    const matches = matchesByCourt.get(court.courtNumber) ?? [];
    const standings = calculateCourtStandings(court.players, matches);
    standings.forEach((entry) => {
      rows.push([court.courtNumber, entry.name, entry.points, entry.diff]);
    });
  });

  return rows;
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

      const matchTable = await loadMatchTable(eventId);
      const eventScores = await prisma.eventScore.findMany({
        where: { eventId },
        orderBy: { createdAt: "asc" },
        select: { userId: true, previousElo: true, newElo: true, createdAt: true, updatedAt: true },
      });

      const participantMap = new Map(
        eventWithUsers.participants.map((registration) => [
          registration.user.id,
          {
            name: `${registration.user.firstName} ${registration.user.lastName}`.trim(),
            mail: registration.user.email,
          },
        ]),
      );

      const participantRows: (string | number | boolean)[][] = eventWithUsers.participants.map((registration) => [
        registration.user.id,
        registration.user.firstName,
        registration.user.lastName,
        registration.user.email,
        registration.user.premiumSubscriptions.length > 0,
        registration.user.elo,
      ]);

      const courtRows: (string | number)[][] = [];
      if (matchTable?.courts?.length) {
        matchTable.courts.forEach((court) => {
          court.players.forEach((player) => {
            const info = participantMap.get(player.id);
            courtRows.push([
              court.courtNumber,
              player.id,
              info?.name ?? player.name,
              info?.mail ?? "",
              player.elo,
              player.manualElo !== null && player.manualElo !== undefined ? player.manualElo : "",
            ]);
          });
        });
      }

      const matchRows: (string | number)[][] = (matchTable?.matches ?? []).map((match) => [
        match.courtNumber,
        match.round,
        match.pair1.map((player) => player.name).join(" / "),
        match.pair2.map((player) => player.name).join(" / "),
        match.score1 !== null ? match.score1 : "",
        match.score2 !== null ? match.score2 : "",
        match.updatedAt ?? "",
        match.updatedBy?.name ?? "",
      ]);

      const standingsRows = buildStandingsRows(matchTable);

      const scoreRows: (string | number)[][] = eventScores.map((score) => {
        const info = participantMap.get(score.userId);
        const createdAt = score.createdAt instanceof Date ? score.createdAt.toISOString() : String(score.createdAt ?? "");
        const updatedAt = score.updatedAt instanceof Date ? score.updatedAt.toISOString() : String(score.updatedAt ?? "");
        return [
          score.userId,
          info?.name ?? "",
          score.previousElo,
          score.newElo,
          createdAt,
          updatedAt,
        ];
      });

      const xlsxBuffer = buildXlsx([
        {
          name: "Participants",
          header: ["User ID", "First name", "Last name", "Email", "Premium", "ELO"],
          rows: participantRows,
        },
        {
          name: "Court assignments",
          header: ["Court", "User ID", "Player name", "Email", "ELO", "Manual ELO"],
          rows: courtRows,
        },
        {
          name: "Match results",
          header: ["Court", "Round", "Pair 1", "Pair 2", "Score 1", "Score 2", "Updated at", "Updated by"],
          rows: matchRows,
        },
        {
          name: "Court standings",
          header: ["Court", "Player", "Points", "Difference"],
          rows: standingsRows,
        },
        {
          name: "Event scores",
          header: ["User ID", "Player", "Previous ELO", "New ELO", "Created at", "Updated at"],
          rows: scoreRows,
        },
      ]);

      const eventName = sanitizeFilePart(eventWithUsers.title);
      const eventUuidPart = eventWithUsers.id.split("-")[0] ?? eventWithUsers.id.slice(0, 8);
      const fileName = `${eventName}_${eventUuidPart}.xlsx`;

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename=${fileName}`,
          "Cache-Control": "no-store",
        },
        body: xlsxBuffer.toString("base64"),
        isBase64Encoded: true,
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
