import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";

const mocks = vi.hoisted(() => ({
  verifyUser: vi.fn(),
  eventFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  queryRaw: vi.fn(),
  executeRaw: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../functions/lib/auth", () => ({
  verifyUser: mocks.verifyUser,
}));

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    event: { findUnique: mocks.eventFindUnique },
    user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
    $queryRaw: mocks.queryRaw,
    $executeRaw: mocks.executeRaw,
    $transaction: mocks.transaction,
  },
}));

import { handler } from "../functions/admin-event-scores";
import { prisma } from "../functions/lib/prisma";
import { verifyUser } from "../functions/lib/auth";

const EVENT_ID = "123e4567-e89b-12d3-a456-426614174000";
const USER_ID = "11111111-2222-3333-4444-555555555555";

type TransactionCallback = Parameters<typeof prisma.$transaction>[0];
type TransactionClient = Parameters<TransactionCallback>[0];

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    httpMethod: "GET",
    body: null,
    headers: { cookie: "access_token=fake" },
    rawUrl: "http://localhost/.netlify/functions/admin-event-scores",
    path: "/.netlify/functions/admin-event-scores",
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

describe("admin-event-scores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyUser).mockResolvedValue({ id: "admin-1", role: "ADMIN" } as never);
    const transactionClient = prisma as unknown as TransactionClient;
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: TransactionCallback) => fn(transactionClient));
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(verifyUser).mockRejectedValue(new Error("Unauthorized"));

    const { statusCode } = await callHandler();
    expect(statusCode).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(verifyUser).mockResolvedValue({ id: "user-1", role: "USER" } as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(403);
    expect(json.error).toMatch(/admin/i);
  });

  it("returns event scores for GET", async () => {
    const createdAt = new Date("2026-04-06T10:00:00.000Z");
    const updatedAt = new Date("2026-04-06T11:00:00.000Z");

    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { userId: USER_ID, previousElo: 1000, newElo: 1100, createdAt, updatedAt },
    ] as never);

    const { statusCode, json } = await callHandler();

    expect(statusCode).toBe(200);
    expect(json.eventId).toBe(EVENT_ID);
    expect(json.scores[0]).toEqual({
      userId: USER_ID,
      previousElo: 1000,
      newElo: 1100,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
  });

  it("updates scores and user ELO on POST", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      id: EVENT_ID,
      participants: [{ userId: USER_ID }],
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ elo: 1200 } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: USER_ID } as never);
    vi.mocked(prisma.$executeRaw).mockResolvedValue(undefined as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "POST",
      body: JSON.stringify({
        eventId: EVENT_ID,
        scores: [{ userId: USER_ID, newElo: 1300 }],
      }),
      queryStringParameters: {},
    });

    expect(statusCode).toBe(200);
    expect(json.updated).toBe(1);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { elo: 1300 },
    });
    expect(prisma.$executeRaw).toHaveBeenCalled();
  });

  it("allows scoring users even when not registered for the event", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: EVENT_ID } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ elo: 900 } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: USER_ID } as never);
    vi.mocked(prisma.$executeRaw).mockResolvedValue(undefined as never);

    const { statusCode } = await callHandler({
      httpMethod: "POST",
      body: JSON.stringify({
        eventId: EVENT_ID,
        scores: [{ userId: USER_ID, newElo: 950 }],
      }),
      queryStringParameters: {},
    });

    expect(statusCode).toBe(200);
  });
});
