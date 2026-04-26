import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";

const mocks = vi.hoisted(() => ({
  verifyUser: vi.fn(),
  eventFindUnique: vi.fn(),
  eventUpdate: vi.fn(),
  eventRegistrationFindMany: vi.fn(),
  eventCourtAssignmentFindMany: vi.fn(),
  eventCourtAssignmentDeleteMany: vi.fn(),
  eventCourtAssignmentCreateMany: vi.fn(),
  eventMatchFindMany: vi.fn(),
  eventMatchDeleteMany: vi.fn(),
  eventMatchCreateMany: vi.fn(),
  eventManualEloFindMany: vi.fn(),
  eventManualEloDeleteMany: vi.fn(),
  transaction: vi.fn(),
  userFindMany: vi.fn(),
  userUpdate: vi.fn(),
  eventScoreFindMany: vi.fn(),
  eventScoreFindFirst: vi.fn(),
  eventScoreDeleteMany: vi.fn(),
  eventScoreUpsert: vi.fn(),
  userRatingSettingsFindMany: vi.fn(),
  eventCourtOverrideFindMany: vi.fn(),
  loadMatchTable: vi.fn(),
}));

vi.mock("../functions/lib/auth", () => ({
  verifyUser: mocks.verifyUser,
}));

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    event: { findUnique: mocks.eventFindUnique, update: mocks.eventUpdate },
    eventRegistration: { findMany: mocks.eventRegistrationFindMany },
    eventCourtAssignment: {
      findMany: mocks.eventCourtAssignmentFindMany,
      deleteMany: mocks.eventCourtAssignmentDeleteMany,
      createMany: mocks.eventCourtAssignmentCreateMany,
    },
    eventMatch: {
      findMany: mocks.eventMatchFindMany,
      deleteMany: mocks.eventMatchDeleteMany,
      createMany: mocks.eventMatchCreateMany,
    },
    eventManualElo: {
      findMany: mocks.eventManualEloFindMany,
      deleteMany: mocks.eventManualEloDeleteMany,
    },
    user: { findMany: mocks.userFindMany, update: mocks.userUpdate },
    eventScore: {
      findMany: mocks.eventScoreFindMany,
      findFirst: mocks.eventScoreFindFirst,
      deleteMany: mocks.eventScoreDeleteMany,
      upsert: mocks.eventScoreUpsert,
    },
    eventCourtOverride: {
      findMany: mocks.eventCourtOverrideFindMany,
    },
    userRatingSettings: {
      findMany: mocks.userRatingSettingsFindMany,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("../functions/lib/matchTable", async () => {
  const actual = await vi.importActual<typeof import("../functions/lib/matchTable")>(
    "../functions/lib/matchTable",
  );
  return {
    ...actual,
    loadMatchTable: mocks.loadMatchTable,
  };
});

import { handler } from "../functions/admin-event-match-table";
import { prisma } from "../functions/lib/prisma";
import { verifyUser } from "../functions/lib/auth";
import { loadMatchTable } from "../functions/lib/matchTable";

type TransactionCallback = Parameters<typeof prisma.$transaction>[0];
type TransactionClient = Parameters<TransactionCallback>[0];

const EVENT_ID = "123e4567-e89b-12d3-a456-426614174000";
const PLAYER_IDS = [
  "11111111-2222-3333-4444-555555555555",
  "11111111-2222-3333-4444-555555555556",
  "11111111-2222-3333-4444-555555555557",
  "11111111-2222-3333-4444-555555555558",
  "11111111-2222-3333-4444-555555555559",
];

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    httpMethod: "POST",
    body: JSON.stringify({ eventId: EVENT_ID }),
    headers: { cookie: "access_token=fake" },
    rawUrl: "http://localhost/.netlify/functions/admin-event-match-table",
    path: "/.netlify/functions/admin-event-match-table",
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

describe("admin-event-match-table", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyUser).mockResolvedValue({ id: "admin-1", role: "ADMIN" } as never);
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      id: EVENT_ID,
      matchTableStatus: "DRAFT",
      matchTableConfirmedAt: null,
    } as never);
    vi.mocked(prisma.eventScore.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.eventScore.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.eventScore.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.userRatingSettings.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.eventCourtOverride.findMany).mockResolvedValue([] as never);
    const transactionClient = {
      eventMatch: {
        deleteMany: mocks.eventMatchDeleteMany,
        createMany: mocks.eventMatchCreateMany,
      },
      eventCourtAssignment: {
        deleteMany: mocks.eventCourtAssignmentDeleteMany,
        createMany: mocks.eventCourtAssignmentCreateMany,
      },
      eventManualElo: {
        deleteMany: mocks.eventManualEloDeleteMany,
      },
      event: { update: mocks.eventUpdate },
      user: { update: mocks.userUpdate },
      eventScore: {
        deleteMany: mocks.eventScoreDeleteMany,
        upsert: mocks.eventScoreUpsert,
      },
    } as unknown as TransactionClient;
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: TransactionCallback) => fn(transactionClient));
    vi.mocked(loadMatchTable).mockResolvedValue({
      eventId: EVENT_ID,
      status: "OPEN",
      generatedAt: null,
      confirmedAt: null,
      courts: [],
      matches: [],
    } as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(verifyUser).mockRejectedValue(new Error("Unauthorized"));

    const { statusCode } = await callHandler();
    expect(statusCode).toBe(401);
  });

  it("returns 404 when event does not exist", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

    const { statusCode, json } = await callHandler();

    expect(statusCode).toBe(404);
    expect(json.error).toMatch(/event not found/i);
  });

  it("returns 400 when event has no participants", async () => {
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue([] as never);

    const { statusCode, json } = await callHandler();

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/no participants/i);
  });

  it("clears manual ELO entries when regenerating", async () => {
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue(
      PLAYER_IDS.map((id, index) => ({ user: { id, elo: 1000 + index * 10 } })) as never,
    );

    const { statusCode } = await callHandler();

    expect(statusCode).toBe(200);
    expect(prisma.eventMatch.deleteMany).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
    expect(prisma.eventCourtAssignment.deleteMany).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
    expect(prisma.eventManualElo.deleteMany).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
  });

  it("returns 400 when assignments miss participants", async () => {
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue([
      { userId: PLAYER_IDS[0] },
      { userId: PLAYER_IDS[1] },
    ] as never);
    const { statusCode, json } = await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({
        eventId: EVENT_ID,
        assignments: [{ userId: PLAYER_IDS[0], courtNumber: 1 }],
      }),
    });

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/missing participants/i);
  });

  it("allows regeneration even when later events updated ELO", async () => {
    const confirmedAt = new Date("2026-04-06T10:00:00.000Z");
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      id: EVENT_ID,
      matchTableStatus: "CONFIRMED",
      matchTableConfirmedAt: confirmedAt,
    } as never);
    vi.mocked(prisma.eventScore.findMany).mockResolvedValue([
      { userId: PLAYER_IDS[0], previousElo: 900 },
    ] as never);
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue(
      PLAYER_IDS.map((id, index) => ({ user: { id, elo: 1000 + index * 10 } })) as never,
    );

    const { statusCode } = await callHandler();

    expect(statusCode).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: PLAYER_IDS[0] },
      data: { elo: 900 },
    });
    expect(prisma.eventScore.deleteMany).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
  });

  it("rolls back ELO when confirmed and no later events exist", async () => {
    const confirmedAt = new Date("2026-04-06T10:00:00.000Z");
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      id: EVENT_ID,
      matchTableStatus: "CONFIRMED",
      matchTableConfirmedAt: confirmedAt,
    } as never);
    vi.mocked(prisma.eventScore.findMany).mockResolvedValue([
      { userId: PLAYER_IDS[0], previousElo: 900 },
    ] as never);
    vi.mocked(prisma.eventScore.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue(
      PLAYER_IDS.map((id, index) => ({ user: { id, elo: 1000 + index * 10 } })) as never,
    );

    const { statusCode } = await callHandler();

    expect(statusCode).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: PLAYER_IDS[0] },
      data: { elo: 900 },
    });
    expect(prisma.eventScore.deleteMany).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
  });

  it("rejects confirmations when match table is not open", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "CONFIRMED" } as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PUT",
      body: JSON.stringify({ eventId: EVENT_ID }),
    });

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/not open/i);
  });

  it("rejects confirmations when scores are missing", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "OPEN" } as never);
    vi.mocked(prisma.eventCourtAssignment.findMany).mockResolvedValueOnce([
      { userId: PLAYER_IDS[0], courtNumber: 1 },
      { userId: PLAYER_IDS[1], courtNumber: 1 },
      { userId: PLAYER_IDS[2], courtNumber: 1 },
      { userId: PLAYER_IDS[3], courtNumber: 1 },
      { userId: PLAYER_IDS[4], courtNumber: 1 },
    ] as never);
    vi.mocked(prisma.eventMatch.findMany).mockResolvedValueOnce([
      {
        id: "match-1",
        courtNumber: 1,
        round: 1,
        status: "COMPLETED",
        pair1Player1Id: PLAYER_IDS[0],
        pair1Player2Id: PLAYER_IDS[1],
        pair2Player1Id: PLAYER_IDS[2],
        pair2Player2Id: PLAYER_IDS[3],
        score1: null,
        score2: 4,
      },
    ] as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PUT",
      body: JSON.stringify({ eventId: EVENT_ID }),
    });

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/scores must be filled/i);
  });

  it("rejects confirmations when manual ELO values are missing", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "OPEN" } as never);
    vi.mocked(prisma.eventCourtAssignment.findMany).mockResolvedValueOnce([
      { userId: PLAYER_IDS[0], courtNumber: 1 },
      { userId: PLAYER_IDS[1], courtNumber: 1 },
      { userId: PLAYER_IDS[2], courtNumber: 1 },
      { userId: PLAYER_IDS[3], courtNumber: 1 },
    ] as never);
    vi.mocked(prisma.eventMatch.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.eventManualElo.findMany).mockResolvedValueOnce([] as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PUT",
      body: JSON.stringify({ eventId: EVENT_ID }),
    });

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/manual elo is required/i);
  });

  it("allows short courts when scored matches exist", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "OPEN" } as never);
    vi.mocked(prisma.eventCourtAssignment.findMany).mockResolvedValueOnce([
      { userId: PLAYER_IDS[0], courtNumber: 1 },
      { userId: PLAYER_IDS[1], courtNumber: 1 },
      { userId: PLAYER_IDS[2], courtNumber: 1 },
      { userId: PLAYER_IDS[3], courtNumber: 1 },
    ] as never);
    vi.mocked(prisma.eventMatch.findMany).mockResolvedValueOnce([
      {
        id: "match-1",
        courtNumber: 1,
        round: 1,
        status: "COMPLETED",
        pair1Player1Id: PLAYER_IDS[0],
        pair1Player2Id: PLAYER_IDS[1],
        pair2Player1Id: PLAYER_IDS[2],
        pair2Player2Id: PLAYER_IDS[3],
        score1: 6,
        score2: 4,
      },
    ] as never);
    vi.mocked(prisma.eventManualElo.findMany).mockResolvedValueOnce([] as never);

    vi.mocked(prisma.user.findMany)
      .mockResolvedValueOnce([
        { id: PLAYER_IDS[0], elo: 1000 },
        { id: PLAYER_IDS[1], elo: 1000 },
        { id: PLAYER_IDS[2], elo: 1000 },
        { id: PLAYER_IDS[3], elo: 1000 },
      ] as never)
      .mockResolvedValueOnce([] as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PUT",
      body: JSON.stringify({ eventId: EVENT_ID }),
    });

    expect(statusCode).toBe(200);
    expect(json.status).toBe("CONFIRMED");
  });

  it("prefers manual overrides over match-based updates", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "OPEN" } as never);
    vi.mocked(prisma.eventCourtAssignment.findMany).mockResolvedValueOnce([
      { userId: PLAYER_IDS[0], courtNumber: 1 },
      { userId: PLAYER_IDS[1], courtNumber: 1 },
      { userId: PLAYER_IDS[2], courtNumber: 1 },
      { userId: PLAYER_IDS[3], courtNumber: 1 },
      { userId: PLAYER_IDS[4], courtNumber: 1 },
    ] as never);
    vi.mocked(prisma.eventMatch.findMany).mockResolvedValueOnce([
      {
        id: "match-1",
        courtNumber: 1,
        round: 1,
        status: "COMPLETED",
        pair1Player1Id: PLAYER_IDS[0],
        pair1Player2Id: PLAYER_IDS[1],
        pair2Player1Id: PLAYER_IDS[2],
        pair2Player2Id: PLAYER_IDS[3],
        score1: 6,
        score2: 4,
      },
    ] as never);
    vi.mocked(prisma.eventManualElo.findMany).mockResolvedValueOnce([
      { userId: PLAYER_IDS[0], newElo: 1400 },
    ] as never);

    vi.mocked(prisma.user.findMany)
      .mockResolvedValueOnce([
        { id: PLAYER_IDS[0], elo: 1000 },
        { id: PLAYER_IDS[1], elo: 1000 },
        { id: PLAYER_IDS[2], elo: 1000 },
        { id: PLAYER_IDS[3], elo: 1000 },
      ] as never)
      .mockResolvedValueOnce([
        { id: PLAYER_IDS[0], elo: 1000 },
      ] as never);

    const { statusCode } = await callHandler({
      httpMethod: "PUT",
      body: JSON.stringify({ eventId: EVENT_ID }),
    });

    expect(statusCode).toBe(200);
    const manualUpdate = vi.mocked(prisma.user.update).mock.calls.find(
      ([args]) => (args as any).where?.id === PLAYER_IDS[0],
    );
    expect(manualUpdate?.[0].data).toEqual({ elo: 1400 });
  });

  it("uses match scores when manual value is unchanged", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "OPEN" } as never);
    vi.mocked(prisma.eventCourtAssignment.findMany).mockResolvedValueOnce([
      { userId: PLAYER_IDS[0], courtNumber: 1 },
      { userId: PLAYER_IDS[1], courtNumber: 1 },
      { userId: PLAYER_IDS[2], courtNumber: 1 },
      { userId: PLAYER_IDS[3], courtNumber: 1 },
      { userId: PLAYER_IDS[4], courtNumber: 1 },
    ] as never);
    vi.mocked(prisma.eventMatch.findMany).mockResolvedValueOnce([
      {
        id: "match-1",
        courtNumber: 1,
        round: 1,
        status: "COMPLETED",
        pair1Player1Id: PLAYER_IDS[0],
        pair1Player2Id: PLAYER_IDS[1],
        pair2Player1Id: PLAYER_IDS[2],
        pair2Player2Id: PLAYER_IDS[3],
        score1: 6,
        score2: 4,
      },
    ] as never);
    vi.mocked(prisma.eventManualElo.findMany).mockResolvedValueOnce([
      { userId: PLAYER_IDS[0], newElo: 1000 },
    ] as never);

    vi.mocked(prisma.user.findMany)
      .mockResolvedValueOnce([
        { id: PLAYER_IDS[0], elo: 1000 },
        { id: PLAYER_IDS[1], elo: 1000 },
        { id: PLAYER_IDS[2], elo: 1000 },
        { id: PLAYER_IDS[3], elo: 1000 },
      ] as never)
      .mockResolvedValueOnce([
        { id: PLAYER_IDS[0], elo: 1000 },
      ] as never);

    const { statusCode } = await callHandler({
      httpMethod: "PUT",
      body: JSON.stringify({ eventId: EVENT_ID }),
    });

    expect(statusCode).toBe(200);
    const matchUpdate = vi.mocked(prisma.user.update).mock.calls.find(
      ([args]) => (args as any).where?.id === PLAYER_IDS[0],
    );
    expect(matchUpdate?.[0].data.elo).toBeGreaterThan(1000);
  });

  it("uses match scores in manual mode when no manual overrides", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({
      matchTableStatus: "OPEN",
      matchTableMode: "MANUAL_ELO",
    } as never);
    vi.mocked(prisma.eventCourtAssignment.findMany).mockResolvedValueOnce([
      { userId: PLAYER_IDS[0], courtNumber: 1 },
      { userId: PLAYER_IDS[1], courtNumber: 1 },
      { userId: PLAYER_IDS[2], courtNumber: 1 },
      { userId: PLAYER_IDS[3], courtNumber: 1 },
      { userId: PLAYER_IDS[4], courtNumber: 1 },
    ] as never);
    vi.mocked(prisma.eventMatch.findMany).mockResolvedValueOnce([
      {
        id: "match-1",
        courtNumber: 1,
        round: 1,
        status: "COMPLETED",
        pair1Player1Id: PLAYER_IDS[0],
        pair1Player2Id: PLAYER_IDS[1],
        pair2Player1Id: PLAYER_IDS[2],
        pair2Player2Id: PLAYER_IDS[3],
        score1: 6,
        score2: 4,
      },
    ] as never);
    vi.mocked(prisma.eventManualElo.findMany).mockResolvedValueOnce([] as never);

    vi.mocked(prisma.user.findMany)
      .mockResolvedValueOnce([
        { id: PLAYER_IDS[0], elo: 1000 },
        { id: PLAYER_IDS[1], elo: 1000 },
        { id: PLAYER_IDS[2], elo: 1000 },
        { id: PLAYER_IDS[3], elo: 1000 },
      ] as never)
      .mockResolvedValueOnce([] as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PUT",
      body: JSON.stringify({ eventId: EVENT_ID }),
    });

    expect(statusCode).toBe(200);
    expect(json.status).toBe("CONFIRMED");
  });

  it("requires manual ELO when a full court is manually overridden", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "OPEN" } as never);
    vi.mocked(prisma.eventCourtAssignment.findMany).mockResolvedValueOnce([
      { userId: PLAYER_IDS[0], courtNumber: 1 },
      { userId: PLAYER_IDS[1], courtNumber: 1 },
      { userId: PLAYER_IDS[2], courtNumber: 1 },
      { userId: PLAYER_IDS[3], courtNumber: 1 },
      { userId: PLAYER_IDS[4], courtNumber: 1 },
    ] as never);
    vi.mocked(prisma.eventMatch.findMany).mockResolvedValueOnce([
      {
        id: "match-1",
        courtNumber: 1,
        round: 1,
        status: "COMPLETED",
        pair1Player1Id: PLAYER_IDS[0],
        pair1Player2Id: PLAYER_IDS[1],
        pair2Player1Id: PLAYER_IDS[2],
        pair2Player2Id: PLAYER_IDS[3],
        score1: 6,
        score2: 4,
      },
    ] as never);
    vi.mocked(prisma.eventCourtOverride.findMany).mockResolvedValueOnce([{ courtNumber: 1 }] as never);
    vi.mocked(prisma.eventManualElo.findMany).mockResolvedValueOnce([] as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PUT",
      body: JSON.stringify({ eventId: EVENT_ID }),
    });

    expect(statusCode).toBe(400);
    expect(json.error).toMatch(/manual elo is required/i);
  });

  it("confirms match table and updates player ELO", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "OPEN" } as never);
    vi.mocked(prisma.eventCourtAssignment.findMany).mockResolvedValueOnce([
      { userId: PLAYER_IDS[0], courtNumber: 1 },
      { userId: PLAYER_IDS[1], courtNumber: 1 },
      { userId: PLAYER_IDS[2], courtNumber: 1 },
      { userId: PLAYER_IDS[3], courtNumber: 1 },
      { userId: PLAYER_IDS[4], courtNumber: 1 },
    ] as never);
    vi.mocked(prisma.eventMatch.findMany).mockResolvedValueOnce([
      {
        id: "match-1",
        courtNumber: 1,
        round: 1,
        status: "COMPLETED",
        pair1Player1Id: PLAYER_IDS[0],
        pair1Player2Id: PLAYER_IDS[1],
        pair2Player1Id: PLAYER_IDS[2],
        pair2Player2Id: PLAYER_IDS[3],
        score1: 6,
        score2: 4,
      },
    ] as never);
    vi.mocked(prisma.eventManualElo.findMany).mockResolvedValueOnce([] as never);

    vi.mocked(prisma.user.findMany)
      .mockResolvedValueOnce([
        { id: PLAYER_IDS[0], elo: 1000 },
        { id: PLAYER_IDS[1], elo: 1000 },
        { id: PLAYER_IDS[2], elo: 1000 },
        { id: PLAYER_IDS[3], elo: 1000 },
      ] as never)
      .mockResolvedValueOnce([] as never);

    const { statusCode, json } = await callHandler({
      httpMethod: "PUT",
      body: JSON.stringify({ eventId: EVENT_ID }),
    });

    expect(statusCode).toBe(200);
    expect(json.status).toBe("CONFIRMED");
    expect(json.updatedPlayers).toHaveLength(4);
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("passes timeout overrides to the transaction in POST", async () => {
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue(
      PLAYER_IDS.map((id, index) => ({ user: { id, elo: 1000 + index * 10 } })) as never,
    );

    await callHandler({
      httpMethod: "POST",
      body: JSON.stringify({ eventId: EVENT_ID }),
    });

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ timeout: 30000 })
    );
  });

  it("passes timeout overrides to the transaction in PUT", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({ matchTableStatus: "OPEN" } as never);
    vi.mocked(prisma.eventCourtAssignment.findMany).mockResolvedValueOnce([
      { userId: PLAYER_IDS[0], courtNumber: 1 },
      { userId: PLAYER_IDS[1], courtNumber: 1 },
      { userId: PLAYER_IDS[2], courtNumber: 1 },
      { userId: PLAYER_IDS[3], courtNumber: 1 },
    ] as never);
    vi.mocked(prisma.eventMatch.findMany).mockResolvedValueOnce([
      {
        id: "match-1",
        courtNumber: 1,
        round: 1,
        status: "COMPLETED",
        pair1Player1Id: PLAYER_IDS[0],
        pair1Player2Id: PLAYER_IDS[1],
        pair2Player1Id: PLAYER_IDS[2],
        pair2Player2Id: PLAYER_IDS[3],
        score1: 6,
        score2: 4,
      },
    ] as never);
    vi.mocked(prisma.eventManualElo.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValueOnce([] as never);

    await callHandler({
      httpMethod: "PUT",
      body: JSON.stringify({ eventId: EVENT_ID }),
    });

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ timeout: 30000 })
    );
  });

  it("passes timeout overrides to the transaction in PATCH", async () => {
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue(
      PLAYER_IDS.map((id, index) => ({ userId: id, user: { id, elo: 1000 + index * 10 } })) as never,
    );
    
    await callHandler({
      httpMethod: "PATCH",
      body: JSON.stringify({ 
        eventId: EVENT_ID,
        assignments: PLAYER_IDS.map((id) => ({ userId: id, courtNumber: 1 })),
      }),
    });

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ timeout: 30000 })
    );
  });

  it("handles multiple regenerations by consistently clearing old data", async () => {
    vi.mocked(prisma.eventRegistration.findMany).mockResolvedValue(
      PLAYER_IDS.map((id, index) => ({ user: { id, elo: 1000 + index * 10 } })) as never,
    );

    // Call first generation
    await callHandler({
      httpMethod: "POST",
      body: JSON.stringify({ eventId: EVENT_ID }),
    });

    expect(prisma.eventMatch.deleteMany).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
    expect(prisma.eventCourtAssignment.deleteMany).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
    expect(prisma.eventManualElo.deleteMany).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });
    expect(prisma.eventScore.deleteMany).toHaveBeenCalledWith({ where: { eventId: EVENT_ID } });

    // Assuming someone unenrolls and we regenerate again
    // Call second generation (same method)
    await callHandler({
      httpMethod: "POST",
      body: JSON.stringify({ eventId: EVENT_ID }),
    });

    // We check that the mocked deleteMany was called multiple times, simulating clearing over and over
    expect(prisma.eventMatch.deleteMany).toHaveBeenCalledTimes(2);
    expect(prisma.eventCourtAssignment.deleteMany).toHaveBeenCalledTimes(2);
    expect(prisma.eventManualElo.deleteMany).toHaveBeenCalledTimes(2);
    expect(prisma.eventScore.deleteMany).toHaveBeenCalledTimes(2);
  });
});
