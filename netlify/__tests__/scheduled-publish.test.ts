import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    event: { updateMany: vi.fn() },
  },
}));

import { publishScheduledEvents } from "../functions/lib/publishScheduled";
import { prisma } from "../functions/lib/prisma";

describe("publishScheduledEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes SCHEDULED events whose publishAt has passed", async () => {
    vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 2 } as never);

    const count = await publishScheduledEvents();

    expect(count).toBe(2);
    expect(prisma.event.updateMany).toHaveBeenCalledWith({
      where: {
        status: "SCHEDULED",
        publishAt: { lte: expect.any(Date) },
      },
      data: {
        status: "PUBLISHED",
        publishAt: null,
      },
    });
  });

  it("returns 0 when no SCHEDULED events are due", async () => {
    vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 0 } as never);

    const count = await publishScheduledEvents();

    expect(count).toBe(0);
    expect(prisma.event.updateMany).toHaveBeenCalledTimes(1);
  });

  it("passes a Date <= now to the query", async () => {
    vi.mocked(prisma.event.updateMany).mockResolvedValue({ count: 0 } as never);

    const before = new Date();
    await publishScheduledEvents();
    const after = new Date();

    const callArgs = vi.mocked(prisma.event.updateMany).mock.calls[0][0];
    const queryDate = (callArgs as any).where.publishAt.lte as Date;

    expect(queryDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(queryDate.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
