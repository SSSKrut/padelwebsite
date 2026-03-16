import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma";

const globalAny = globalThis as unknown as { _prisma?: PrismaClient };
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma: PrismaClient =
  globalAny._prisma ?? new PrismaClient({
  adapter: adapter,
})
globalAny._prisma = prisma;
