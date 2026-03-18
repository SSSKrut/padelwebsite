import { Resend } from "resend";
import { renderTemplate, type TemplateName, type TemplateData } from "./emailTemplates";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
const FROM_NAME = process.env.FROM_NAME || "Sun Set Padel";

interface SendEmailOptions<T extends TemplateName> {
  to: string | string[];
  template: T;
  data: TemplateData<T>;
  replyTo?: string;
  /** Override the default subject from the template */
  subjectOverride?: string;
}

export async function sendEmail<T extends TemplateName>({
  to,
  template,
  data,
  replyTo,
  subjectOverride,
}: SendEmailOptions<T>) {
  const { subject, html } = renderTemplate(template, data);

  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: Array.isArray(to) ? to : [to],
    subject: subjectOverride ?? subject,
    html,
    ...(replyTo && { replyTo }),
  });

  if (error) {
    console.error("[Email] Send failed:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }
}
