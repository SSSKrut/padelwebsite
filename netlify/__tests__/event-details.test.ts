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

async function callHandler(overrides: any = {}) {
  const res = await handler(mockEvent(overrides), {} as any);
  return {
    statusCode: res?.statusCode,
    json: JSON.parse(res?.body ?? "{}"),
  };
}

describe("event-details", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows SCHEDULED events to premium users immediately, even if publishAt is far away", async () => {
    const farFuturePublishAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    mocks.eventFindUnique.mockResolvedValue({
      id: "event-1",
      status: "SCHEDULED",
      publishAt: farFuturePublishAt,
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      participants: [],
      waitlist: [],
    });

    mocks.verifyUser.mockResolvedValue({
      id: "user-1",
      role: "USER",
      premiumSubscriptions: [{ id: "sub-1", revokedAt: null }],
    });

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(200);
    expect(json.status).toBe("SCHEDULED");
  });

  it("hides SCHEDULED events from regular users before publishAt", async () => {
    const futurePublishAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    mocks.eventFindUnique.mockResolvedValue({
      id: "event-1",
      status: "SCHEDULED",
      publishAt: futurePublishAt,
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      participants: [],
      waitlist: [],
    });

    mocks.verifyUser.mockResolvedValue({
      id: "user-2",
      role: "USER",
      premiumSubscriptions: [],
    });

    const { statusCode } = await callHandler();
    expect(statusCode).toBe(404);
  });

  it("shows SCHEDULED events to regular users after publishAt", async () => {
    const pastPublishAt = new Date(Date.now() - 2 * 60 * 60 * 1000);

    mocks.eventFindUnique.mockResolvedValue({
      id: "event-1",
      status: "SCHEDULED",
      publishAt: pastPublishAt,
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      participants: [],
      waitlist: [],
    });

    mocks.verifyUser.mockResolvedValue({
      id: "user-2",
      role: "USER",
      premiumSubscriptions: [],
    });

    const { statusCode, json } = await callHandler();
    expect(statusCode).toBe(200);
    expect(json.status).toBe("SCHEDULED");
  });

  it("orders admin waitlist with premium users first and preserves queue order in each group", async () => {
    const now = new Date();

    mocks.eventFindUnique.mockResolvedValue({
      id: "event-1",
      status: "PUBLISHED",
      publishAt: null,
      date: new Date(now.getTime() + 72 * 60 * 60 * 1000),
      participants: [],
      waitlist: [
        {
          id: "wl-regular",
          createdAt: new Date(now.getTime() - 20_000),
          user: {
            id: "regular-user",
            firstName: "Regular",
            lastName: "Player",
            elo: 800,
            premiumSubscriptions: [],
          },
        },
        {
          id: "wl-premium",
          createdAt: new Date(now.getTime() - 10_000),
          user: {
            id: "premium-user",
            firstName: "Premium",
            lastName: "Player",
            elo: 900,
            premiumSubscriptions: [{ id: "sub-1" }],
          },
        },
      ],
    });

    mocks.verifyUser.mockResolvedValue({
      id: "premium-user",
      role: "ADMIN",
      premiumSubscriptions: [{ id: "sub-admin", revokedAt: null }],
    });

    const { statusCode, json } = await callHandler();

    expect(statusCode).toBe(200);
    expect(json.waitlistCount).toBe(2);
    expect(json.waitlist[0].user.id).toBe("premium-user");
    expect(json.waitlist[1].user.id).toBe("regular-user");
    expect(json.currentUserWaitlistPosition).toBe(1);
    expect(json.currentUserWaitlistAhead).toBe(0);
    expect(json.waitlist[0].user.premiumSubscriptions).toBeUndefined();
  });
});
