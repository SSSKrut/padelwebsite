import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";

vi.mock("../functions/lib/prisma", () => {
  const eventRegistration = {
    findUnique: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
  };
  const eventWaitlist = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  };
  const prisma = {
    event: { findUnique: vi.fn() },
    eventRegistration,
    eventWaitlist,
    $transaction: vi.fn().mockImplementation(async (fn: any) => fn({ eventRegistration, eventWaitlist })),
  };
  return { prisma };
});

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

function mockDbEvent(
  date: Date,
  participants = 0,
  maxParticipants = 16,
  status = "PUBLISHED",
  publishAt: Date | null = null,
) {
  return {
    id: EVENT_UUID,
    date,
    status,
    publishAt,
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
    vi.resetAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
      fn({ eventRegistration: prisma.eventRegistration, eventWaitlist: prisma.eventWaitlist }),
    );
    vi.mocked(verifyUser).mockResolvedValue(mockUser as never);
    vi.mocked(isUserPremium).mockResolvedValue(false);
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventRegistration.count).mockResolvedValue(0);
    vi.mocked(prisma.eventWaitlist.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventWaitlist.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.eventWaitlist.findMany).mockResolvedValue([]);
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

  // --- Status check ---

  it("returns 403 for DRAFT events", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(48), 0, 16, "DRAFT"));
    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(403);
    expect(json.error).toMatch(/not open/i);
  });

  it("returns 403 for SCHEDULED events for non-premium users before publishAt", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(
      mockDbEvent(futureDate(48), 0, 16, "SCHEDULED", futureDate(12)),
    );
    vi.mocked(isUserPremium).mockResolvedValue(false);
    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(403);
    expect(json.error).toMatch(/not yet open/i);
  });

  it("returns 403 for SCHEDULED events for non-premium users when publishAt is missing", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(
      mockDbEvent(futureDate(48), 0, 16, "SCHEDULED", null),
    );
    vi.mocked(isUserPremium).mockResolvedValue(false);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(403);
    expect(json.error).toMatch(/not yet open/i);
  });

  it("allows non-premium users to register for SCHEDULED events after publishAt", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(
      mockDbEvent(futureDate(48), 0, 16, "SCHEDULED", new Date(Date.now() - 60 * 60 * 1000)),
    );
    vi.mocked(isUserPremium).mockResolvedValue(false);
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventWaitlist.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventRegistration.count).mockResolvedValue(0);
    vi.mocked(prisma.eventRegistration.create).mockResolvedValue({} as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(200);
    expect(json.registered).toBe(true);
    expect(json.waitlisted).toBe(false);
  });

  it("allows premium users to register for SCHEDULED events", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(
      mockDbEvent(futureDate(48), 0, 16, "SCHEDULED", futureDate(72)),
    );
    vi.mocked(isUserPremium).mockResolvedValue(true);
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventWaitlist.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventRegistration.count).mockResolvedValue(0);
    vi.mocked(prisma.eventRegistration.create).mockResolvedValue({} as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(200);
    expect(json.registered).toBe(true);
  });

  // --- 24-hour lock (applies to EVERYONE) ---

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

  it("locks premium users too when within 24h of start", async () => {
    vi.mocked(isUserPremium).mockResolvedValue(true);
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(12)));
    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(403);
    expect(json.error).toMatch(/locked/i);
  });

  it("does not check registrations when event is locked", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(6)));
    await callHandler();
    expect(prisma.eventRegistration.findUnique).not.toHaveBeenCalled();
  });

  // --- Registration ---

  it("registers successfully when event has space", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(48), 5));
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventWaitlist.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventRegistration.count).mockResolvedValue(5);
    vi.mocked(prisma.eventRegistration.create).mockResolvedValue({} as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(200);
    expect(json).toEqual({ message: "Successfully registered", registered: true, waitlisted: false });
    expect(prisma.eventRegistration.create).toHaveBeenCalledWith({
      data: { eventId: EVENT_UUID, userId: USER_UUID },
    });
  });

  it("adds non-premium users to waitlist when event is full", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(48), 16, 16));
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventWaitlist.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventRegistration.count).mockResolvedValue(16);
    vi.mocked(prisma.eventWaitlist.create).mockResolvedValue({ id: "wl-2" } as never);
    vi.mocked(prisma.eventWaitlist.findMany).mockResolvedValue([
      { id: "wl-1", userId: "other-user", user: { premiumSubscriptions: [] } },
      { id: "wl-2", userId: USER_UUID, user: { premiumSubscriptions: [] } },
    ] as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(200);
    expect(json.waitlisted).toBe(true);
    expect(json.waitlistPosition).toBe(2);
    expect(json.waitlistAhead).toBe(1);
    expect(prisma.eventWaitlist.create).toHaveBeenCalledWith({
      data: { eventId: EVENT_UUID, userId: USER_UUID },
      select: { id: true },
    });
  });

  it("adds premium users to waitlist when event is full", async () => {
    vi.mocked(isUserPremium).mockResolvedValue(true);
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(48), 16, 16));
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventWaitlist.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventRegistration.count).mockResolvedValue(16);
    vi.mocked(prisma.eventWaitlist.create).mockResolvedValue({ id: "wl-2" } as never);
    vi.mocked(prisma.eventWaitlist.findMany).mockResolvedValue([
      { id: "wl-1", userId: "regular-user", user: { premiumSubscriptions: [] } },
      { id: "wl-2", userId: USER_UUID, user: { premiumSubscriptions: [{ id: "sub-1" }] } },
    ] as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(200);
    expect(json.waitlisted).toBe(true);
    expect(json.waitlistPosition).toBe(1);
    expect(json.waitlistAhead).toBe(0);
    expect(json.message).toMatch(/premium waitlist/i);
    expect(prisma.eventRegistration.create).not.toHaveBeenCalled();
  });

  it("removes non-premium users from waitlist on second click", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(48), 16, 16));
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventWaitlist.findUnique).mockResolvedValue({ id: "wl-1" } as never);
    vi.mocked(prisma.eventWaitlist.delete).mockResolvedValue({} as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(200);
    expect(json).toEqual({ message: "Removed from waitlist", registered: false, waitlisted: false });
    expect(prisma.eventWaitlist.delete).toHaveBeenCalledWith({ where: { id: "wl-1" } });
  });

  it("removes premium users from waitlist on second click", async () => {
    vi.mocked(isUserPremium).mockResolvedValue(true);
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(48), 16, 16));
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventWaitlist.findUnique).mockResolvedValue({ id: "wl-1" } as never);
    vi.mocked(prisma.eventWaitlist.delete).mockResolvedValue({} as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(200);
    expect(json).toEqual({ message: "Removed from waitlist", registered: false, waitlisted: false });
    expect(prisma.eventRegistration.create).not.toHaveBeenCalled();
  });

  // --- Unregistration ---

  it("unregisters when user is already registered", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(48), 10));
    vi.mocked(prisma.eventRegistration.findUnique)
      .mockResolvedValueOnce({
        id: "reg-123",
        eventId: EVENT_UUID,
        userId: USER_UUID,
      } as never)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.eventWaitlist.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventRegistration.delete).mockResolvedValue({} as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(200);
    expect(json).toEqual({ message: "Successfully unregistered", registered: false, waitlisted: false, promotedUserId: null });
    expect(prisma.eventRegistration.delete).toHaveBeenCalledWith({ where: { id: "reg-123" } });
  });

  it("promotes first waitlisted user when someone unregisters", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(48), 16, 16));
    vi.mocked(prisma.eventRegistration.findUnique)
      .mockResolvedValueOnce({
        id: "reg-123",
        eventId: EVENT_UUID,
        userId: USER_UUID,
      } as never)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.eventWaitlist.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventRegistration.delete).mockResolvedValue({} as never);
    vi.mocked(prisma.eventWaitlist.findMany).mockResolvedValue([
      {
        id: "wl-1",
        userId: "next-user",
        user: { premiumSubscriptions: [] },
      },
    ] as never);
    vi.mocked(prisma.eventRegistration.create).mockResolvedValue({} as never);
    vi.mocked(prisma.eventWaitlist.delete).mockResolvedValue({} as never);

    const { statusCode, json } = await callHandler();

    expect(statusCode).toBe(200);
    expect(json).toEqual({
      message: "Successfully unregistered. First player in waitlist has been promoted",
      registered: false,
      waitlisted: false,
      promotedUserId: "next-user",
    });
    expect(prisma.eventRegistration.create).toHaveBeenCalledWith({
      data: {
        eventId: EVENT_UUID,
        userId: "next-user",
      },
    });
    expect(prisma.eventWaitlist.delete).toHaveBeenCalledWith({ where: { id: "wl-1" } });
  });

  it("prioritizes premium waitlist users when promoting after unregister", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(48), 16, 16));
    vi.mocked(prisma.eventRegistration.findUnique)
      .mockResolvedValueOnce({
        id: "reg-123",
        eventId: EVENT_UUID,
        userId: USER_UUID,
      } as never)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.eventWaitlist.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventRegistration.delete).mockResolvedValue({} as never);
    vi.mocked(prisma.eventWaitlist.findMany).mockResolvedValue([
      {
        id: "wl-regular",
        userId: "regular-user",
        user: { premiumSubscriptions: [] },
      },
      {
        id: "wl-premium",
        userId: "premium-user",
        user: { premiumSubscriptions: [{ id: "sub-1" }] },
      },
    ] as never);
    vi.mocked(prisma.eventRegistration.create).mockResolvedValue({} as never);
    vi.mocked(prisma.eventWaitlist.delete).mockResolvedValue({} as never);

    const { statusCode, json } = await callHandler();

    expect(statusCode).toBe(200);
    expect(json.promotedUserId).toBe("premium-user");
    expect(prisma.eventRegistration.create).toHaveBeenCalledWith({
      data: {
        eventId: EVENT_UUID,
        userId: "premium-user",
      },
    });
    expect(prisma.eventWaitlist.delete).toHaveBeenCalledWith({ where: { id: "wl-premium" } });
  });

  it("skips stale waitlist entries that are already registered", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(48), 16, 16));
    vi.mocked(prisma.eventRegistration.findUnique)
      .mockResolvedValueOnce({
        id: "reg-123",
        eventId: EVENT_UUID,
        userId: USER_UUID,
      } as never)
      .mockResolvedValueOnce({ id: "already" } as never)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.eventWaitlist.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventRegistration.delete).mockResolvedValue({} as never);
    vi.mocked(prisma.eventWaitlist.findMany)
      .mockResolvedValueOnce([
        { id: "wl-1", userId: "already-registered", user: { premiumSubscriptions: [{ id: "sub-1" }] } },
        { id: "wl-2", userId: "next-user", user: { premiumSubscriptions: [] } },
      ] as never)
      .mockResolvedValueOnce([
        { id: "wl-2", userId: "next-user", user: { premiumSubscriptions: [] } },
      ] as never);
    vi.mocked(prisma.eventRegistration.create).mockResolvedValue({} as never);
    vi.mocked(prisma.eventWaitlist.delete).mockResolvedValue({} as never);

    const { statusCode, json } = await callHandler();

    expect(statusCode).toBe(200);
    expect(json.promotedUserId).toBe("next-user");
    expect(prisma.eventWaitlist.delete).toHaveBeenCalledTimes(2);
  });

  it("keeps fairness and sends new non-premium users to waitlist if queue already exists", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(48), 10, 16));
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventWaitlist.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventRegistration.count).mockResolvedValue(10);
    vi.mocked(prisma.eventWaitlist.findFirst).mockResolvedValue({ id: "wl-existing" } as never);
    vi.mocked(prisma.eventWaitlist.create).mockResolvedValue({ id: "wl-2" } as never);
    vi.mocked(prisma.eventWaitlist.findMany).mockResolvedValue([
      { id: "wl-existing", userId: "existing-user", user: { premiumSubscriptions: [] } },
      { id: "wl-2", userId: USER_UUID, user: { premiumSubscriptions: [] } },
    ] as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(200);
    expect(json.waitlisted).toBe(true);
    expect(prisma.eventRegistration.create).not.toHaveBeenCalled();
  });

  it("blocks unregistration when event is within 24h", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(6), 5));
    const { statusCode } = await callHandler();
    expect(statusCode).toBe(403);
  });

  // --- Transaction safety ---

  it("uses a database transaction for registration to prevent race conditions", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockDbEvent(futureDate(48), 5));
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventWaitlist.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventRegistration.count).mockResolvedValue(5);
    vi.mocked(prisma.eventRegistration.create).mockResolvedValue({} as never);

    await callHandler();
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
