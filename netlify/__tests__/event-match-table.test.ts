import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";

const mocks = vi.hoisted(() => ({
  verifyUser: vi.fn(),
  eventRegistrationFindUnique: vi.fn(),
  queryRaw: vi.fn(),
  executeRaw: vi.fn(),
  loadMatchTable: vi.fn(),
}));

vi.mock("../functions/lib/auth", () => ({
  verifyUser: mocks.verifyUser,
}));

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    eventRegistration: { findUnique: mocks.eventRegistrationFindUnique },
    $queryRaw: mocks.queryRaw,
    $executeRaw: mocks.executeRaw,
  },
}));

vi.mock("../functions/lib/matchTable", () => ({
  loadMatchTable: mocks.loadMatchTable,
}));

import { handler } from "../functions/event-match-table";
import { prisma } from "../functions/lib/prisma";
import { verifyUser } from "../functions/lib/auth";
import { loadMatchTable } from "../functions/lib/matchTable";

const EVENT_ID = "123e4567-e89b-12d3-a456-426614174000";
const MATCH_ID = "123e4567-e89b-12d3-a456-426614174001";

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    httpMethod: "GET",
    body: null,
    headers: { cookie: "access_token=fake" },
    rawUrl: "http://localhost/.netlify/functions/event-match-table",
    path: "/.netlify/functions/event-match-table",
    queryStringParameters: { eventId: EVENT_ID },
    multiValueQueryStringParameters: {},
    rawQuery: "",
    isBase64Encoded: false,
    multiValueHeaders: {},
    ...overrides,
  };
}

async function callHandler(overrides: Partial<HandlerEvent> = {}) {
  const res = await handler(makeEvent(overrides), {} as HandlerContext);
  const response = res as HandlerResponse;
  return {
    statusCode: response.statusCode,
    json: JSON.parse(response.body ?? "{}"),
  };
}

describe("event-match-table", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyUser).mockResolvedValue({ id: "user-1", role: "USER" } as never);
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue({ id: "reg-1" } as never);
    vi.mocked(loadMatchTable).mockResolvedValue({
      eventId: EVENT_ID,
      status: "OPEN",
      generatedAt: null,
      confirmedAt: null,
      courts: [],
      matches: [],
    } as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(verifyUser).mockRejectedValue(new Error("Unauthorized"));

    const { statusCode } = await callHandler();
    expect(statusCode).toBe(401);
  });

  it("returns 400 when eventId is missing", async () => {
    const { statusCode, json } = await callHandler({ queryStringParameters: {} });

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/eventId/i);
  });

  it("returns 403 when user is not registered for the event", async () => {
    vi.mocked(verifyUser).mockResolvedValue({ id: "user-2", role: "USER" } as never);
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);

    const { statusCode, json } = await callHandler();

    expect(statusCode).toBe(403);
    expect(json.error).toMatch(/forbidden/i);
  });

  it("returns match table for authorized participants", async () => {
    const table = {
      eventId: EVENT_ID,
      status: "OPEN",
      generatedAt: null,
      confirmedAt: null,
      courts: [],
      matches: [],
    };
    vi.mocked(loadMatchTable).mockResolvedValue(table as never);

    const { statusCode, json } = await callHandler();

    expect(statusCode).toBe(200);
    expect(json).toEqual(table);
  });

  it("allows admins to view the match table without registration", async () => {
    vi.mocked(verifyUser).mockResolvedValue({ id: "admin-1", role: "ADMIN" } as never);
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);

    const { statusCode } = await callHandler();

    expect(statusCode).toBe(200);
  });

  it("rejects score updates when match table is not open", async () => {
    vi.mocked(verifyUser).mockResolvedValue({ id: "admin-1", role: "ADMIN" } as never);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ matchTableStatus: "CONFIRMED" }] as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({ eventId: EVENT_ID, matchId: MATCH_ID, score1: 6, score2: 4 }),
      queryStringParameters: {},
    });

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/not open/i);
  });

  it("returns 404 when match update targets unknown match", async () => {
    vi.mocked(verifyUser).mockResolvedValue({ id: "admin-1", role: "ADMIN" } as never);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ matchTableStatus: "OPEN" }] as never);
    vi.mocked(prisma.$executeRaw).mockResolvedValueOnce(0 as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({ eventId: EVENT_ID, matchId: MATCH_ID, score1: 6, score2: 4 }),
      queryStringParameters: {},
    });

    expect(statusCode).toBe(404);
    expect(json.error).toMatch(/match not found/i);
  });

  it("updates match scores when table is open", async () => {
    vi.mocked(verifyUser).mockResolvedValue({ id: "admin-1", role: "ADMIN" } as never);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ matchTableStatus: "OPEN" }] as never);
    vi.mocked(prisma.$executeRaw).mockResolvedValueOnce(1 as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({ eventId: EVENT_ID, matchId: MATCH_ID, score1: 6, score2: 4 }),
      queryStringParameters: {},
    });

    expect(statusCode).toBe(200);
    expect(json).toEqual({ success: true });
  });
});
