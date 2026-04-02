import { z } from "zod";
import { prisma } from "./lib/prisma";
import { consumeToken } from "./lib/tokens";
import { defineHandler } from "./lib/apiHandler";

const RequestSchema = z.object({
	token: z.string().min(1, "Token is required"),
});

export const handler = defineHandler({
	method: "POST",
	bodySchema: RequestSchema,
	handler: async ({ body }) => {
		const record = await consumeToken(body.token, "EMAIL_VERIFICATION");

		if (record.user.role === "UNVERIFIED_USER") {
			await prisma.user.update({
				where: { id: record.userId },
				data: { role: "USER" },
			});
		}

		return { message: "Email verified successfully." };
	},
});
