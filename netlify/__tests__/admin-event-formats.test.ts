import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";

const mocks = vi.hoisted(() => ({
  verifyUser: vi.fn(),
  eventFormatFindMany: vi.fn(),
  eventFormatFindFirst: vi.fn(),
  eventFormatCreate: vi.fn(),
  eventFormatUpdate: vi.fn(),
  eventFormatDelete: vi.fn(),
}));

vi.mock("../functions/lib/auth", () => ({
  verifyUser: mocks.verifyUser,
}));

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    eventFormat: {
      findMany: mocks.eventFormatFindMany,
      findFirst: mocks.eventFormatFindFirst,
      create: mocks.eventFormatCreate,
      update: mocks.eventFormatUpdate,
      delete: mocks.eventFormatDelete,
    },
  },
}));

import { handler } from "../functions/admin-event-formats";
import { prisma } from "../functions/lib/prisma";
import { verifyUser } from "../functions/lib/auth";

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    httpMethod: "GET",
    body: null,
    headers: { cookie: "access_token=fake" },
    rawUrl: "http://localhost/.netlify/functions/admin-event-formats",
    path: "/.netlify/functions/admin-event-formats",
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

describe("admin-event-formats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyUser).mockResolvedValue({ id: "admin-1", role: "ADMIN" } as never);
  });

  it("lists formats", async () => {
    vi.mocked(prisma.eventFormat.findMany).mockResolvedValue([
      { id: "format-1", name: "Format One", strategyKey: "KOTC" },
    ] as never);

    const { statusCode, json } = await callHandler();

    expect(statusCode).toBe(200);
    expect(json).toHaveLength(1);
  });

  it("creates format", async () => {
    vi.mocked(prisma.eventFormat.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.eventFormat.create).mockResolvedValue({ id: "format-1" } as never);

    const { statusCode } = await callHandler({
      httpMethod: "POST",
      body: JSON.stringify({
        name: "King of the Court",
        strategyKey: "KOTC_5P",
        config: { playersPerCourt: 5 },
      }),
    });

    expect(statusCode).toBe(200);
    expect(prisma.eventFormat.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "King of the Court",
          strategyKey: "KOTC_5P",
        }),
      }),
    );
  });

  it("rejects duplicate strategyKey on create", async () => {
    vi.mocked(prisma.eventFormat.findFirst).mockResolvedValue({ id: "format-1" } as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "POST",
      body: JSON.stringify({
        name: "King of the Court",
        strategyKey: "KOTC_5P",
      }),
    });

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/strategyKey/i);
  });

  it("rejects duplicate strategyKey on update", async () => {
    vi.mocked(prisma.eventFormat.findFirst).mockResolvedValue({ id: "format-2" } as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({
        id: "11111111-2222-3333-4444-555555555555",
        name: "King of the Court",
        strategyKey: "KOTC_5P",
      }),
    });

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/strategyKey/i);
    expect(prisma.eventFormat.update).not.toHaveBeenCalled();
  });

  it("updates format", async () => {
    vi.mocked(prisma.eventFormat.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.eventFormat.update).mockResolvedValue({ id: "format-1" } as never);

    const { statusCode } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({
        id: "11111111-2222-3333-4444-555555555555",
        name: "Updated Format",
      }),
    });

    expect(statusCode).toBe(200);
    expect(prisma.eventFormat.update).toHaveBeenCalled();
  });

  it("deletes format", async () => {
    vi.mocked(prisma.eventFormat.delete).mockResolvedValue({ id: "format-1" } as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "DELETE",
      body: JSON.stringify({ id: "11111111-2222-3333-4444-555555555555" }),
    });

    expect(statusCode).toBe(200);
    expect(json.success).toBe(true);
  });

  it("rejects invalid JSON", async () => {
    const { statusCode, json } = await callHandler({
      httpMethod: "POST",
      body: "{bad-json}",
    });

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/invalid json/i);
  });
});
