import { vi, describe, it, expect, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  eventCreate: vi.fn(),
  eventUpdate: vi.fn(),
  eventFindUnique: vi.fn(),
  eventFormatFindUnique: vi.fn(),
  verifyAdmin: vi.fn(),
}));

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    event: {
      create: mocks.eventCreate,
      update: mocks.eventUpdate,
      findUnique: mocks.eventFindUnique,
    },
    eventFormat: {
      findUnique: mocks.eventFormatFindUnique,
    },
  },
}));

vi.mock("../functions/lib/auth", () => ({
  verifyAdmin: mocks.verifyAdmin,
}));

import { handler } from "../functions/admin-events";

function mockEvent(overrides: any = {}) {
  return {
    httpMethod: "POST",
    headers: { cookie: "access_token=test" },
    body: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    path: "/",
    isBase64Encoded: false,
    rawUrl: "http://localhost/",
    rawQuery: "",
    multiValueHeaders: {},
    ...overrides,
  };
}

describe("admin-events validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyAdmin.mockResolvedValue({ id: "admin-1", role: "SUPER_ADMIN" });
  });

  it("should reject non-numeric maxParticipants on POST", async () => {
    mocks.eventCreate.mockResolvedValue({ id: "event-1" });

    const res = await handler(
      mockEvent({
        body: JSON.stringify({ title: "Test Event", date: "2026-06-01", maxParticipants: "abc" }),
      }),
      {} as any
    );

    expect(res!.statusCode).toBe(400);
  });

  it("should reject invalid formatId on POST", async () => {
    mocks.eventFormatFindUnique.mockResolvedValue(null);

    const res = await handler(
      mockEvent({
        body: JSON.stringify({
          title: "Test Event",
          date: "2026-06-01",
          formatId: "bad-format-id",
        }),
      }),
      {} as any
    );

    expect(res!.statusCode).toBe(400);
    expect(JSON.parse(res!.body ?? "{}").error).toMatch(/invalid formatId/i);
    expect(mocks.eventCreate).not.toHaveBeenCalled();
  });

  it("should apply format config when formatId is provided", async () => {
    mocks.eventFormatFindUnique.mockResolvedValue({
      config: { playersPerCourt: 5, rounds: 5 },
    });
    mocks.eventCreate.mockResolvedValue({ id: "event-1" });

    const res = await handler(
      mockEvent({
        body: JSON.stringify({
          title: "Test Event",
          date: "2026-06-01",
          formatId: "format-1",
        }),
      }),
      {} as any
    );

    expect(res!.statusCode).toBe(201);
    expect(mocks.eventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          formatId: "format-1",
          formatConfig: { playersPerCourt: 5, rounds: 5 },
        }),
      }),
    );
  });

  it("should reject non-numeric maxParticipants on PATCH", async () => {
    mocks.eventUpdate.mockResolvedValue({ id: "event-1" });

    const res = await handler(
      mockEvent({
        httpMethod: "PATCH",
        body: JSON.stringify({ id: "event-1", maxParticipants: "not-a-number" }),
      }),
      {} as any
    );

    expect(res!.statusCode).toBe(400);
  });
});
