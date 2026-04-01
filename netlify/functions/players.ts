import type { Handler } from "@netlify/functions";
import { prisma } from "./lib/prisma";
import { publicName } from "./lib/sanitize";

export const handler: Handler = async () => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ["USER", "ADMIN", "SUPER_ADMIN"] } },
      orderBy: { elo: "desc" },
      include: {
        achievements: {
          include: {
            achievement: true,
          },
        },
      },
    });

    const players = users.map((u, index) => {
      // Group achievements by Title to get counts like "x3 Saturday Winner"
      const achMap = new Map<string, number>();
      u.achievements.forEach((ua) => {
        const title = ua.achievement.title;
        achMap.set(title, (achMap.get(title) || 0) + 1);
      });

      const formattedAchievements = Array.from(achMap.entries()).map(([title, count]) => {
        if (count > 1) {
          return `x${count} ${title}`;
        }
        return title;
      });

      return {
        rank: index + 1,
        name: publicName(u.firstName, u.lastName),
        achievements: formattedAchievements,
        ratingPoints: u.elo,
        ratingDelta: 0,
        role: u.role,
      };
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
      body: JSON.stringify(players),
    };
  } catch (error: any) {
    console.error("[players]", error);

    let message = "Failed to fetch players";
    const code = error?.code;
    if (code === "P1001" || code === "P1002") {
      message = "Database connection failed. Check DATABASE_URL.";
    } else if (code === "P2021") {
      message = "Database table not found. Run prisma migrate deploy.";
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: message }),
    };
  }
};
