import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";

vi.mock("../functions/lib/prisma", () => {
  const eventRegistration = {
    findUnique: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
  };
  const eventWaitlist = {
    findFirst: vi.fn(),
    delete: vi.fn(),
  };
  const prisma = {
    eventRegistration,
    eventWaitlist,
    $transaction: vi.fn().mockImplementation(async (fn: any) => fn({ eventRegistration, eventWaitlist })),
  };
  return { prisma };
});

vi.mock("../functions/lib/auth", () => ({
  verifyUser: vi.fn(),
}));

import { handler } from "../functions/admin-event-registration";
import { prisma } from "../functions/lib/prisma";
import { verifyUser } from "../functions/lib/auth";

const EVENT_UUID = "123e4567-e89b-12d3-a456-426614174000";
const PLAYER_UUID = "11111111-2222-3333-4444-555555555555";

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    httpMethod: "DELETE",
    body: JSON.stringify({ eventId: EVENT_UUID, userId: PLAYER_UUID }),
    headers: { cookie: "access_token=fake" },
    rawUrl: "http://localhost/.netlify/functions/admin-event-registration",
    path: "/.netlify/functions/admin-event-registration",
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

describe("admin-event-registration handler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
      fn({ eventRegistration: prisma.eventRegistration, eventWaitlist: prisma.eventWaitlist }),
    );
    vi.mocked(verifyUser).mockResolvedValue({ id: "admin-1", role: "ADMIN" } as never);
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventWaitlist.findFirst).mockResolvedValue(null);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(verifyUser).mockRejectedValue(new Error("Unauthorized"));

    const { statusCode } = await callHandler();
    expect(statusCode).toBe(401);
  });

  it("returns 403 when authenticated user is not admin", async () => {
    vi.mocked(verifyUser).mockResolvedValue({ id: "user-1", role: "USER" } as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(403);
    expect(json.error).toMatch(/admin/i);
  });

  it("returns 405 for unsupported methods", async () => {
    const { statusCode } = await callHandler({ httpMethod: "POST" });
    expect(statusCode).toBe(405);
  });

  it("returns 400 for invalid request body", async () => {
    const { statusCode, json } = await callHandler({ body: JSON.stringify({ eventId: "bad", userId: PLAYER_UUID }) });
    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/validation/i);
  });

  it("returns 404 when player is not registered for event", async () => {
    vi.mocked(prisma.eventRegistration.findUnique).mockResolvedValue(null);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(404);
    expect(json.error).toMatch(/not registered/i);
  });

  it("removes player registration in a transaction", async () => {
    vi.mocked(prisma.eventRegistration.findUnique)
      .mockResolvedValueOnce({ id: "reg-1" } as never)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.eventRegistration.delete).mockResolvedValue({} as never);

    const { statusCode, json } = await callHandler();

    expect(statusCode).toBe(200);
    expect(json).toEqual({ message: "Player removed from event registration", removed: true, promotedUserId: null });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.eventRegistration.delete).toHaveBeenCalledWith({
      where: { id: "reg-1" },
    });
  });

  it("promotes first waitlisted user after admin removes participant", async () => {
    vi.mocked(prisma.eventRegistration.findUnique)
      .mockResolvedValueOnce({ id: "reg-1" } as never)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.eventRegistration.delete).mockResolvedValue({} as never);
    vi.mocked(prisma.eventWaitlist.findFirst).mockResolvedValue({ id: "wl-1", userId: "next-user" } as never);
    vi.mocked(prisma.eventRegistration.create).mockResolvedValue({} as never);
    vi.mocked(prisma.eventWaitlist.delete).mockResolvedValue({} as never);

    const { statusCode, json } = await callHandler();

    expect(statusCode).toBe(200);
    expect(json).toEqual({
      message: "Player removed from event registration and first waitlisted player promoted",
      removed: true,
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

  it("skips stale waitlist users who are already registered", async () => {
    vi.mocked(prisma.eventRegistration.findUnique)
      .mockResolvedValueOnce({ id: "reg-1" } as never)
      .mockResolvedValueOnce({ id: "already" } as never)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.eventRegistration.delete).mockResolvedValue({} as never);
    vi.mocked(prisma.eventWaitlist.findFirst)
      .mockResolvedValueOnce({ id: "wl-1", userId: "already-user" } as never)
      .mockResolvedValueOnce({ id: "wl-2", userId: "next-user" } as never);
    vi.mocked(prisma.eventWaitlist.delete).mockResolvedValue({} as never);
    vi.mocked(prisma.eventRegistration.create).mockResolvedValue({} as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(200);
    expect(json.promotedUserId).toBe("next-user");
    expect(prisma.eventWaitlist.delete).toHaveBeenCalledTimes(2);
  });
});