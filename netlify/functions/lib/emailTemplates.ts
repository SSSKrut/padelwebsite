// ---------------------------------------------------------------------------
// Email templates — add new templates by extending the `templates` map.
// Every template is a function:  (data) => { subject, html }
// ---------------------------------------------------------------------------

/** Per-template data contracts */
export interface TemplateDataMap {
  welcome: {
    firstName: string;
    actionUrl?: string;
  };
  "email-verification": {
    firstName: string;
    actionUrl: string;
  };
  "password-reset": {
    firstName: string;
    actionUrl: string;
  };
  "account-approved": {
    firstName: string;
    actionUrl?: string;
  };
  "event-registration": {
    firstName: string;
    eventTitle: string;
    eventDate: string;
    eventTime?: string;
    eventVenue?: string;
    actionUrl?: string;
  };
  "event-waitlist": {
    firstName: string;
    eventTitle: string;
    eventDate: string;
    eventTime?: string;
    eventVenue?: string;
    actionUrl?: string;
    isPremium?: boolean;
  };
  "event-waitlist-promotion": {
    firstName: string;
    eventTitle: string;
    eventDate: string;
    eventTime?: string;
    eventVenue?: string;
    actionUrl?: string;
  };
  "event-cancelled": {
    firstName: string;
    eventTitle: string;
    eventDate: string;
    eventTime?: string;
    eventVenue?: string;
    cancelMessage: string;
    actionUrl?: string;
  };
  "event-reminder": {
    firstName: string;
    eventTitle: string;
    eventDate: string;
    eventTime?: string;
    eventVenue?: string;
    actionUrl?: string;
  };
  contact: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
  };
}

export type TemplateName = keyof TemplateDataMap;
export type TemplateData<T extends TemplateName> = TemplateDataMap[T];

interface RenderedEmail {
  subject: string;
  html: string;
}

// ---------------------------------------------------------------------------
// Base layout
// ---------------------------------------------------------------------------
const BRAND_COLOR = "#dc2626"; // red-600, matches the site accent

