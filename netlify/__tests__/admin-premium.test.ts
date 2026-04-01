import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    premiumSubscription: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("../functions/lib/auth", () => ({
  verifyAdmin: vi.fn(),
}));

import { handler } from "../functions/admin-premium";
import { prisma } from "../functions/lib/prisma";
import { verifyAdmin } from "../functions/lib/auth";

const ADMIN_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const USER_ID = "11111111-2222-3333-4444-555555555555";

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    httpMethod: "POST",
    body: JSON.stringify({ userId: USER_ID }),
    headers: { cookie: "access_token=fake" },
    rawUrl: "http://localhost/.netlify/functions/admin-premium",
    path: "/.netlify/functions/admin-premium",
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

describe("admin-premium handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdmin).mockResolvedValue({ id: ADMIN_ID, role: "ADMIN" } as never);
  });

  // --- Auth ---

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

  it("returns 400 when userId is missing", async () => {
    const { statusCode, json } = await callHandler({ body: JSON.stringify({}) });
    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/userId/i);
  });

  // --- Grant ---

  it("grants premium successfully", async () => {
    vi.mocked(prisma.premiumSubscription.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.premiumSubscription.create).mockResolvedValue({ id: "sub-1" } as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(200);
    expect(json.message).toMatch(/granted/i);
    expect(prisma.premiumSubscription.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, grantedById: ADMIN_ID },
    });
  });

  it("returns 409 when user already has active premium", async () => {
    vi.mocked(prisma.premiumSubscription.findFirst).mockResolvedValue({ id: "sub-1" } as never);

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(409);
    expect(json.error).toMatch(/already/i);
  });

  // --- Revoke ---

  it("revokes premium successfully", async () => {
    vi.mocked(prisma.premiumSubscription.findFirst).mockResolvedValue({
      id: "sub-1",
      userId: USER_ID,
      revokedAt: null,
    } as never);
    vi.mocked(prisma.premiumSubscription.update).mockResolvedValue({} as never);

    const { statusCode, json } = await callHandler({ httpMethod: "DELETE" });
    expect(statusCode).toBe(200);
    expect(json.message).toMatch(/revoked/i);
    expect(prisma.premiumSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-1" },
        data: { revokedAt: expect.any(Date) },
      }),
    );
  });

  it("returns 404 when no active premium to revoke", async () => {
    vi.mocked(prisma.premiumSubscription.findFirst).mockResolvedValue(null);

    const { statusCode, json } = await callHandler({ httpMethod: "DELETE" });
    expect(statusCode).toBe(404);
    expect(json.error).toMatch(/no active/i);
  });

  it("returns 405 for unsupported methods", async () => {
    const res = await handler(makeEvent({ httpMethod: "GET" }), {} as HandlerContext);
    const response = res as HandlerResponse;
    expect(response.statusCode).toBe(405);
  });
});
