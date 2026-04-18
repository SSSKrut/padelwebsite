import { schedule } from "@netlify/functions";
import { rebuildWeeklyRankings } from "./lib/weeklyRankings";

// Runs weekly on Monday at 03:00 UTC
export const handler = schedule("0 3 * * 1", async () => {
  await rebuildWeeklyRankings();
  return { statusCode: 200 };
});
