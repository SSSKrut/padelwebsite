import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";
import type { HandlerContext, HandlerEvent, HandlerResponse } from "@netlify/functions";

const mocks = vi.hoisted(() => ({
  eventFindUnique: vi.fn(),
  userFindMany: vi.fn(),
  eventScoreFindMany: vi.fn(),
  loadMatchTable: vi.fn(),
  verifyUser: vi.fn(),
}));

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    event: { findUnique: mocks.eventFindUnique },
    user: { findMany: mocks.userFindMany },
    eventScore: { findMany: mocks.eventScoreFindMany },
  },
}));

vi.mock("../functions/lib/matchTable", () => ({
  loadMatchTable: mocks.loadMatchTable,
}));

vi.mock("../functions/lib/auth", () => ({
  verifyUser: mocks.verifyUser,
}));

import { handler } from "../functions/admin-db-export-csv";

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    httpMethod: "GET",
    body: null,
    headers: {},
    rawUrl: "http://localhost/.netlify/functions/admin-db-export-csv",
    path: "/.netlify/functions/admin-db-export-csv",
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    rawQuery: "",
    isBase64Encoded: false,
    multiValueHeaders: {},
    ...overrides,
  };
}

async function callHandler(overrides: Partial<HandlerEvent> = {}) {
  const res = await handler(makeEvent(overrides), {} as HandlerContext);
  return res as HandlerResponse;
}

function parseXlsx(res: HandlerResponse) {
  const buf = Buffer.from(res.body!, "base64");
  const wb = XLSX.read(buf, { type: "buffer" });
  return wb;
}

