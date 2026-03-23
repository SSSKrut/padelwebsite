import type { Config } from "@netlify/functions";
import { prisma } from "./lib/prisma";
import { publicName } from "./lib/sanitize";

export default async function handler() {
  try {
    const users = await prisma.user.findMany({
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

    return new Response(JSON.stringify(players), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error: any) {
    console.error("[players]", error);

    let message = "Failed to fetch players";
    const code = error?.code;
    if (code === "P1001" || code === "P1002") {
      message = "Database connection failed. Check DATABASE_URL.";
    } else if (code === "P2021") {
      message = "Database table not found. Run prisma migrate deploy.";
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
    });
  }
}

export const config: Config = {
  path: "/api/players",
};
