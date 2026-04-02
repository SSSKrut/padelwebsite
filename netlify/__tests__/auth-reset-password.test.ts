import { describe, it, expect, vi, beforeEach } from "vitest";
import { handler } from "../functions/auth-reset-password";
import { prisma } from "../functions/lib/prisma";
import { consumeToken } from "../functions/lib/tokens";
import * as bcrypt from "bcryptjs";

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

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
}));

describe("auth-reset-password", () => {
  const createEvent = (body: any) => ({
    httpMethod: "POST",
    body: JSON.stringify(body),
    headers: {},
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the password when token is valid", async () => {
    vi.mocked(consumeToken).mockResolvedValue({ userId: "user-1" } as any);

    const response = await handler(
      createEvent({ token: "reset-token", newPassword: "newpassword" }),
      {} as any,
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body!)).toEqual({ message: "Password has been reset successfully." });
    expect(bcrypt.hash).toHaveBeenCalledWith("newpassword", 12);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "hashed-password" },
    });
  });

  it("returns a 400 when token is invalid", async () => {
    const error = new Error("Invalid or expired link.") as Error & { statusCode?: number };
    error.statusCode = 400;
    vi.mocked(consumeToken).mockRejectedValue(error);

    const response = await handler(
      createEvent({ token: "bad-token", newPassword: "newpassword" }),
      {} as any,
    );

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body!)).toEqual({ error: "Invalid or expired link." });
  });
});
