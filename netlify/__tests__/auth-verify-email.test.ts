import { describe, it, expect, vi, beforeEach } from "vitest";
import { handler } from "../functions/auth-verify-email";
import { prisma } from "../functions/lib/prisma";
import { consumeToken } from "../functions/lib/tokens";

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

vi.mock("../functions/lib/tokens", () => ({
  consumeToken: vi.fn(),
}));

describe("auth-verify-email", () => {
  const createEvent = (body: any) => ({
    httpMethod: "POST",
    body: JSON.stringify(body),
    headers: {},
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upgrades UNVERIFIED_USER to USER", async () => {
    vi.mocked(consumeToken).mockResolvedValue({
      userId: "user-1",
      user: { role: "UNVERIFIED_USER" },
    } as any);

    const response = await handler(createEvent({ token: "token" }), {} as any);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body!)).toEqual({ message: "Email verified successfully." });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { role: "USER" },
    });
  });

  it("does not update when user is already verified", async () => {
    vi.mocked(consumeToken).mockResolvedValue({
      userId: "user-2",
      user: { role: "USER" },
    } as any);

    const response = await handler(createEvent({ token: "token" }), {} as any);

    expect(response.statusCode).toBe(200);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("returns error when token is invalid", async () => {
    const error = new Error("Invalid or expired link.") as Error & { statusCode?: number };
    error.statusCode = 400;
    vi.mocked(consumeToken).mockRejectedValue(error);

    const response = await handler(createEvent({ token: "bad" }), {} as any);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body!)).toEqual({ error: "Invalid or expired link." });
  });
});
