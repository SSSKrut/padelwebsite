import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    event: { findUnique: vi.fn() },
    eventRegistration: { findFirst: vi.fn(), delete: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("../functions/lib/auth", () => ({
  verifyUser: vi.fn(),
}));

vi.mock("../functions/lib/premium", () => ({
  isUserPremium: vi.fn(),
}));

import { handler } from "../functions/event-register";
import { prisma } from "../functions/lib/prisma";
import { verifyUser } from "../functions/lib/auth";
import { isUserPremium } from "../functions/lib/premium";

const EVENT_UUID = "123e4567-e89b-12d3-a456-426614174000";
const USER_UUID = "11111111-2222-3333-4444-555555555555";

const mockUser = { id: USER_UUID, email: "test@example.com", role: "USER" };

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    httpMethod: "POST",
    body: JSON.stringify({ eventId: EVENT_UUID }),
    headers: { cookie: "access_token=fake" },
    rawUrl: "http://localhost/.netlify/functions/event-register",
    path: "/.netlify/functions/event-register",
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    rawQuery: "",
    isBase64Encoded: false,
    multiValueHeaders: {},
    ...overrides,
  };
}

function futureDate(hoursFromNow: number): Date {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
}

function mockDbEvent(date: Date, participants = 0, maxParticipants = 16) {
  return {
    id: EVENT_UUID,
    date,
    maxParticipants,
    _count: { participants },
  } as never;
}

async function callHandler(overrides: Partial<HandlerEvent> = {}) {
  const res = await handler(makeEvent(overrides), {} as HandlerContext);
  const response = res as HandlerResponse;
  return {
    statusCode: response.statusCode,
    json: JSON.parse(response.body ?? "{}"),
  };
}

describe("event-register handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyUser).mockResolvedValue(mockUser as never);
    vi.mocked(isUserPremium).mockResolvedValue(false);
  });

  // --- Auth ---

  it("returns 401 when not authenticated", async () => {
    vi.mocked(verifyUser).mockRejectedValue(new Error("Unauthorized"));
    const { statusCode } = await callHandler();
    expect(statusCode).toBe(401);
  });

  it("returns 405 for GET requests", async () => {
    const { statusCode } = await callHandler({ httpMethod: "GET" });
    expect(statusCode).toBe(405);
  });

  // --- Event lookup ---

  it("returns 404 when event is not found", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(null);
    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(404);
    expect(json).toEqual({ error: "Event not found" });
  });

  // --- 24-hour lock ---

  it("returns 403 when event is within 24 hours (locked)", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(12)));
    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(403);
    expect(json.error).toMatch(/locked/i);
  });

  it("returns 403 when event has already started", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(-1)));
    const { statusCode } = await callHandler();
    expect(statusCode).toBe(403);
  });

  it("does not check registrations when event is locked", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(6)));
    await callHandler();
    expect(prisma.eventRegistration.findFirst).not.toHaveBeenCalled();
  });

  // --- Registration ---

  it("registers successfully when event has space", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(48), 5));
    vi.mocked(prisma.eventRegistration.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.eventRegistration.create).mockResolvedValue({} as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(200);
    expect(json).toEqual({ message: "Successfully registered", registered: true, premiumBypass: false });
    expect(prisma.eventRegistration.create).toHaveBeenCalledWith({
      data: { eventId: EVENT_UUID, userId: USER_UUID },
    });
  });

  it("returns 400 when event is full", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(48), 16, 16));
    vi.mocked(prisma.eventRegistration.findFirst).mockResolvedValue(null);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/full/i);
  });

  // --- Unregistration ---

  it("unregisters when user is already registered", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(48), 10));
    vi.mocked(prisma.eventRegistration.findFirst).mockResolvedValue({
      id: "reg-123",
      eventId: EVENT_UUID,
      userId: USER_UUID,
    } as never);
    vi.mocked(prisma.eventRegistration.delete).mockResolvedValue({} as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(200);
    expect(json).toEqual({ message: "Successfully unregistered", registered: false, premiumBypass: false });
    expect(prisma.eventRegistration.delete).toHaveBeenCalledWith({ where: { id: "reg-123" } });
  });

  it("blocks unregistration when event is within 24h", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(6), 5));
    const { statusCode } = await callHandler();
    expect(statusCode).toBe(403);
  });

  // --- Premium bypass ---

  it("allows premium user to register in locked window", async () => {
    vi.mocked(isUserPremium).mockResolvedValue(true);
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(12), 5));
    vi.mocked(prisma.eventRegistration.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.eventRegistration.create).mockResolvedValue({} as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(200);
    expect(json.registered).toBe(true);
    expect(json.premiumBypass).toBe(true);
  });

  it("allows premium user to unregister in locked window", async () => {
    vi.mocked(isUserPremium).mockResolvedValue(true);
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(12), 5));
    vi.mocked(prisma.eventRegistration.findFirst).mockResolvedValue({
      id: "reg-123",
      eventId: EVENT_UUID,
      userId: USER_UUID,
    } as never);
    vi.mocked(prisma.eventRegistration.delete).mockResolvedValue({} as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(200);
    expect(json.registered).toBe(false);
    expect(json.premiumBypass).toBe(true);
  });

  it("still blocks non-premium user in locked window", async () => {
    vi.mocked(isUserPremium).mockResolvedValue(false);
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(12)));
    const { statusCode } = await callHandler();
    expect(statusCode).toBe(403);
  });
});
