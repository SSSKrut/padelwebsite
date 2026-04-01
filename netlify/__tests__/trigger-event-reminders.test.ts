import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";

vi.mock("../functions/lib/auth", () => ({
  verifyAdmin: vi.fn(),
}));

vi.mock("../functions/lib/sendEventReminders", () => ({
  sendEventReminders: vi.fn(),
}));

import { handler } from "../functions/trigger-event-reminders";
import { verifyAdmin } from "../functions/lib/auth";
import { sendEventReminders } from "../functions/lib/sendEventReminders";

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    httpMethod: "POST",
    body: null,
    headers: { cookie: "access_token=fake" },
    rawUrl: "http://localhost/.netlify/functions/trigger-event-reminders",
    path: "/.netlify/functions/trigger-event-reminders",
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

describe("trigger-event-reminders handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdmin).mockResolvedValue(undefined as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(verifyAdmin).mockRejectedValue(new Error("Unauthorized"));
    const { statusCode } = await callHandler();
    expect(statusCode).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(verifyAdmin).mockRejectedValue(new Error("Forbidden"));
    const { statusCode } = await callHandler();
    expect(statusCode).toBe(403);
  });

  it("returns 405 for GET requests", async () => {
    const res = await handler(makeEvent({ httpMethod: "GET" }), {} as HandlerContext);
    const response = res as HandlerResponse;
    expect(response.statusCode).toBe(405);
  });

  it("calls sendEventReminders and returns count", async () => {
    vi.mocked(sendEventReminders).mockResolvedValue(2);

    const { statusCode, json } = await callHandler();

    expect(statusCode).toBe(200);
    expect(json).toEqual({ reminders: 2 });
    expect(sendEventReminders).toHaveBeenCalledTimes(1);
  });

  it("returns 0 when no events need reminders", async () => {
    vi.mocked(sendEventReminders).mockResolvedValue(0);

    const { statusCode, json } = await callHandler();

    expect(statusCode).toBe(200);
    expect(json).toEqual({ reminders: 0 });
  });
});
