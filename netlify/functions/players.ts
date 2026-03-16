import type { Config } from "@netlify/functions";
import { prisma } from "./lib/prisma";

export default async function handler(req: Request) {
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
        name: `${u.firstName} ${u.lastName}`.trim(),
        achievements: formattedAchievements,
        ratingPoints: u.elo,
        ratingDelta: 0,
        role: u.role, // "ADMIN", "USER", or "UNVERIFIED_USER"
      };
    });

    return new Response(JSON.stringify(players), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Failed to fetch players" }), {
      status: 500,
    });
  }
}

export const config: Config = {
  path: "/api/players",
};