import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma";

if (!process.env.DATABASE_URL) {
  console.error("[prisma] DATABASE_URL is not set. Database queries will fail.");
}

const globalAny = globalThis as unknown as { _prisma?: PrismaClient };
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
export const prisma: PrismaClient =
  globalAny._prisma ?? new PrismaClient({
  adapter: adapter,
})
globalAny._prisma = prisma;
