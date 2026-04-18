import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, rateLimitedResponse } from "../functions/lib/rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within the limit", () => {
    const opts = { maxAttempts: 3, windowMs: 60_000 };

    expect(checkRateLimit("test-key-1", opts).allowed).toBe(true);
    expect(checkRateLimit("test-key-1", opts).allowed).toBe(true);
    expect(checkRateLimit("test-key-1", opts).allowed).toBe(true);
  });

  it("blocks requests exceeding the limit", () => {
    const opts = { maxAttempts: 2, windowMs: 60_000 };

    expect(checkRateLimit("test-key-2", opts).allowed).toBe(true);
    expect(checkRateLimit("test-key-2", opts).allowed).toBe(true);

    const result = checkRateLimit("test-key-2", opts);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it("resets after the window expires", () => {
    const opts = { maxAttempts: 1, windowMs: 10_000 };

    expect(checkRateLimit("test-key-3", opts).allowed).toBe(true);
    expect(checkRateLimit("test-key-3", opts).allowed).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(10_001);

    expect(checkRateLimit("test-key-3", opts).allowed).toBe(true);
  });

  it("tracks different keys independently", () => {
    const opts = { maxAttempts: 1, windowMs: 60_000 };

    expect(checkRateLimit("ip-1", opts).allowed).toBe(true);
    expect(checkRateLimit("ip-1", opts).allowed).toBe(false);

    // Different key should still be allowed
    expect(checkRateLimit("ip-2", opts).allowed).toBe(true);
  });

  it("cleans up expired entries", () => {
    const opts = { maxAttempts: 1, windowMs: 5_000 };

    checkRateLimit("cleanup-key", opts);

    // Advance past window + cleanup interval
    vi.advanceTimersByTime(65_000);

    // This should trigger cleanup and allow the request
    const result = checkRateLimit("cleanup-key", opts);
    expect(result.allowed).toBe(true);
  });
});

describe("rateLimitedResponse", () => {
  it("returns 429 with correct Retry-After header", () => {
    const response = rateLimitedResponse(30_000);

    expect(response.statusCode).toBe(429);
    expect(response.headers["Retry-After"]).toBe("30");

    const body = JSON.parse(response.body);
    expect(body.error).toContain("Too many requests");
  });

  it("rounds up Retry-After to nearest second", () => {
    const response = rateLimitedResponse(1_500);
    expect(response.headers["Retry-After"]).toBe("2");
  });
});
