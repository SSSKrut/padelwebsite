import { prisma } from "./prisma";

const RANKED_ROLES = ["USER", "ADMIN", "SUPER_ADMIN"] as const;

type RankedRole = (typeof RANKED_ROLES)[number];

export const getWeekStart = (date: Date = new Date()) => {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay();
  const diff = (day + 6) % 7; // Monday = 0
  utcDate.setUTCDate(utcDate.getUTCDate() - diff);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
};

export async function rebuildWeeklyRankings(referenceDate: Date = new Date()) {
  const weekStart = getWeekStart(referenceDate);

  const users = await prisma.user.findMany({
    where: { role: { in: RANKED_ROLES as RankedRole[] } },
    orderBy: { elo: "desc" },
    select: { id: true, elo: true },
  });

  const weeklyRatingModel = (prisma as any).userWeeklyRating;
  if (!weeklyRatingModel?.upsert) {
    throw new Error("Prisma client missing UserWeeklyRating model. Run prisma generate.");
  }

  let updated = 0;
  for (let index = 0; index < users.length; index += 1) {
    const user = users[index];
    await weeklyRatingModel.upsert({
      where: { userId_weekStart: { userId: user.id, weekStart } },
      update: { rating: user.elo, rank: index + 1 },
      create: { userId: user.id, weekStart, rating: user.elo, rank: index + 1 },
    });
    updated += 1;
  }

  return { weekStart, updated };
}
