import type { Handler } from "@netlify/functions";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const TO_EMAIL = "sunsetpadelvienna@gmail.com";

// You must use a verified sender domain in Resend, e.g. "noreply@sunsetpadel.at"
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@sunsetpadel.at";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !email || !message) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields." }) };
    }

    const safeSubject = subject ? subject : "Website contact request";
    const finalSubject = `Sun Set Padel — Contact Form: ${safeSubject}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>New contact request</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone || "-")}</p>
        <p><strong>Subject:</strong> ${escapeHtml(safeSubject)}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      replyTo: email, // so you can reply directly
      subject: finalSubject,
      html,
    });

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: "Email send failed." }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error." }) };
  }
};

// Minimal HTML escaping
function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
