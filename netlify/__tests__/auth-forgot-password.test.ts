import { describe, it, expect, vi, beforeEach } from "vitest";
import { handler } from "../functions/auth-forgot-password";
import { prisma } from "../functions/lib/prisma";
import { createToken, buildActionUrl } from "../functions/lib/tokens";
import { sendEmail } from "../functions/lib/email";

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../functions/lib/tokens", () => ({
  createToken: vi.fn(),
  buildActionUrl: vi.fn(),
}));

vi.mock("../functions/lib/email", () => ({
  sendEmail: vi.fn(),
}));

describe("auth-forgot-password", () => {
  const createEvent = (body: any) => ({
    httpMethod: "POST",
    body: JSON.stringify(body),
    headers: {},
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success message even when user is not found", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const response = await handler(createEvent({ email: "missing@example.com" }), {} as any);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body!)).toEqual({
      message: "If an account with that email exists, a reset link has been sent.",
    });
    expect(createToken).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends a reset email when the user exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      firstName: "Ada",
      email: "ada@example.com",
    } as any);
    vi.mocked(createToken).mockResolvedValue({ token: "reset-token" } as any);
    vi.mocked(buildActionUrl).mockReturnValue("http://localhost:8080/reset-password?token=reset-token");

    const response = await handler(createEvent({ email: "Ada@Example.com" }), {} as any);

    expect(response.statusCode).toBe(200);
    expect(createToken).toHaveBeenCalledWith("user-1", "PASSWORD_RESET");
    expect(sendEmail).toHaveBeenCalledWith({
      to: "ada@example.com",
      template: "password-reset",
      data: {
        firstName: "Ada",
        actionUrl: "http://localhost:8080/reset-password?token=reset-token",
      },
    });
  });
});
