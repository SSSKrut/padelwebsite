import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    event: { findMany: vi.fn(), update: vi.fn() },
  },
}));

const { mockSendEmail } = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
}));

vi.mock("../functions/lib/email", () => ({
  sendEmail: mockSendEmail,
}));

import { sendEventReminders } from "../functions/lib/sendEventReminders";
import { prisma } from "../functions/lib/prisma";

const EVENT_ID = "evt-11111111-2222-3333-4444-555555555555";

function makeEvent(overrides: any = {}) {
  return {
    id: EVENT_ID,
    title: "Sunday Padel",
    date: new Date(Date.now() + 24.5 * 60 * 60 * 1000),
    location: "Padel Vienna Arena",
    participants: [
      { user: { email: "alice@example.com", firstName: "Alice" } },
      { user: { email: "bob@example.com", firstName: "Bob" } },
    ],
    ...overrides,
  };
}

describe("sendEventReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue(undefined);
    vi.mocked(prisma.event.update).mockResolvedValue({} as never);
  });

  it("sends reminders for events in the 24-25h window", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([makeEvent()] as never);

    const count = await sendEventReminders();

    expect(count).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@example.com",
        template: "event-reminder",
        data: expect.objectContaining({
          firstName: "Alice",
          eventTitle: "Sunday Padel",
        }),
      }),
    );
    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: EVENT_ID },
      data: { reminderSentAt: expect.any(Date) },
    });
  });

  it("skips events that already had reminders sent", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);

    const count = await sendEventReminders();

    expect(count).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("continues sending to other participants when one fails", async () => {
    mockSendEmail
      .mockRejectedValueOnce(new Error("SMTP error"))
      .mockResolvedValueOnce(undefined);

    vi.mocked(prisma.event.findMany).mockResolvedValue([makeEvent()] as never);

    const count = await sendEventReminders();

    expect(count).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    // Event should still be marked as sent
    expect(prisma.event.update).toHaveBeenCalled();
  });

  it("handles events with no participants", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([makeEvent({ participants: [] })] as never);

    const count = await sendEventReminders();

    expect(count).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(prisma.event.update).toHaveBeenCalled();
  });

  it("passes correct template data including venue and actionUrl", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      makeEvent({ participants: [{ user: { email: "test@example.com", firstName: "Test" } }] }),
    ] as never);

    await sendEventReminders();

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventVenue: "Padel Vienna Arena",
          actionUrl: `https://sunsetpadel.at/events/${EVENT_ID}`,
        }),
      }),
    );
  });
});
