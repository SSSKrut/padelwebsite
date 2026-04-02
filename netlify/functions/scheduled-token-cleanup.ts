import { schedule } from "@netlify/functions";
import { cleanupVerificationTokens } from "./lib/cleanupVerificationTokens";

// Runs daily in production
export const handler = schedule("0 3 * * *", async () => {
  const deleted = await cleanupVerificationTokens();
  console.log(`[token-cleanup] Deleted ${deleted} verification token(s).`);
  return { statusCode: 200 };
});
