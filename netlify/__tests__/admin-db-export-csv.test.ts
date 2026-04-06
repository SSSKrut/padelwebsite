import { describe, it, expect, vi, beforeEach } from "vitest";
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

describe("admin-db-export-csv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  });

  it("returns event CSV with expected header and rows", async () => {
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
    expect(res.headers?.["Content-Type"]).toBe("text/csv; charset=utf-8");
    expect(res.headers?.["Content-Disposition"]).toBe(
      "attachment; filename=spring_open_2026_abcd1234.csv",
    );

    const lines = (res.body ?? "").split("\n");
    expect(lines).toContain("# Participants");
    expect(lines).toContain("user id,usr name,user surname,mail,is a premium user,elo");
    expect(lines).toContain("\"u1\",\"Ada\",\"Lovelace\",\"ada@example.com\",\"true\",\"1200\"");
    expect(lines).toContain("# Court assignments");
    expect(lines).toContain("court number,user id,player name,mail,elo,manual elo");
    expect(lines).toContain("\"1\",\"u1\",\"Ada Lovelace\",\"ada@example.com\",\"1200\",\"\"");
    expect(lines).toContain("# Match results");
    expect(lines).toContain("court number,round,pair 1,pair 2,score 1,score 2,updated at,updated by");
    expect(lines).toContain("\"1\",\"1\",\"Ada Lovelace / Al Ice\",\"Bob B. / Cara C.\",\"6\",\"4\",\"2026-04-06T10:00:00.000Z\",\"Ada Lovelace\"");
    expect(lines).toContain("# Court standings");
    expect(lines).toContain("court number,player,points,difference");
    expect(lines).toContain("\"1\",\"Ada Lovelace\",\"1\",\"2\"");
    expect(lines).toContain("# Event scores");
    expect(lines).toContain("user id,player,previous elo,new elo,created at,updated at");
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
    expect(lines[1]).toBe("\"u1\",\"Ada\",\"Lovelace\",\"ada@example.com\",\"true\",\"1200\"");
    expect(lines[2]).toBe("\"u2\",\"Grace\",\"Hopper\",\"grace@example.com\",\"false\",\"1350\"");
  });

  it("blocks non-admin users", async () => {
    mocks.verifyUser.mockResolvedValue({ id: "user-1", role: "USER" });

    const res = await callHandler();

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body ?? "{}")).toEqual({
      error: "Forbidden. Admin access required.",
    });
  });
});
