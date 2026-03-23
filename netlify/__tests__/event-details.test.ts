import { vi, describe, it, expect, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  eventFindUnique: vi.fn(),
  verifyUser: vi.fn(),
  publicName: vi.fn((f: string, l: string) => `${f} ${l.charAt(0)}.`),
}));

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    event: { findUnique: mocks.eventFindUnique },
  },
}));

vi.mock("../functions/lib/auth", () => ({
  verifyUser: mocks.verifyUser,
}));

vi.mock("../functions/lib/sanitize", () => ({
  publicName: mocks.publicName,
}));

import { handler } from "../functions/event-details";

function mockEvent(overrides: any = {}) {
  return {
    httpMethod: "GET",
    headers: {},
    body: null,
    queryStringParameters: { id: "event-1" },
    multiValueQueryStringParameters: null,
    path: "/",
    isBase64Encoded: false,
    rawUrl: "http://localhost/",
    rawQuery: "",
    multiValueHeaders: {},
    ...overrides,
  };
}

describe("event-details", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should NOT show SCHEDULED events to premium users if publishAt is more than 24h away", async () => {
    const farFuturePublishAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    mocks.eventFindUnique.mockResolvedValue({
      id: "event-1",
      status: "SCHEDULED",
      publishAt: farFuturePublishAt,
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      participants: [],
    });

    mocks.verifyUser.mockResolvedValue({
      id: "user-1",
      role: "USER",
      premiumSubscriptions: [{ id: "sub-1", revokedAt: null }],
    });

    const res = await handler(mockEvent(), {} as any);
    expect(res!.statusCode).toBe(404);
  });
});
