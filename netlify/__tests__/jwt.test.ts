import { describe, it, expect, vi, afterEach } from "vitest";

describe("JWT secret validation", () => {
  const originalEnv = process.env.JWT_SECRET;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.JWT_SECRET = originalEnv;
    } else {
      delete process.env.JWT_SECRET;
    }
    vi.resetModules();
  });

  it("throws when JWT_SECRET is not set", async () => {
    delete process.env.JWT_SECRET;
    const { signAccessToken } = await import("../functions/lib/jwt");
    await expect(signAccessToken({ sub: "test" })).rejects.toThrow(
      "JWT_SECRET environment variable is not set"
    );
  });

  it("throws when JWT_SECRET is empty string", async () => {
    process.env.JWT_SECRET = "";
    const { signAccessToken } = await import("../functions/lib/jwt");
    await expect(signAccessToken({ sub: "test" })).rejects.toThrow(
      "JWT_SECRET environment variable is not set"
    );
  });

  it("works when JWT_SECRET is set", async () => {
    process.env.JWT_SECRET = "test-secret-key-for-jwt-testing-1234";
    const { signAccessToken, verifyToken } = await import("../functions/lib/jwt");

    const token = await signAccessToken({ sub: "user-123" });
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");

    const payload = await verifyToken(token);
    expect(payload.sub).toBe("user-123");
  });

  it("signRefreshToken also validates JWT_SECRET", async () => {
    delete process.env.JWT_SECRET;
    const { signRefreshToken } = await import("../functions/lib/jwt");
    await expect(signRefreshToken({ sub: "test" })).rejects.toThrow(
      "JWT_SECRET environment variable is not set"
    );
  });

  it("verifyToken also validates JWT_SECRET", async () => {
    delete process.env.JWT_SECRET;
    const { verifyToken } = await import("../functions/lib/jwt");
    await expect(verifyToken("some.fake.token")).rejects.toThrow(
      "JWT_SECRET environment variable is not set"
    );
  });
});
