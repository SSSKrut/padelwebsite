import { prisma } from "./prisma";
import type { TemplateName } from "./emailTemplates";

export type EmailPreferenceKey =
  | "welcome"
  | "emailVerification"
  | "passwordReset"
  | "accountApproved"
  | "eventRegistration"
  | "eventWaitlist"
  | "eventWaitlistPromotion"
  | "eventCancelled"
  | "eventReminder";

export interface EmailPreferences {
  welcome: boolean;
  emailVerification: boolean;
  passwordReset: boolean;
  accountApproved: boolean;
  eventRegistration: boolean;
  eventWaitlist: boolean;
  eventWaitlistPromotion: boolean;
  eventCancelled: boolean;
  eventReminder: boolean;
}

export const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
  welcome: true,
  emailVerification: true,
  passwordReset: true,
  accountApproved: true,
  eventRegistration: true,
  eventWaitlist: true,
  eventWaitlistPromotion: true,
  eventCancelled: true,
  eventReminder: true,
};

export const TEMPLATE_PREFERENCE_KEYS: Record<TemplateName, EmailPreferenceKey | null> = {
  welcome: "welcome",
  "email-verification": "emailVerification",
  "password-reset": null,
  "account-approved": "accountApproved",
  "event-registration": "eventRegistration",
  "event-waitlist": "eventWaitlist",
  "event-waitlist-promotion": "eventWaitlistPromotion",
  "event-cancelled": "eventCancelled",
  "event-reminder": "eventReminder",
  contact: null,
};

export const normalizeEmailPreferences = (
  preferences?: Partial<EmailPreferences> | null,
): EmailPreferences => {
  const merged = {
    ...DEFAULT_EMAIL_PREFERENCES,
    ...(preferences ?? {}),
  } as EmailPreferences;

  return {
    ...merged,
    passwordReset: true,
  };
};

export async function shouldSendEmailForUser(
  userId: string | undefined | null,
  template: TemplateName,
): Promise<boolean> {
  const preferenceKey = TEMPLATE_PREFERENCE_KEYS[template];

  if (!userId || !preferenceKey) {
    return true;
  }

  const stored = await prisma.userEmailPreferences.findUnique({
    where: { userId },
    select: { [preferenceKey]: true } as Record<string, true>,
  });

  if (!stored) {
    return true;
  }

  return stored[preferenceKey] !== false;
}