function baseLayout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:${BRAND_COLOR};padding:24px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:0.5px;">Sun Set Padel</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;text-align:center;font-size:12px;color:#a1a1aa;border-top:1px solid #e4e4e7;">
            &copy; ${new Date().getFullYear()} Sun Set Padel Vienna &middot;
            <a href="https://sunsetpadel.at" style="color:${BRAND_COLOR};text-decoration:none;">sunsetpadel.at</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(url: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="background:${BRAND_COLOR};border-radius:8px;padding:12px 28px;">
    <a href="${escapeHtml(url)}" style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;">${escapeHtml(label)}</a>
  </td></tr>
</table>`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
const templates: {
  [K in TemplateName]: (data: TemplateDataMap[K]) => RenderedEmail;
} = {
  welcome: (data) => ({
    subject: "Welcome to Sun Set Padel!",
    html: baseLayout(`
      <h2 style="margin:0 0 16px;">Welcome, ${escapeHtml(data.firstName)}!</h2>
      <p style="color:#52525b;line-height:1.6;">
        Your account has been created successfully. We're excited to have you in our padel community!
      </p>
      ${data.actionUrl ? ctaButton(data.actionUrl, "Get Started") : ""}
      <p style="color:#52525b;line-height:1.6;">See you on the court!</p>
    `),
  }),

  "email-verification": (data) => ({
    subject: "Verify your email — Sun Set Padel",
    html: baseLayout(`
      <h2 style="margin:0 0 16px;">Hi ${escapeHtml(data.firstName)},</h2>
      <p style="color:#52525b;line-height:1.6;">
        Please verify your email address by clicking the button below. This link expires in 24 hours.
      </p>
      ${ctaButton(data.actionUrl, "Verify Email")}
      <p style="color:#71717a;font-size:13px;line-height:1.5;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${escapeHtml(data.actionUrl)}" style="color:${BRAND_COLOR};word-break:break-all;">${escapeHtml(data.actionUrl)}</a>
      </p>
    `),
  }),

  "password-reset": (data) => ({
    subject: "Reset your password — Sun Set Padel",
    html: baseLayout(`
      <h2 style="margin:0 0 16px;">Hi ${escapeHtml(data.firstName)},</h2>
      <p style="color:#52525b;line-height:1.6;">
        We received a request to reset your password. Click the button below to choose a new one.
      </p>
      ${ctaButton(data.actionUrl, "Reset Password")}
      <p style="color:#71717a;font-size:13px;line-height:1.5;">
        If you didn't request this, you can safely ignore this email.<br/><br/>
        Or copy this link: <a href="${escapeHtml(data.actionUrl)}" style="color:${BRAND_COLOR};word-break:break-all;">${escapeHtml(data.actionUrl)}</a>
      </p>
    `),
  }),

  "account-approved": (data) => ({
    subject: "Your account is approved — Sun Set Padel",
    html: baseLayout(`
      <h2 style="margin:0 0 16px;">Hi ${escapeHtml(data.firstName)},</h2>
      <p style="color:#52525b;line-height:1.6;">
        Your account has been approved. You can now sign in and register for events.
      </p>
      ${data.actionUrl ? ctaButton(data.actionUrl, "Sign In") : ""}
      <p style="color:#52525b;line-height:1.6;">See you on the court!</p>
    `),
  }),

  "event-registration": (data) => ({
    subject: `Registration confirmed: ${data.eventTitle}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;">You're in, ${escapeHtml(data.firstName)}!</h2>
      <p style="color:#52525b;line-height:1.6;">
        Your registration for <strong>${escapeHtml(data.eventTitle)}</strong> has been confirmed.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
        <tr>
          <td style="padding:12px 16px;background:#fafafa;border-radius:8px;">
            <p style="margin:0 0 4px;"><strong>Date:</strong> ${escapeHtml(data.eventDate)}</p>
            ${data.eventTime ? `<p style="margin:0 0 4px;"><strong>Time:</strong> ${escapeHtml(data.eventTime)}</p>` : ""}
            ${data.eventVenue ? `<p style="margin:0;"><strong>Venue:</strong> ${escapeHtml(data.eventVenue)}</p>` : ""}
          </td>
        </tr>
      </table>
      ${data.actionUrl ? ctaButton(data.actionUrl, "View Event") : ""}
      <p style="color:#52525b;line-height:1.6;">See you on the court!</p>
    `),
  }),

  "event-waitlist": (data) => ({
    subject: `Waitlist: ${data.eventTitle}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;">You're on the waitlist, ${escapeHtml(data.firstName)}!</h2>
      <p style="color:#52525b;line-height:1.6;">
        ${data.isPremium ? "You have been added to the premium-priority waitlist" : "You have been added to the waitlist"}
        for <strong>${escapeHtml(data.eventTitle)}</strong>.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
        <tr>
          <td style="padding:12px 16px;background:#fafafa;border-radius:8px;">
            <p style="margin:0 0 4px;"><strong>Date:</strong> ${escapeHtml(data.eventDate)}</p>
            ${data.eventTime ? `<p style="margin:0 0 4px;"><strong>Time:</strong> ${escapeHtml(data.eventTime)}</p>` : ""}
            ${data.eventVenue ? `<p style="margin:0;"><strong>Venue:</strong> ${escapeHtml(data.eventVenue)}</p>` : ""}
          </td>
        </tr>
      </table>
      ${data.actionUrl ? ctaButton(data.actionUrl, "View Event") : ""}
      <p style="color:#52525b;line-height:1.6;">We will notify you if a spot opens up.</p>
    `),
  }),

  "event-waitlist-promotion": (data) => ({
    subject: `You're in: ${data.eventTitle}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;">Good news, ${escapeHtml(data.firstName)}!</h2>
      <p style="color:#52525b;line-height:1.6;">
        A spot opened up and you have been moved from the waitlist into the main list.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
        <tr>
          <td style="padding:12px 16px;background:#fafafa;border-radius:8px;">
            <p style="margin:0 0 4px;"><strong>Event:</strong> ${escapeHtml(data.eventTitle)}</p>
            <p style="margin:0 0 4px;"><strong>Date:</strong> ${escapeHtml(data.eventDate)}</p>
            ${data.eventTime ? `<p style="margin:0 0 4px;"><strong>Time:</strong> ${escapeHtml(data.eventTime)}</p>` : ""}
            ${data.eventVenue ? `<p style="margin:0;"><strong>Venue:</strong> ${escapeHtml(data.eventVenue)}</p>` : ""}
          </td>
        </tr>
      </table>
      ${data.actionUrl ? ctaButton(data.actionUrl, "View Event") : ""}
      <p style="color:#52525b;line-height:1.6;">See you on the court!</p>
    `),
  }),

  "event-cancelled": (data) => ({
    subject: `Cancelled: ${data.eventTitle}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;">Event Cancelled</h2>
      <p style="color:#52525b;line-height:1.6;">
        We're sorry to inform you that <strong>${escapeHtml(data.eventTitle)}</strong> has been cancelled.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
        <tr>
          <td style="padding:12px 16px;background:#fafafa;border-radius:8px;">
            <p style="margin:0 0 4px;"><strong>Date:</strong> ${escapeHtml(data.eventDate)}</p>
            ${data.eventTime ? `<p style="margin:0 0 4px;"><strong>Time:</strong> ${escapeHtml(data.eventTime)}</p>` : ""}
            ${data.eventVenue ? `<p style="margin:0;"><strong>Venue:</strong> ${escapeHtml(data.eventVenue)}</p>` : ""}
          </td>
        </tr>
      </table>
      <div style="margin:16px 0;padding:16px;background:#fef2f2;border-left:4px solid #dc2626;border-radius:4px;">
        <p style="margin:0;color:#991b1b;font-weight:bold;font-size:13px;">Message from organizer:</p>
        <p style="margin:8px 0 0;color:#52525b;line-height:1.6;">${escapeHtml(data.cancelMessage).replace(/\n/g, "<br/>")}</p>
      </div>
      ${data.actionUrl ? ctaButton(data.actionUrl, "View Events") : ""}
      <p style="color:#52525b;line-height:1.6;">We hope to see you at a future event!</p>
    `),
  }),

  "event-reminder": (data) => ({
    subject: `Reminder: ${data.eventTitle} is tomorrow!`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;">Hey ${escapeHtml(data.firstName)}, see you tomorrow!</h2>
      <p style="color:#52525b;line-height:1.6;">
        Just a friendly reminder that <strong>${escapeHtml(data.eventTitle)}</strong> is happening tomorrow.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
        <tr>
          <td style="padding:12px 16px;background:#fafafa;border-radius:8px;">
            <p style="margin:0 0 4px;"><strong>Date:</strong> ${escapeHtml(data.eventDate)}</p>
            ${data.eventTime ? `<p style="margin:0 0 4px;"><strong>Time:</strong> ${escapeHtml(data.eventTime)}</p>` : ""}
            ${data.eventVenue ? `<p style="margin:0;"><strong>Venue:</strong> ${escapeHtml(data.eventVenue)}</p>` : ""}
          </td>
        </tr>
      </table>
      ${data.actionUrl ? ctaButton(data.actionUrl, "View Event") : ""}
      <p style="color:#52525b;line-height:1.6;">Don't forget your gear — see you on the court!</p>
    `),
  }),

  contact: (data) => ({
    subject: `Sun Set Padel — Contact Form: ${data.subject || "Website contact request"}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;">New contact request</h2>
      <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(data.phone || "—")}</p>
      <p><strong>Subject:</strong> ${escapeHtml(data.subject || "Website contact request")}</p>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:16px 0;" />
      <p><strong>Message:</strong></p>
      <p style="color:#52525b;line-height:1.6;">${escapeHtml(data.message).replace(/\n/g, "<br/>")}</p>
    `),
  }),
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function renderTemplate<T extends TemplateName>(
  name: T,
  data: TemplateDataMap[T],
): RenderedEmail {
  const fn = templates[name];
  return fn(data as any);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function escapeHtml(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
