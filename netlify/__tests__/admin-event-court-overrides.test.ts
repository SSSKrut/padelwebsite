import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";

const mocks = vi.hoisted(() => ({
  verifyUser: vi.fn(),
  eventFindUnique: vi.fn(),
  overrideUpsert: vi.fn(),
  overrideDeleteMany: vi.fn(),
}));

vi.mock("../functions/lib/auth", () => ({
  verifyUser: mocks.verifyUser,
}));

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    event: { findUnique: mocks.eventFindUnique },
    eventCourtOverride: {
      upsert: mocks.overrideUpsert,
      deleteMany: mocks.overrideDeleteMany,
    },
  },
}));

import { handler } from "../functions/admin-event-court-overrides";
import { prisma } from "../functions/lib/prisma";
import { verifyUser } from "../functions/lib/auth";

const EVENT_ID = "123e4567-e89b-12d3-a456-426614174000";

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    httpMethod: "PATCH",
    body: null,
    headers: { cookie: "access_token=fake" },
    rawUrl: "http://localhost/.netlify/functions/admin-event-court-overrides",
    path: "/.netlify/functions/admin-event-court-overrides",
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

describe("admin-event-court-overrides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyUser).mockResolvedValue({ id: "admin-1", role: "ADMIN" } as never);
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ matchTableStatus: "OPEN" } as never);
  });

  it("upserts manual override when enabled", async () => {
    vi.mocked(prisma.eventCourtOverride.upsert).mockResolvedValue({ id: "override-1" } as never);

    const { statusCode } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({ eventId: EVENT_ID, courtNumber: 2, isManual: true }),
    });

    expect(statusCode).toBe(200);
    expect(prisma.eventCourtOverride.upsert).toHaveBeenCalled();
  });

  it("removes override when disabled", async () => {
    vi.mocked(prisma.eventCourtOverride.deleteMany).mockResolvedValue({ count: 1 } as never);

    const { statusCode } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({ eventId: EVENT_ID, courtNumber: 2, isManual: false }),
    });

    expect(statusCode).toBe(200);
    expect(prisma.eventCourtOverride.deleteMany).toHaveBeenCalled();
  });

  it("returns 404 when event is missing", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(null as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({ eventId: EVENT_ID, courtNumber: 2, isManual: true }),
    });

    expect(statusCode).toBe(404);
    expect(json.error).toMatch(/event not found/i);
  });

  it("returns 400 when match table is not open", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ matchTableStatus: "CONFIRMED" } as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({ eventId: EVENT_ID, courtNumber: 2, isManual: true }),
    });

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/not open/i);
  });
});
