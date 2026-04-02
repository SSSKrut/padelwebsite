import { describe, it, expect, vi, beforeEach } from "vitest";
import { handler } from "../functions/auth-resend-verification";
import { prisma } from "../functions/lib/prisma";
import { createToken, buildActionUrl } from "../functions/lib/tokens";
import { sendEmail } from "../functions/lib/email";

vi.mock("../functions/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    verificationToken: { findFirst: vi.fn() },
  },
}));

vi.mock("../functions/lib/tokens", () => ({
  createToken: vi.fn(),
  buildActionUrl: vi.fn(),
}));

vi.mock("../functions/lib/email", () => ({
  sendEmail: vi.fn(),
}));

describe("auth-resend-verification", () => {
  const createEvent = (body: any) => ({
    httpMethod: "POST",
    body: JSON.stringify(body),
    headers: {},
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success when user is not found", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

    const response = await handler(createEvent({ email: "missing@example.com" }), {} as any);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body!)).toEqual({
      message: "If your email is registered and unverified, a new link has been sent.",
    });
    expect(createToken).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns success without sending when user is already verified", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      firstName: "User",
      role: "USER",
    } as any);

    const response = await handler(createEvent({ email: "user@example.com" }), {} as any);

    expect(response.statusCode).toBe(200);
    expect(createToken).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends a new verification email when cooldown has passed", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-2",
      email: "unverified@example.com",
      firstName: "Unverified",
      role: "UNVERIFIED_USER",
    } as any);
    vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
    } as any);
    vi.mocked(createToken).mockResolvedValue({ token: "token" } as any);
    vi.mocked(buildActionUrl).mockReturnValue("http://localhost:8080/verify-email?token=token");

    const response = await handler(createEvent({ email: "unverified@example.com" }), {} as any);

    expect(response.statusCode).toBe(200);
    expect(createToken).toHaveBeenCalledWith("user-2", "EMAIL_VERIFICATION");
    expect(sendEmail).toHaveBeenCalledWith({
      to: "unverified@example.com",
      template: "email-verification",
      data: {
        firstName: "Unverified",
        actionUrl: "http://localhost:8080/verify-email?token=token",
      },
    });
  });

  it("does not send when cooldown has not passed", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-3",
      email: "cooldown@example.com",
      firstName: "Cooldown",
      role: "UNVERIFIED_USER",
    } as any);
    vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
      createdAt: new Date(Date.now() - 60 * 1000),
    } as any);

    const response = await handler(createEvent({ email: "cooldown@example.com" }), {} as any);

    expect(response.statusCode).toBe(200);
    expect(createToken).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
