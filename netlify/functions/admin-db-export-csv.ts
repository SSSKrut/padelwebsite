import type { Handler } from "@netlify/functions";
import { prisma } from "./lib/prisma";
import { defineHandler } from "./lib/apiHandler";
import { loadMatchTable, type MatchTableResponse } from "./lib/matchTable";

type UserRow = {
  userId: string;
  userName: string;
  userSurname: string;
  mail: string;
  isPremiumUser: boolean;
  elo: number;
};

type CsvSection = {
  title: string;
  header: string;
  rows: string[][];
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

function buildSection(section: CsvSection): string[] {
  const lines = [`# ${section.title}`, section.header];
  section.rows.forEach((row) => {
    lines.push(row.map((value) => escapeCsv(String(value))).join(","));
  });
  return lines;
}

function buildEventCsv(sections: CsvSection[]): string {
  const lines: string[] = [];
  sections.forEach((section, index) => {
    if (index > 0) {
      lines.push("");
    }
    lines.push(...buildSection(section));
  });
  return lines.join("\n");
}

function buildStandingsRows(matchTable: MatchTableResponse | null): string[][] {
  if (!matchTable) return [];
  const rows: string[][] = [];

  const matchesByCourt = new Map<number, MatchTableResponse["matches"]>();
  matchTable.matches.forEach((match) => {
    const list = matchesByCourt.get(match.courtNumber) ?? [];
    list.push(match);
    matchesByCourt.set(match.courtNumber, list);
  });

  matchTable.courts.forEach((court) => {
    if (court.isManual) return;
    const entries = new Map<string, { name: string; points: number; diff: number }>();
    court.players.forEach((player) => {
      entries.set(player.id, { name: player.name, points: 0, diff: 0 });
    });

    const matches = matchesByCourt.get(court.courtNumber) ?? [];
    matches.forEach((match) => {
      if (match.score1 === null || match.score2 === null) return;
      const score1 = match.score1;
      const score2 = match.score2;
      const pair1Points = score1 === score2 ? 0.5 : score1 > score2 ? 1 : 0;
      const pair2Points = score1 === score2 ? 0.5 : score1 > score2 ? 0 : 1;
      const diff1 = score1 - score2;
      const diff2 = score2 - score1;

      match.pair1.forEach((player) => {
        const entry = entries.get(player.id);
        if (!entry) return;
        entry.points += pair1Points;
        entry.diff += diff1;
      });

      match.pair2.forEach((player) => {
        const entry = entries.get(player.id);
        if (!entry) return;
        entry.points += pair2Points;
        entry.diff += diff2;
      });
    });

    const standings = Array.from(entries.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.diff !== a.diff) return b.diff - a.diff;
      return a.name.localeCompare(b.name);
    });

    standings.forEach((entry) => {
      rows.push([String(court.courtNumber), entry.name, String(entry.points), String(entry.diff)]);
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

      const rows: UserRow[] = eventWithUsers.participants.map((registration) => ({
        userId: registration.user.id,
        userName: registration.user.firstName,
        userSurname: registration.user.lastName,
        mail: registration.user.email,
        isPremiumUser: registration.user.premiumSubscriptions.length > 0,
        elo: registration.user.elo,
      }));

      const courtRows: string[][] = [];
      if (matchTable?.courts?.length) {
        matchTable.courts.forEach((court) => {
          court.players.forEach((player) => {
            const info = participantMap.get(player.id);
            courtRows.push([
              String(court.courtNumber),
              player.id,
              info?.name ?? player.name,
              info?.mail ?? "",
              String(player.elo),
              player.manualElo !== null && player.manualElo !== undefined ? String(player.manualElo) : "",
            ]);
          });
        });
      }

      const matchRows: string[][] = (matchTable?.matches ?? []).map((match) => [
        String(match.courtNumber),
        String(match.round),
        match.pair1.map((player) => player.name).join(" / "),
        match.pair2.map((player) => player.name).join(" / "),
        match.score1 !== null ? String(match.score1) : "",
        match.score2 !== null ? String(match.score2) : "",
        match.updatedAt ?? "",
        match.updatedBy?.name ?? "",
      ]);

      const standingsRows = buildStandingsRows(matchTable);

      const scoreRows: string[][] = eventScores.map((score) => {
        const info = participantMap.get(score.userId);
        const createdAt = score.createdAt instanceof Date ? score.createdAt.toISOString() : String(score.createdAt ?? "");
        const updatedAt = score.updatedAt instanceof Date ? score.updatedAt.toISOString() : String(score.updatedAt ?? "");
        return [
          score.userId,
          info?.name ?? "",
          String(score.previousElo),
          String(score.newElo),
          createdAt,
          updatedAt,
        ];
      });

      const csv = buildEventCsv([
        {
          title: "Participants",
          header: "user id,usr name,user surname,mail,is a premium user,elo",
          rows: rows.map((row) => [
            row.userId,
            row.userName,
            row.userSurname,
            row.mail,
            row.isPremiumUser ? "true" : "false",
            String(row.elo),
          ]),
        },
        {
          title: "Court assignments",
          header: "court number,user id,player name,mail,elo,manual elo",
          rows: courtRows,
        },
        {
          title: "Match results",
          header: "court number,round,pair 1,pair 2,score 1,score 2,updated at,updated by",
          rows: matchRows,
        },
        {
          title: "Court standings",
          header: "court number,player,points,difference",
          rows: standingsRows,
        },
        {
          title: "Event scores",
          header: "user id,player,previous elo,new elo,created at,updated at",
          rows: scoreRows,
        },
      ]);
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
