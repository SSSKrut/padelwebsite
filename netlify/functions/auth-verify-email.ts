// import { z } from "zod";
// import { prisma } from "./lib/prisma";
// import { consumeToken } from "./lib/tokens";
// import { defineHandler } from "./lib/apiHandler";

// export const handler = defineHandler({
//   method: "POST",
//   bodySchema: z.object({
//     token: z.string().min(1, "Token is required"),
//   }),
//   handler: async ({ body }) => {
//     const record = await consumeToken(body.token, "EMAIL_VERIFICATION");

//     // Upgrade role only if still unverified
//     if (record.user.role === "UNVERIFIED_USER") {
//       await prisma.user.update({
//         where: { id: record.userId },
//         data: { role: "USER" },
//       });
//     }

//     return { message: "Email verified successfully." };
//   },
// });
