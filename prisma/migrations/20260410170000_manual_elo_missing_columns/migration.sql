-- AlterTable: add missing columns to EventManualElo
ALTER TABLE "EventManualElo" ADD COLUMN IF NOT EXISTS "previousElo" INTEGER;
ALTER TABLE "EventManualElo" ADD COLUMN IF NOT EXISTS "isWinner" BOOLEAN NOT NULL DEFAULT false;
