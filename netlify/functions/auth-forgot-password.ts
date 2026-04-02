import { z } from "zod";
import { prisma } from "./lib/prisma";
import { createToken, buildActionUrl } from "./lib/tokens";
import { sendEmail } from "./lib/email";
import { defineHandler } from "./lib/apiHandler";

const RequestSchema = z.object({
	email: z.string().email(),
});

export const handler = defineHandler({
	method: "POST",
	bodySchema: RequestSchema,
	handler: async ({ body }) => {
		const successResponse = {
			message: "If an account with that email exists, a reset link has been sent.",
		};

		const email = body.email.toLowerCase().trim();
		const user = await prisma.user.findUnique({
			where: { email },
		});

		if (!user) return successResponse;

		try {
			const { token } = await createToken(user.id, "PASSWORD_RESET");
			const actionUrl = buildActionUrl("/reset-password", token);

			await sendEmail({
				to: user.email,
				template: "password-reset",
				data: { firstName: user.firstName, actionUrl },
			});
		} catch (error) {
			console.error("[ForgotPassword] Failed to send reset email:", error);
		}

		return successResponse;
	},
});