describe("admin-db-export-csv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  });

  it("returns event XLSX with correct sheets and data", async () => {
    const players = [
      { id: "u1", name: "Ada Lovelace", elo: 1200 },
      { id: "u2", name: "Al Ice", elo: 900 },
      { id: "u3", name: "Bob B.", elo: 1000 },
      { id: "u4", name: "Cara C.", elo: 1100 },
      { id: "u5", name: "Dan D.", elo: 1050 },
    ];

    mocks.eventFindUnique.mockResolvedValue({
      id: "abcd1234-efgh-5678",
      title: "Spring Open 2026!",
      participants: [
        {
          user: {
            id: "u1",
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            elo: 1200,
            premiumSubscriptions: [{ id: "sub-1" }],
          },
        },
        {
          user: {
            id: "u2",
            firstName: "Al \"Ice\"",
            lastName: "O,Connor",
            email: "al@example.com",
            elo: 900,
            premiumSubscriptions: [],
          },
        },
        {
          user: {
            id: "u3",
            firstName: "Bob",
            lastName: "B.",
            email: "bob@example.com",
            elo: 1000,
            premiumSubscriptions: [],
          },
        },
        {
          user: {
            id: "u4",
            firstName: "Cara",
            lastName: "C.",
            email: "cara@example.com",
            elo: 1100,
            premiumSubscriptions: [],
          },
        },
        {
          user: {
            id: "u5",
            firstName: "Dan",
            lastName: "D.",
            email: "dan@example.com",
            elo: 1050,
            premiumSubscriptions: [],
          },
        },
      ],
    });

    mocks.loadMatchTable.mockResolvedValue({
      eventId: "abcd1234-efgh-5678",
      status: "OPEN",
      generatedAt: null,
      confirmedAt: null,
      courts: [
        {
          courtNumber: 1,
          isManual: false,
          players,
        },
      ],
      matches: [
        {
          id: "m1",
          courtNumber: 1,
          round: 1,
          pair1: [players[0], players[1]],
          pair2: [players[2], players[3]],
          score1: 6,
          score2: 4,
          updatedAt: "2026-04-06T10:00:00.000Z",
          updatedBy: players[0],
        },
      ],
    } as never);

    mocks.eventScoreFindMany.mockResolvedValue([
      {
        userId: "u1",
        previousElo: 1180,
        newElo: 1200,
        createdAt: new Date("2026-04-06T10:05:00.000Z"),
        updatedAt: new Date("2026-04-06T10:05:00.000Z"),
      },
    ] as never);

    const res = await callHandler({
      queryStringParameters: { eventId: "abcd1234-efgh-5678" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers?.["Content-Type"]).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(res.headers?.["Content-Disposition"]).toBe(
      "attachment; filename=spring_open_2026_abcd1234.xlsx",
    );
    expect(res.isBase64Encoded).toBe(true);

    // Parse the XLSX and verify contents
    const wb = parseXlsx(res);
    expect(wb.SheetNames).toEqual([
      "Participants",
      "Court assignments",
      "Match results",
      "Court standings",
      "Event scores",
    ]);

    // Participants sheet
    const participants = XLSX.utils.sheet_to_json<any>(wb.Sheets["Participants"]);
    expect(participants).toHaveLength(5);
    expect(participants[0]).toMatchObject({
      "User ID": "u1",
      "First name": "Ada",
      "Last name": "Lovelace",
      Email: "ada@example.com",
      Premium: true,
      ELO: 1200,
    });
    // Verify special characters are preserved (quotes and commas)
    expect(participants[1]["First name"]).toBe('Al "Ice"');
    expect(participants[1]["Last name"]).toBe("O,Connor");

    // Court assignments sheet
    const courts = XLSX.utils.sheet_to_json<any>(wb.Sheets["Court assignments"]);
    expect(courts).toHaveLength(5);
    expect(courts[0]).toMatchObject({
      Court: 1,
      "User ID": "u1",
      "Player name": "Ada Lovelace",
      Email: "ada@example.com",
      ELO: 1200,
    });

    // Match results sheet
    const matches = XLSX.utils.sheet_to_json<any>(wb.Sheets["Match results"]);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      Court: 1,
      Round: 1,
      "Pair 1": "Ada Lovelace / Al Ice",
      "Pair 2": "Bob B. / Cara C.",
      "Score 1": 6,
      "Score 2": 4,
    });

    // Court standings sheet
    const standings = XLSX.utils.sheet_to_json<any>(wb.Sheets["Court standings"]);
    expect(standings.length).toBeGreaterThan(0);
    const adaStanding = standings.find((s: any) => s.Player === "Ada Lovelace");
    expect(adaStanding).toBeDefined();
    expect(adaStanding.Points).toBe(1);
    expect(adaStanding.Difference).toBe(2);

    // Event scores sheet
    const scores = XLSX.utils.sheet_to_json<any>(wb.Sheets["Event scores"]);
    expect(scores).toHaveLength(1);
    expect(scores[0]).toMatchObject({
      "User ID": "u1",
      Player: "Ada Lovelace",
      "Previous ELO": 1180,
      "New ELO": 1200,
    });
  });

  it("returns event XLSX with empty sheets when no match table", async () => {
    mocks.eventFindUnique.mockResolvedValue({
      id: "aaaa-bbbb",
      title: "Empty Event",
      participants: [],
    });
    mocks.loadMatchTable.mockResolvedValue(null);
    mocks.eventScoreFindMany.mockResolvedValue([]);

    const res = await callHandler({
      queryStringParameters: { eventId: "aaaa-bbbb" },
    });

    expect(res.statusCode).toBe(200);
    const wb = parseXlsx(res);
    expect(wb.SheetNames).toHaveLength(5);

    const participants = XLSX.utils.sheet_to_json(wb.Sheets["Participants"]);
    expect(participants).toHaveLength(0);
  });

  it("returns users CSV with expected header and rows", async () => {
    mocks.userFindMany.mockResolvedValue([
      {
        id: "u1",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        elo: 1200,
        premiumSubscriptions: [{ id: "sub-1" }],
      },
      {
        id: "u2",
        firstName: "Grace",
        lastName: "Hopper",
        email: "grace@example.com",
        elo: 1350,
        premiumSubscriptions: [],
      },
    ]);

    const res = await callHandler();

    expect(res.statusCode).toBe(200);
    expect(res.headers?.["Content-Type"]).toBe("text/csv; charset=utf-8");
    expect(res.headers?.["Content-Disposition"]).toMatch(
      /^attachment; filename=users_dump_.*\.csv$/,
    );

    const lines = (res.body ?? "").split("\n");
    expect(lines[0]).toBe("user id,usr name,user surname,mail,is a premium user,elo");
    expect(lines[1]).toBe('"u1","Ada","Lovelace","ada@example.com","true","1200"');
    expect(lines[2]).toBe('"u2","Grace","Hopper","grace@example.com","false","1350"');
  });

  it("blocks non-admin users", async () => {
    mocks.verifyUser.mockResolvedValue({ id: "user-1", role: "USER" });

    const res = await callHandler();

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body ?? "{}")).toEqual({
      error: "Forbidden. Admin access required.",
    });
  });

  it("returns 404 when event not found", async () => {
    mocks.eventFindUnique.mockResolvedValue(null);

    const res = await callHandler({
      queryStringParameters: { eventId: "nonexistent" },
    });

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body ?? "{}")).toEqual({
      error: "Event not found",
    });
  });
});
