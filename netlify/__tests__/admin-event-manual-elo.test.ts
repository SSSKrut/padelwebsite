import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";

const mocks = vi.hoisted(() => ({
  verifyUser: vi.fn(),
  eventFindUnique: vi.fn(),
  eventRegistrationFindMany: vi.fn(),
  transaction: vi.fn(),
  executeRaw: vi.fn(),
}));

vi.mock("../functions/lib/auth", () => ({
  verifyUser: mocks.verifyUser,
}));

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    event: { findUnique: mocks.eventFindUnique },
    eventRegistration: { findMany: mocks.eventRegistrationFindMany },
    $transaction: mocks.transaction,
    $executeRaw: mocks.executeRaw,
  },
}));

import { handler } from "../functions/admin-event-manual-elo";
import { prisma } from "../functions/lib/prisma";
import { verifyUser } from "../functions/lib/auth";

type TransactionCallback = Parameters<typeof prisma.$transaction>[0];
type TransactionClient = Parameters<TransactionCallback>[0];

const EVENT_ID = "123e4567-e89b-12d3-a456-426614174000";
const USER_ID = "11111111-2222-3333-4444-555555555555";

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    httpMethod: "POST",
    body: JSON.stringify({
      eventId: EVENT_ID,
      entries: [{ userId: USER_ID, newElo: 1200 }],
    }),
    headers: { cookie: "access_token=fake" },
    rawUrl: "http://localhost/.netlify/functions/admin-event-manual-elo",
    path: "/.netlify/functions/admin-event-manual-elo",
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
  const response = res as HandlerResponse;
  return {
    statusCode: response.statusCode,
    json: JSON.parse(response.body ?? "{}"),
  };
}

describe("admin-event-manual-elo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyUser).mockResolvedValue({ id: "admin-1", role: "ADMIN" } as never);
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: EVENT_ID } as never);
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue([{ userId: USER_ID }] as never);
    const transactionClient = { $executeRaw: mocks.executeRaw } as unknown as TransactionClient;
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

  it("returns 404 when event is not found", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

    const { statusCode, json } = await callHandler();

    expect(statusCode).toBe(404);
    expect(json.error).toMatch(/event not found/i);
  });

  it("returns 400 when entries are empty", async () => {
    const { statusCode, json } = await callHandler({
      body: JSON.stringify({ eventId: EVENT_ID, entries: [] }),
    });

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/entries list is empty/i);
  });

  it("returns 400 when user is not registered", async () => {
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue([] as never);

    const { statusCode, json } = await callHandler();

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/not registered/i);
  });

  it("stores manual ELO entries", async () => {
    const { statusCode, json } = await callHandler();

    expect(statusCode).toBe(200);
    expect(json).toEqual({ success: true });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.$executeRaw).toHaveBeenCalled();
  });
});
