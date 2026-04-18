import { z } from "zod";
import { prisma } from "./lib/prisma";
import { createToken, buildActionUrl } from "./lib/tokens";
import { sendEmail } from "./lib/email";
import { defineHandler } from "./lib/apiHandler";
import { checkRateLimit, rateLimitedResponse } from "./lib/rateLimit";

const FORGOT_RATE_LIMIT = { maxAttempts: 5, windowMs: 15 * 60 * 1000 }; // 5 attempts per 15 min

const RequestSchema = z.object({
	email: z.string().email(),
});

export const handler = defineHandler({
	method: "POST",
	bodySchema: RequestSchema,
	handler: async ({ body, event }) => {
		const ip = event.headers["x-forwarded-for"]?.split(",")[0]?.trim() || event.headers["client-ip"] || "unknown";
		const rl = checkRateLimit(`forgot:${ip}`, FORGOT_RATE_LIMIT);
		if (!rl.allowed) return rateLimitedResponse(rl.retryAfterMs);

		const successResponse = {
			message: "If an account with that email exists, a reset link has been sent.",
		};

		const email = body.email.toLowerCase().trim();

		// Always perform token creation + email sending to prevent timing attacks.
		// For non-existent users, we still wait a comparable amount of time.
		const user = await prisma.user.findUnique({
			where: { email },
		});

		if (!user) {
			// Simulate the delay of token creation + email sending
			// to prevent timing-based email enumeration
			await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));
			return successResponse;
		}

		try {
			const { token } = await createToken(user.id, "PASSWORD_RESET");
			const actionUrl = buildActionUrl("/reset-password", token);

			await sendEmail({
				to: user.email,
				userId: user.id,
				template: "password-reset",
				data: { firstName: user.firstName, actionUrl },
			});
		} catch (error) {
			console.error("[ForgotPassword] Failed to send reset email:", error);
		}

		return successResponse;
	},
});
