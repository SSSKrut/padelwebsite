import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    event: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../functions/lib/auth", () => ({
  verifyAdmin: vi.fn(),
}));

import { handler } from "../functions/admin-events";
import { prisma } from "../functions/lib/prisma";
import { verifyAdmin } from "../functions/lib/auth";

const PUBLISH_AT = "2026-04-01T10:00:00.000Z";

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    httpMethod: "POST",
    body: null,
    headers: { cookie: "access_token=fake" },
    rawUrl: "http://localhost/.netlify/functions/admin-events",
    path: "/.netlify/functions/admin-events",
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

describe("admin-events — SCHEDULED status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdmin).mockResolvedValue(undefined as never);
  });

  // --- POST (create) ---

  describe("POST — create with SCHEDULED status", () => {
    it("creates event with SCHEDULED status and publishAt", async () => {
      vi.mocked(prisma.event.create).mockResolvedValue({
        id: "evt-1",
        status: "SCHEDULED",
        publishAt: new Date(PUBLISH_AT),
      } as never);

      const { statusCode } = await callHandler({
        httpMethod: "POST",
        body: JSON.stringify({
          title: "Padel Night",
          date: "2026-04-05T18:00:00.000Z",
          status: "SCHEDULED",
          publishAt: PUBLISH_AT,
        }),
      });

      expect(statusCode).toBe(201);
      expect(prisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "SCHEDULED",
            publishAt: new Date(PUBLISH_AT),
          }),
        }),
      );
    });

    it("returns 400 when SCHEDULED but no publishAt", async () => {
      const { statusCode, json } = await callHandler({
        httpMethod: "POST",
        body: JSON.stringify({
          title: "Padel Night",
          date: "2026-04-05T18:00:00.000Z",
          status: "SCHEDULED",
        }),
      });

      expect(statusCode).toBe(400);
      expect(json.error).toMatch(/publishAt/i);
      expect(prisma.event.create).not.toHaveBeenCalled();
    });

    it("sets publishAt to null when status is not SCHEDULED", async () => {
      vi.mocked(prisma.event.create).mockResolvedValue({ id: "evt-2" } as never);

      await callHandler({
        httpMethod: "POST",
        body: JSON.stringify({
          title: "Padel Night",
          date: "2026-04-05T18:00:00.000Z",
          status: "PUBLISHED",
        }),
      });

      expect(prisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "PUBLISHED",
            publishAt: null,
          }),
        }),
      );
    });
  });

  // --- PATCH (update) ---

  describe("PATCH — update to SCHEDULED status", () => {
    it("updates event to SCHEDULED with publishAt", async () => {
      vi.mocked(prisma.event.update).mockResolvedValue({
        id: "evt-1",
        status: "SCHEDULED",
        publishAt: new Date(PUBLISH_AT),
      } as never);

      const { statusCode } = await callHandler({
        httpMethod: "PATCH",
        body: JSON.stringify({
          id: "evt-1",
          status: "SCHEDULED",
          publishAt: PUBLISH_AT,
        }),
      });

      expect(statusCode).toBe(200);
      expect(prisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "SCHEDULED",
            publishAt: new Date(PUBLISH_AT),
          }),
        }),
      );
    });

    it("returns 400 when switching to SCHEDULED without publishAt and event has none", async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: "evt-1",
        publishAt: null,
      } as never);

      const { statusCode, json } = await callHandler({
        httpMethod: "PATCH",
        body: JSON.stringify({
          id: "evt-1",
          status: "SCHEDULED",
        }),
      });

      expect(statusCode).toBe(400);
      expect(json.error).toMatch(/publishAt/i);
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it("clears publishAt when switching from SCHEDULED to PUBLISHED", async () => {
      vi.mocked(prisma.event.update).mockResolvedValue({
        id: "evt-1",
        status: "PUBLISHED",
        publishAt: null,
      } as never);

      const { statusCode } = await callHandler({
        httpMethod: "PATCH",
        body: JSON.stringify({
          id: "evt-1",
          status: "PUBLISHED",
        }),
      });

      expect(statusCode).toBe(200);
      expect(prisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            publishAt: null,
          }),
        }),
      );
    });

    it("resets reminderSentAt when event date is updated", async () => {
      const updatedDate = "2026-04-07T20:30:00.000Z";

      vi.mocked(prisma.event.update).mockResolvedValue({
        id: "evt-1",
        date: new Date(updatedDate),
        reminderSentAt: null,
      } as never);

      const { statusCode } = await callHandler({
        httpMethod: "PATCH",
        body: JSON.stringify({
          id: "evt-1",
          date: updatedDate,
        }),
      });

      expect(statusCode).toBe(200);
      expect(prisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            date: new Date(updatedDate),
            reminderSentAt: null,
          }),
        }),
      );
    });
  });
});
