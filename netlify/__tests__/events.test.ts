import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    event: { findMany: vi.fn() },
  },
}));

vi.mock("../functions/lib/auth", () => ({
  verifyUser: vi.fn(),
}));

import { handler } from "../functions/events";
import { prisma } from "../functions/lib/prisma";
import { verifyUser } from "../functions/lib/auth";

type EventsFindManyArg = {
  where: {
    OR: [
      { status: { in: string[] } },
      { status: "SCHEDULED"; publishAt: { lte: Date } },
    ];
  };
};

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    httpMethod: "GET",
    body: null,
    headers: {},
    rawUrl: "http://localhost/.netlify/functions/events",
    path: "/.netlify/functions/events",
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

describe("events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
  });

  it("shows all SCHEDULED events to premium users immediately", async () => {
    vi.mocked(verifyUser).mockResolvedValue({
      id: "premium-user",
      role: "USER",
      premiumSubscriptions: [{ id: "sub-1", revokedAt: null }],
    } as never);

    const { statusCode } = await callHandler();

    expect(statusCode).toBe(200);
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ["PUBLISHED", "ARCHIVED", "SCHEDULED"] } },
      }),
    );
  });

  it("shows SCHEDULED events to regular/anonymous users only after publishAt", async () => {
    vi.mocked(verifyUser).mockRejectedValue(new Error("Unauthorized"));

    const { statusCode } = await callHandler();

    expect(statusCode).toBe(200);
    const callArgs = vi.mocked(prisma.event.findMany).mock.calls[0][0] as unknown as EventsFindManyArg;

    expect(callArgs.where.OR).toHaveLength(2);
    expect(callArgs.where.OR[0]).toEqual({ status: { in: ["PUBLISHED", "ARCHIVED"] } });
    expect(callArgs.where.OR[1].status).toBe("SCHEDULED");
    expect(callArgs.where.OR[1].publishAt.lte).toBeInstanceOf(Date);
  });
});
