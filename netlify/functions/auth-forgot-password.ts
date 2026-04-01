// import { z } from "zod";
// import { prisma } from "./lib/prisma";
// import { createToken, buildActionUrl } from "./lib/tokens";
// import { sendEmail } from "./lib/email";
// import { defineHandler } from "./lib/apiHandler";

// export const handler = defineHandler({
//   method: "POST",
//   bodySchema: z.object({
//     email: z.string().email(),
//   }),
//   handler: async ({ body }) => {
//     // Always return success to avoid email enumeration
//     const successResponse = {
//       message: "If an account with that email exists, a reset link has been sent.",
//     };

//     const user = await prisma.user.findUnique({
//       where: { email: body.email.toLowerCase() },
//     });

//     if (!user) return successResponse;

//     const { token } = await createToken(user.id, "PASSWORD_RESET");
//     const actionUrl = buildActionUrl("/reset-password", token);

//     await sendEmail({
//       to: user.email,
//       template: "password-reset",
//       data: { firstName: user.firstName, actionUrl },
//     });

//     return successResponse;
//   },
// });
