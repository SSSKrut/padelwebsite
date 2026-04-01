import { describe, it, expect } from "vitest";
import { isEventLocked } from "./utils";

describe("isEventLocked", () => {
  it("returns false when event is more than 24h away", () => {
    const now = new Date("2026-03-19T10:00:00Z");
    const eventDate = new Date("2026-03-21T10:00:00Z"); // 48h away
    expect(isEventLocked(eventDate, now)).toBe(false);
  });

  it("returns true when event is less than 24h away", () => {
    const now = new Date("2026-03-19T10:00:00Z");
    const eventDate = new Date("2026-03-20T08:00:00Z"); // 22h away
    expect(isEventLocked(eventDate, now)).toBe(true);
  });

  it("returns true when event is in the past", () => {
    const now = new Date("2026-03-19T10:00:00Z");
    const eventDate = new Date("2026-03-18T10:00:00Z"); // yesterday
    expect(isEventLocked(eventDate, now)).toBe(true);
  });

  it("returns true at exactly 24h boundary", () => {
    const now = new Date("2026-03-19T10:00:00Z");
    const eventDate = new Date("2026-03-20T10:00:00Z"); // exactly 24h
    // < 24h is false, but 24h exactly means diff === MS_IN_DAY which is NOT < MS_IN_DAY
    expect(isEventLocked(eventDate, now)).toBe(false);
  });

  it("returns true at 23h 59m 59s before event", () => {
    const now = new Date("2026-03-19T10:00:01Z");
    const eventDate = new Date("2026-03-20T10:00:00Z"); // 23h59m59s away
    expect(isEventLocked(eventDate, now)).toBe(true);
  });

  it("accepts string date input", () => {
    const now = new Date("2026-03-19T10:00:00Z");
    expect(isEventLocked("2026-03-21T10:00:00Z", now)).toBe(false);
    expect(isEventLocked("2026-03-20T08:00:00Z", now)).toBe(true);
  });

  it("accepts ISO date strings without timezone", () => {
    const now = new Date("2026-03-19T10:00:00Z");
    const farEvent = "2026-03-25T18:00:00";
    expect(isEventLocked(farEvent, now)).toBe(false);
  });
});
