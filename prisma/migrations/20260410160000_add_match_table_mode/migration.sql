-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "MatchTableMode" AS ENUM ('AUTO_COURTS', 'MANUAL_ELO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "matchTableMode" "MatchTableMode" NOT NULL DEFAULT 'AUTO_COURTS';
