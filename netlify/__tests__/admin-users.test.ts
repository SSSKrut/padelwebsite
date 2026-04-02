import { vi, describe, it, expect, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindMany: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  verifyAdmin: vi.fn(),
}));

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: mocks.userFindMany,
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
  },
}));

vi.mock("../functions/lib/auth", () => ({
  verifyAdmin: mocks.verifyAdmin,
}));

vi.mock("../functions/lib/email", () => ({
  sendEmail: vi.fn(),
}));

import { handler } from "../functions/admin-users";
import { sendEmail } from "../functions/lib/email";

function mockEvent(overrides: any = {}) {
  return {
    httpMethod: "GET",
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

describe("admin-users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyAdmin.mockResolvedValue({ id: "admin-1", role: "SUPER_ADMIN" });
  });

  it("should NOT include passwordHash in GET response", async () => {
    mocks.userFindMany.mockResolvedValue([
      {
        id: "u1",
        email: "test@example.com",
        passwordHash: "$2a$12$secrethashvalue",
        firstName: "Test",
        lastName: "User",
        role: "USER",
        elo: 1000,
        createdAt: new Date(),
        phone: null,
        achievements: [],
        premiumSubscriptions: [],
      },
    ]);

    const res = await handler(mockEvent(), {} as any);
    const users = JSON.parse(res!.body!);

    for (const u of users) {
      expect(u).not.toHaveProperty("passwordHash");
    }
  });

  it("should reject invalid role values on PATCH", async () => {
    mocks.userFindUnique.mockResolvedValue({ id: "target-1", role: "USER" });
    mocks.userUpdate.mockResolvedValue({ id: "target-1", role: "INVALID_ROLE" });

    const res = await handler(
      mockEvent({
        httpMethod: "PATCH",
        body: JSON.stringify({ userId: "target-1", role: "INVALID_ROLE" }),
      }),
      {} as any
    );

    expect(res!.statusCode).toBe(400);
  });

  it("sends approval email when user is verified", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "target-1",
      role: "UNVERIFIED_USER",
      firstName: "Test",
      email: "test@example.com",
    });
    mocks.userUpdate.mockResolvedValue({
      id: "target-1",
      role: "USER",
      firstName: "Test",
      email: "test@example.com",
      achievements: [],
    });

    const res = await handler(
      mockEvent({
        httpMethod: "PATCH",
        body: JSON.stringify({ userId: "target-1", role: "USER" }),
      }),
      {} as any,
    );

    expect(res!.statusCode).toBe(200);
    expect(sendEmail).toHaveBeenCalledWith({
      to: "test@example.com",
      template: "account-approved",
      data: {
        firstName: "Test",
        actionUrl: "http://localhost:8080/login",
      },
    });
  });
});
