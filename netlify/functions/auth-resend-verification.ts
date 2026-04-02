import { z } from "zod";
import { prisma } from "./lib/prisma";
import { createToken, buildActionUrl } from "./lib/tokens";
import { sendEmail } from "./lib/email";
import { defineHandler } from "./lib/apiHandler";

const RequestSchema = z.object({
  email: z.string().email(),
});

const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

export const handler = defineHandler({
  method: "POST",
  bodySchema: RequestSchema,
  handler: async ({ body }) => {
    const successResponse = {
      message: "If your email is registered and unverified, a new link has been sent.",
    };

    const email = body.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, role: true, email: true },
    });

    if (!user || user.role !== "UNVERIFIED_USER") return successResponse;

    const latestToken = await prisma.verificationToken.findFirst({
      where: { userId: user.id, type: "EMAIL_VERIFICATION", usedAt: null },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (latestToken) {
      const elapsed = Date.now() - latestToken.createdAt.getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        return successResponse;
      }
    }

    try {
      const { token } = await createToken(user.id, "EMAIL_VERIFICATION");
      const actionUrl = buildActionUrl("/verify-email", token);
      await sendEmail({
        to: user.email,
        template: "email-verification",
        data: { firstName: user.firstName, actionUrl },
      });
    } catch (err) {
      console.error("[ResendVerification] Failed to send verification email:", err);
    }

    return successResponse;
  },
});
