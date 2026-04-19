import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";

const mocks = vi.hoisted(() => ({
  verifyUser: vi.fn(),
  eventFindUnique: vi.fn(),
  eventRegistrationFindMany: vi.fn(),
  eventMatchCreate: vi.fn(),
  eventMatchUpdate: vi.fn(),
  eventMatchDelete: vi.fn(),
}));

vi.mock("../functions/lib/auth", () => ({
  verifyUser: mocks.verifyUser,
}));

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    event: {
      findUnique: mocks.eventFindUnique,
    },
    eventRegistration: {
      findMany: mocks.eventRegistrationFindMany,
    },
    eventMatch: {
      create: mocks.eventMatchCreate,
      update: mocks.eventMatchUpdate,
      delete: mocks.eventMatchDelete,
    },
  },
}));

import { handler } from "../functions/admin-event-matches";
import { prisma } from "../functions/lib/prisma";
import { verifyUser } from "../functions/lib/auth";

const EVENT_ID = "123e4567-e89b-12d3-a456-426614174000";
const PLAYER_IDS = [
  "11111111-2222-3333-4444-555555555555",
  "11111111-2222-3333-4444-555555555556",
  "11111111-2222-3333-4444-555555555557",
  "11111111-2222-3333-4444-555555555558",
];

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    httpMethod: "POST",
    body: null,
    headers: { cookie: "access_token=fake" },
    rawUrl: "http://localhost/.netlify/functions/admin-event-matches",
    path: "/.netlify/functions/admin-event-matches",
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

describe("admin-event-matches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyUser).mockResolvedValue({ id: "admin-1", role: "ADMIN" } as never);
  });

  it("creates a custom match", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      matchTableStatus: "OPEN",
      matchTableMode: "AUTO_COURTS",
      formatConfig: { pairingStrategy: "CUSTOM" },
      format: null,
    } as never);
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue(
      PLAYER_IDS.map((id) => ({ userId: id })) as never,
    );
    vi.mocked(prisma.eventMatch.create).mockResolvedValue({ id: "match-1" } as never);

    const { statusCode } = await callHandler({
      httpMethod: "POST",
      body: JSON.stringify({
        eventId: EVENT_ID,
        courtNumber: 1,
        round: 1,
        pair1Player1Id: PLAYER_IDS[0],
        pair1Player2Id: PLAYER_IDS[1],
        pair2Player1Id: PLAYER_IDS[2],
        pair2Player2Id: PLAYER_IDS[3],
      }),
    });

    expect(statusCode).toBe(200);
    expect(prisma.eventMatch.create).toHaveBeenCalled();
  });

  it("rejects duplicate players", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      matchTableStatus: "OPEN",
      matchTableMode: "AUTO_COURTS",
      formatConfig: { pairingStrategy: "CUSTOM" },
      format: null,
    } as never);
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue(
      PLAYER_IDS.map((id) => ({ userId: id })) as never,
    );

    const { statusCode, json } = await callHandler({
      httpMethod: "POST",
      body: JSON.stringify({
        eventId: EVENT_ID,
        courtNumber: 1,
        round: 1,
        pair1Player1Id: PLAYER_IDS[0],
        pair1Player2Id: PLAYER_IDS[0],
        pair2Player1Id: PLAYER_IDS[2],
        pair2Player2Id: PLAYER_IDS[3],
      }),
    });

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/duplicate/i);
  });

  it("allows custom matches for any format", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      matchTableStatus: "OPEN",
    } as never);
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue(
      PLAYER_IDS.map((id) => ({ userId: id })) as never,
    );
    vi.mocked(prisma.eventMatch.create).mockResolvedValue({ id: "match-1" } as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "POST",
      body: JSON.stringify({
        eventId: EVENT_ID,
        courtNumber: 1,
        round: 1,
        pair1Player1Id: PLAYER_IDS[0],
        pair1Player2Id: PLAYER_IDS[1],
        pair2Player1Id: PLAYER_IDS[2],
        pair2Player2Id: PLAYER_IDS[3],
      }),
    });

    expect(statusCode).toBe(200);
    expect(json).toHaveProperty("id");
  });

  it("resets scores when updating players or court", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      matchTableStatus: "OPEN",
      matchTableMode: "AUTO_COURTS",
      formatConfig: { pairingStrategy: "CUSTOM" },
      format: null,
    } as never);
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue(
      PLAYER_IDS.map((id) => ({ userId: id })) as never,
    );
    vi.mocked(prisma.eventMatch.update).mockResolvedValue({ id: "match-1" } as never);

    const { statusCode } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({
        eventId: EVENT_ID,
        matchId: "123e4567-e89b-12d3-a456-426614174999",
        courtNumber: 2,
        pair1Player1Id: PLAYER_IDS[0],
        pair1Player2Id: PLAYER_IDS[1],
        pair2Player1Id: PLAYER_IDS[2],
        pair2Player2Id: PLAYER_IDS[3],
      }),
    });

    expect(statusCode).toBe(200);
    const updateData = vi.mocked(prisma.eventMatch.update).mock.calls[0][0].data as Record<string, unknown>;
    expect(updateData.score1).toBeNull();
    expect(updateData.score2).toBeNull();
  });

  it("does not reset scores when only status changes", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      matchTableStatus: "OPEN",
      matchTableMode: "AUTO_COURTS",
      formatConfig: { pairingStrategy: "CUSTOM" },
      format: null,
    } as never);
    vi.mocked(prisma.eventMatch.update).mockResolvedValue({ id: "match-1" } as never);

    const { statusCode } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({
        eventId: EVENT_ID,
        matchId: "123e4567-e89b-12d3-a456-426614174999",
        status: "IN_PROGRESS",
      }),
    });

    expect(statusCode).toBe(200);
    const updateData = vi.mocked(prisma.eventMatch.update).mock.calls[0][0].data as Record<string, unknown>;
    expect(updateData.status).toBe("IN_PROGRESS");
    expect(updateData).not.toHaveProperty("score1");
    expect(updateData).not.toHaveProperty("score2");
  });

  it("rejects updates when match table is not open", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      matchTableStatus: "CONFIRMED",
      matchTableMode: "AUTO_COURTS",
      formatConfig: { pairingStrategy: "CUSTOM" },
      format: null,
    } as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({
        eventId: EVENT_ID,
        matchId: "123e4567-e89b-12d3-a456-426614174999",
        status: "IN_PROGRESS",
      }),
    });

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/not open/i);
  });

  it("rejects deletes when match table is not open", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ matchTableStatus: "CONFIRMED" } as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "DELETE",
      body: JSON.stringify({
        eventId: EVENT_ID,
        matchId: "123e4567-e89b-12d3-a456-426614174999",
      }),
    });

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/not open/i);
  });
});
