// import { z } from "zod";
// import * as bcrypt from "bcryptjs";
// import { prisma } from "./lib/prisma";
// import { consumeToken } from "./lib/tokens";
// import { defineHandler } from "./lib/apiHandler";

// export const handler = defineHandler({
//   method: "POST",
//   bodySchema: z.object({
//     token: z.string().min(1, "Token is required"),
//     newPassword: z.string().min(8, "Password must be at least 8 characters"),
//   }),
//   handler: async ({ body }) => {
//     const record = await consumeToken(body.token, "PASSWORD_RESET");

//     const passwordHash = await bcrypt.hash(body.newPassword, 12);
//     await prisma.user.update({
//       where: { id: record.userId },
//       data: { passwordHash },
//     });

//     return { message: "Password has been reset successfully." };
//   },
// });
