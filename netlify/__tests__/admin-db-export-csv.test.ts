import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HandlerContext, HandlerEvent, HandlerResponse } from "@netlify/functions";

const mocks = vi.hoisted(() => ({
  eventFindUnique: vi.fn(),
  userFindMany: vi.fn(),
  verifyUser: vi.fn(),
}));

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    event: { findUnique: mocks.eventFindUnique },
    user: { findMany: mocks.userFindMany },
  },
}));

vi.mock("../functions/lib/auth", () => ({
  verifyUser: mocks.verifyUser,
}));

import { handler } from "../functions/admin-db-export-csv";

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    httpMethod: "GET",
    body: null,
    headers: {},
    rawUrl: "http://localhost/.netlify/functions/admin-db-export-csv",
    path: "/.netlify/functions/admin-db-export-csv",
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
  return res as HandlerResponse;
}

describe("admin-db-export-csv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
  });

  it("returns event CSV with expected header and rows", async () => {
    mocks.eventFindUnique.mockResolvedValue({
      id: "abcd1234-efgh-5678",
      title: "Spring Open 2026!",
      participants: [
        {
          user: {
            id: "u1",
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
            elo: 1200,
            premiumSubscriptions: [{ id: "sub-1" }],
          },
        },
        {
          user: {
            id: "u2",
            firstName: "Al \"Ice\"",
            lastName: "O,Connor",
            email: "al@example.com",
            elo: 900,
            premiumSubscriptions: [],
          },
        },
      ],
    });

    const res = await callHandler({
      queryStringParameters: { eventId: "abcd1234-efgh-5678" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers?.["Content-Type"]).toBe("text/csv; charset=utf-8");
    expect(res.headers?.["Content-Disposition"]).toBe(
      "attachment; filename=spring_open_2026_abcd1234.csv",
    );

    const lines = (res.body ?? "").split("\n");
    expect(lines[0]).toBe("user id,usr name,user surname,mail,is a premium user,elo");
    expect(lines[1]).toBe("\"u1\",\"Ada\",\"Lovelace\",\"ada@example.com\",\"true\",\"1200\"");
    expect(lines[2]).toBe("\"u2\",\"Al \"\"Ice\"\"\",\"O,Connor\",\"al@example.com\",\"false\",\"900\"");
  });

  it("returns users CSV with expected header and rows", async () => {
    mocks.userFindMany.mockResolvedValue([
      {
        id: "u1",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        elo: 1200,
        premiumSubscriptions: [{ id: "sub-1" }],
      },
      {
        id: "u2",
        firstName: "Grace",
        lastName: "Hopper",
        email: "grace@example.com",
        elo: 1350,
        premiumSubscriptions: [],
      },
    ]);

    const res = await callHandler();

    expect(res.statusCode).toBe(200);
    expect(res.headers?.["Content-Type"]).toBe("text/csv; charset=utf-8");
    expect(res.headers?.["Content-Disposition"]).toMatch(
      /^attachment; filename=users_dump_.*\.csv$/,
    );

    const lines = (res.body ?? "").split("\n");
    expect(lines[0]).toBe("user id,usr name,user surname,mail,is a premium user,elo");
    expect(lines[1]).toBe("\"u1\",\"Ada\",\"Lovelace\",\"ada@example.com\",\"true\",\"1200\"");
    expect(lines[2]).toBe("\"u2\",\"Grace\",\"Hopper\",\"grace@example.com\",\"false\",\"1350\"");
  });

  it("blocks non-admin users", async () => {
    mocks.verifyUser.mockResolvedValue({ id: "user-1", role: "USER" });

    const res = await callHandler();

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body ?? "{}")).toEqual({
      error: "Forbidden. Admin access required.",
    });
  });
});
