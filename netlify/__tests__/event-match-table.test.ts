import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";

const mocks = vi.hoisted(() => ({
  verifyUser: vi.fn(),
  eventRegistrationFindUnique: vi.fn(),
  eventFindUnique: vi.fn(),
  eventMatchFindUnique: vi.fn(),
  eventMatchUpdateMany: vi.fn(),
  loadMatchTable: vi.fn(),
}));

vi.mock("../functions/lib/auth", () => ({
  verifyUser: mocks.verifyUser,
}));

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    event: { findUnique: mocks.eventFindUnique },
    eventRegistration: { findUnique: mocks.eventRegistrationFindUnique },
    eventMatch: { updateMany: mocks.eventMatchUpdateMany, findUnique: mocks.eventMatchFindUnique },
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
    vi.mocked(prisma.eventMatch.findUnique).mockResolvedValue({
      eventId: EVENT_ID,
      pair1Player1Id: "user-1",
      pair1Player2Id: "user-2",
      pair2Player1Id: "user-3",
      pair2Player2Id: "user-4",
      score1: null,
      score2: null,
    } as never);
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
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "CONFIRMED" } as never);

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
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "OPEN" } as never);
    vi.mocked(prisma.eventMatch.findUnique).mockResolvedValueOnce(null as never);

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
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "OPEN" } as never);
    vi.mocked(prisma.eventMatch.updateMany).mockResolvedValueOnce({ count: 1 } as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({ eventId: EVENT_ID, matchId: MATCH_ID, score1: 6, score2: 4 }),
      queryStringParameters: {},
    });

    expect(statusCode).toBe(200);
    expect(json).toEqual({ success: true });
  });

  it("rejects status updates from non-participants", async () => {
    vi.mocked(verifyUser).mockResolvedValue({ id: "user-99", role: "USER" } as never);
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "OPEN" } as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({ eventId: EVENT_ID, matchId: MATCH_ID, status: "IN_PROGRESS" }),
      queryStringParameters: {},
    });

    expect(statusCode).toBe(403);
    expect(json.error).toMatch(/forbidden/i);
  });

  it("rejects disallowed status for players", async () => {
    vi.mocked(verifyUser).mockResolvedValue({ id: "user-1", role: "USER" } as never);
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "OPEN" } as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({ eventId: EVENT_ID, matchId: MATCH_ID, status: "WALKOVER" }),
      queryStringParameters: {},
    });

    expect(statusCode).toBe(403);
    expect(json.error).toMatch(/status update not allowed/i);
  });

  it("requires scores when marking completed without existing scores", async () => {
    vi.mocked(verifyUser).mockResolvedValue({ id: "admin-1", role: "ADMIN" } as never);
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "OPEN" } as never);
    vi.mocked(prisma.eventMatch.findUnique).mockResolvedValueOnce({
      eventId: EVENT_ID,
      pair1Player1Id: "user-1",
      pair1Player2Id: "user-2",
      pair2Player1Id: "user-3",
      pair2Player2Id: "user-4",
      score1: null,
      score2: null,
    } as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({ eventId: EVENT_ID, matchId: MATCH_ID, status: "COMPLETED" }),
      queryStringParameters: {},
    });

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/scores are required/i);
  });

  it("allows completing match when existing scores are present", async () => {
    vi.mocked(verifyUser).mockResolvedValue({ id: "admin-1", role: "ADMIN" } as never);
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "OPEN" } as never);
    vi.mocked(prisma.eventMatch.findUnique).mockResolvedValueOnce({
      eventId: EVENT_ID,
      pair1Player1Id: "user-1",
      pair1Player2Id: "user-2",
      pair2Player1Id: "user-3",
      pair2Player2Id: "user-4",
      score1: 6,
      score2: 4,
    } as never);
    vi.mocked(prisma.eventMatch.updateMany).mockResolvedValueOnce({ count: 1 } as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({ eventId: EVENT_ID, matchId: MATCH_ID, status: "COMPLETED" }),
      queryStringParameters: {},
    });

    expect(statusCode).toBe(200);
    expect(json).toEqual({ success: true });
  });

  it("auto-marks completed when scores are updated", async () => {
    vi.mocked(verifyUser).mockResolvedValue({ id: "admin-1", role: "ADMIN" } as never);
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "OPEN" } as never);
    vi.mocked(prisma.eventMatch.updateMany).mockResolvedValueOnce({ count: 1 } as never);

    const { statusCode } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({ eventId: EVENT_ID, matchId: MATCH_ID, score1: 6, score2: 2 }),
      queryStringParameters: {},
    });

    expect(statusCode).toBe(200);
    expect(prisma.eventMatch.updateMany).toHaveBeenCalledWith({
      where: { id: MATCH_ID, eventId: EVENT_ID },
      data: expect.objectContaining({ status: "COMPLETED" }),
    });
  });

  it("rejects score updates when only one score is provided", async () => {
    vi.mocked(verifyUser).mockResolvedValue({ id: "admin-1", role: "ADMIN" } as never);
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "OPEN" } as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({ eventId: EVENT_ID, matchId: MATCH_ID, score1: 6 }),
      queryStringParameters: {},
    });

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/validation error/i);
  });
});
