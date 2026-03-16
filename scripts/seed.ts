import { PrismaClient } from "../generated/prisma";
import playersData from "../data/players.json";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding players with new schema...");

  for (const player of playersData) {
    const email = `${player.name.toLowerCase().replace(/[^a-z0-9]/gi, ".")}@example.com`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        elo: player.ratingPoints,
        firstName: player.name,
      },
      create: {
        email,
        passwordHash: "mock_hash",
        firstName: player.name,
        lastName: " ",
        elo: player.ratingPoints,
        role: "USER", // Seeded players get USER role by default
      },
    });

    console.log(`Upserted user: ${user.firstName} with ID: ${user.id}`);

    if (player.achievements && player.achievements.length > 0) {
      for (const achTitle of player.achievements) {
        // Upsert achievement type
        const achievement = await prisma.achievement.upsert({
          where: { title: achTitle },
          update: {},
          create: { title: achTitle },
        });

        // Check if user already has this exact achievement instance
        // Actually, we'll just add it if they don't have ANY instance of it yet, 
        // to avoid infinite loops on re-seed. Or better yet:
        const existingLog = await prisma.userAchievement.findFirst({
          where: { userId: user.id, achievementId: achievement.id },
        });

        if (!existingLog) {
          await prisma.userAchievement.create({
            data: {
              userId: user.id,
              achievementId: achievement.id,
            },
          });
          console.log(`  Granted achievement: ${achTitle}`);
        }
      }
    }
  }

  // Also create a default ADMIN user
  const adminEmail = "admin@padel.com";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      passwordHash: "mock_hash",
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
    }
  });
  console.log("Seeded admin user: admin@padel.com");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });