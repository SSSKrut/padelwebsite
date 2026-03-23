import { vi, describe, it, expect, beforeEach } from "vitest";

const UUID = "550e8400-e29b-41d4-a716-446655440000";

const mocks = vi.hoisted(() => ({
  eventFindUnique: vi.fn(),
  regFindFirst: vi.fn(),
  regCreate: vi.fn(),
  regCount: vi.fn(),
  regDelete: vi.fn(),
  $transaction: vi.fn(),
  verifyUser: vi.fn(),
  isUserPremium: vi.fn(),
}));

vi.mock("./lib/prisma", () => ({
  prisma: {
    event: { findUnique: mocks.eventFindUnique },
    eventRegistration: {
      findFirst: mocks.regFindFirst,
      create: mocks.regCreate,
      count: mocks.regCount,
      delete: mocks.regDelete,
    },
    $transaction: mocks.$transaction,
  },
}));

vi.mock("./lib/auth", () => ({
  verifyUser: mocks.verifyUser,
}));

vi.mock("./lib/premium", () => ({
  isUserPremium: mocks.isUserPremium,
}));

import { handler } from "./event-register";

function mockEvent(overrides: any = {}) {
  return {
    httpMethod: "POST",
    headers: { cookie: "access_token=test" },
    body: JSON.stringify({ eventId: UUID }),
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

describe("event-register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyUser.mockResolvedValue({ id: "user-1", role: "USER" });

    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    mocks.eventFindUnique.mockResolvedValue({
      id: UUID,
      status: "PUBLISHED",
      date: futureDate,
      maxParticipants: 16,
      _count: { participants: 10 },
    });

    mocks.regFindFirst.mockResolvedValue(null);
    mocks.regCreate.mockResolvedValue({ id: "reg-1" });
    mocks.regCount.mockResolvedValue(10);

    mocks.$transaction.mockImplementation(async (fn) =>
      fn({
        eventRegistration: {
          findFirst: mocks.regFindFirst,
          create: mocks.regCreate,
          count: mocks.regCount,
          delete: mocks.regDelete,
        },
      })
    );
  });

  it("should use a database transaction for registration to prevent race conditions", async () => {
    await handler(mockEvent(), {} as any);
    expect(mocks.$transaction).toHaveBeenCalled();
  });
});
