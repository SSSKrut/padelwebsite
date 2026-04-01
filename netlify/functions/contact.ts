import { z } from "zod";
import { defineHandler } from "./lib/apiHandler";
import { sendEmail } from "./lib/email";

const TO_EMAIL = "sunsetpadelvienna@gmail.com";

export const handler = defineHandler({
  method: "POST",
  bodySchema: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().optional(),
    subject: z.string().optional(),
    message: z.string().min(1, "Message is required"),
  }),
  handler: async ({ body }) => {
    await sendEmail({
      to: TO_EMAIL,
      template: "contact",
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        subject: body.subject,
        message: body.message,
      },
      replyTo: body.email,
    });

    return { ok: true };
  },
});
