import { describe, it, expect, vi, beforeEach } from "vitest";

// We test apiFetch by mocking global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after stubbing
const { apiFetch } = await import("../../src/lib/api");

describe("apiFetch", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("sends credentials: include on every request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: "ok" }),
    });

    await apiFetch("/api/test");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.credentials).toBe("include");
  });

  it("sends credentials: include on POST with body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });

    await apiFetch("/api/test", "POST", { email: "a@b.com" });

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.credentials).toBe("include");
    expect(opts.method).toBe("POST");
    expect(opts.body).toBe(JSON.stringify({ email: "a@b.com" }));
  });

  it("sends credentials: include on refresh attempt (401 flow)", async () => {
    // First call returns 401
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    // Refresh call succeeds
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    // Retry succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ retried: true }),
    });

    const result = await apiFetch("/api/protected");

    expect(mockFetch).toHaveBeenCalledTimes(3);

    // Refresh call (2nd) must have credentials
    const [refreshUrl, refreshOpts] = mockFetch.mock.calls[1];
    expect(refreshUrl).toBe("/.netlify/functions/auth-refresh");
    expect(refreshOpts.credentials).toBe("include");

    // Retry call (3rd) must have credentials
    const [, retryOpts] = mockFetch.mock.calls[2];
    expect(retryOpts.credentials).toBe("include");

    expect(result).toEqual({ retried: true });
  });

  it("throws on non-ok response after refresh fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 }); // refresh fails
    // No retry — original 401 response triggers error path

    await expect(apiFetch("/api/test")).rejects.toThrow("Request failed");
  });
});
