-- Ensure UUID generation support for backfill inserts
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "EventMatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'WALKOVER', 'NO_CONTEST');

-- CreateEnum
CREATE TYPE "EventParticipantStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'DNF');

-- CreateEnum
CREATE TYPE "EventScoreLineStatus" AS ENUM ('VALID', 'VOIDED');

-- CreateEnum
CREATE TYPE "RatingSystem" AS ENUM ('ELO');

-- CreateEnum
CREATE TYPE "RatingReason" AS ENUM ('MATCH', 'EVENT_FINAL', 'MANUAL', 'IMPORT');

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventFormat" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "strategyKey" TEXT NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventFormat_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "competitionId" TEXT,
ADD COLUMN     "formatId" TEXT,
ADD COLUMN     "formatConfig" JSONB;

-- AlterTable
ALTER TABLE "EventMatch" ADD COLUMN     "status" "EventMatchStatus" NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "lockedByAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EventMatchSide" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "matchId" TEXT NOT NULL,
    "sideIndex" INTEGER NOT NULL,
    "name" TEXT,

    CONSTRAINT "EventMatchSide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMatchParticipant" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "matchSideId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seatIndex" INTEGER,
    "status" "EventParticipantStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "replacedById" TEXT,

    CONSTRAINT "EventMatchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventScoreLine" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "matchId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "scoreSide1" INTEGER,
    "scoreSide2" INTEGER,
    "status" "EventScoreLineStatus" NOT NULL DEFAULT 'VALID',
    "isCounted" BOOLEAN NOT NULL DEFAULT true,
    "enteredById" TEXT,
    "enteredAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "EventScoreLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRatingChange" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT,
    "ratingSystem" "RatingSystem" NOT NULL DEFAULT 'ELO',
    "reason" "RatingReason" NOT NULL DEFAULT 'MATCH',
    "before" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "after" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "EventRatingChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRatingSettings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "ratingSystem" "RatingSystem" NOT NULL DEFAULT 'ELO',
    "kFactor" INTEGER NOT NULL DEFAULT 40,
    "notes" TEXT,

    CONSTRAINT "UserRatingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventMatchSide_matchId_sideIndex_key" ON "EventMatchSide"("matchId", "sideIndex");

-- CreateIndex
CREATE UNIQUE INDEX "EventMatchParticipant_matchSideId_userId_key" ON "EventMatchParticipant"("matchSideId", "userId");

-- CreateIndex
CREATE INDEX "EventMatchParticipant_userId_idx" ON "EventMatchParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventScoreLine_matchId_sequence_key" ON "EventScoreLine"("matchId", "sequence");

-- CreateIndex
CREATE INDEX "EventScoreLine_matchId_status_idx" ON "EventScoreLine"("matchId", "status");

-- CreateIndex
CREATE INDEX "EventRatingChange_eventId_userId_idx" ON "EventRatingChange"("eventId", "userId");

-- CreateIndex
CREATE INDEX "EventRatingChange_matchId_idx" ON "EventRatingChange"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRatingSettings_userId_ratingSystem_key" ON "UserRatingSettings"("userId", "ratingSystem");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "EventFormat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMatch" ADD CONSTRAINT "EventMatch_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMatchSide" ADD CONSTRAINT "EventMatchSide_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "EventMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMatchParticipant" ADD CONSTRAINT "EventMatchParticipant_matchSideId_fkey" FOREIGN KEY ("matchSideId") REFERENCES "EventMatchSide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMatchParticipant" ADD CONSTRAINT "EventMatchParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMatchParticipant" ADD CONSTRAINT "EventMatchParticipant_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventScoreLine" ADD CONSTRAINT "EventScoreLine_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "EventMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventScoreLine" ADD CONSTRAINT "EventScoreLine_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRatingChange" ADD CONSTRAINT "EventRatingChange_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRatingChange" ADD CONSTRAINT "EventRatingChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRatingChange" ADD CONSTRAINT "EventRatingChange_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "EventMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRatingSettings" ADD CONSTRAINT "UserRatingSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill legacy EventFormat
INSERT INTO "EventFormat" ("id", "name", "description", "strategyKey", "config", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text,
       'Legacy King of the Court (5 players)',
       'Auto-generated format for legacy 5-player court matches',
       'KOTC_LEGACY_5P',
       '{"teamSize":2,"playersPerCourt":5,"rounds":5,"pairingStrategy":"KOTC_5P_CLASSIC","scoring":{"win":1,"draw":0.5,"loss":0,"tiebreakers":["points","diff","name"]},"elo":{"system":"ELO","kFactor":40,"mode":"PER_MATCH","applyOnConfirm":true}}'::jsonb,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "EventFormat" WHERE "strategyKey" = 'KOTC_LEGACY_5P'
);

-- Assign legacy format to events with existing matches
UPDATE "Event"
SET "formatId" = (
    SELECT "id" FROM "EventFormat" WHERE "strategyKey" = 'KOTC_LEGACY_5P' LIMIT 1
  ),
  "formatConfig" = (
    SELECT "config" FROM "EventFormat" WHERE "strategyKey" = 'KOTC_LEGACY_5P' LIMIT 1
  )
WHERE "formatId" IS NULL
  AND EXISTS (
    SELECT 1 FROM "EventMatch" WHERE "EventMatch"."eventId" = "Event"."id"
  );

-- Backfill match sides
INSERT INTO "EventMatchSide" ("id", "createdAt", "updatedAt", "matchId", "sideIndex")
SELECT gen_random_uuid()::text, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, em."id", 1
FROM "EventMatch" em
WHERE NOT EXISTS (
  SELECT 1 FROM "EventMatchSide" s
  WHERE s."matchId" = em."id" AND s."sideIndex" = 1
);

INSERT INTO "EventMatchSide" ("id", "createdAt", "updatedAt", "matchId", "sideIndex")
SELECT gen_random_uuid()::text, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, em."id", 2
FROM "EventMatch" em
WHERE NOT EXISTS (
  SELECT 1 FROM "EventMatchSide" s
  WHERE s."matchId" = em."id" AND s."sideIndex" = 2
);

-- Backfill match participants for side 1
INSERT INTO "EventMatchParticipant" ("id", "createdAt", "updatedAt", "matchSideId", "userId", "status")
SELECT gen_random_uuid()::text, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, s."id", em."pair1Player1Id", 'ACTIVE'
FROM "EventMatch" em
JOIN "EventMatchSide" s ON s."matchId" = em."id" AND s."sideIndex" = 1
WHERE NOT EXISTS (
  SELECT 1 FROM "EventMatchParticipant" p
  WHERE p."matchSideId" = s."id" AND p."userId" = em."pair1Player1Id"
);

INSERT INTO "EventMatchParticipant" ("id", "createdAt", "updatedAt", "matchSideId", "userId", "status")
SELECT gen_random_uuid()::text, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, s."id", em."pair1Player2Id", 'ACTIVE'
FROM "EventMatch" em
JOIN "EventMatchSide" s ON s."matchId" = em."id" AND s."sideIndex" = 1
WHERE NOT EXISTS (
  SELECT 1 FROM "EventMatchParticipant" p
  WHERE p."matchSideId" = s."id" AND p."userId" = em."pair1Player2Id"
);

-- Backfill match participants for side 2
INSERT INTO "EventMatchParticipant" ("id", "createdAt", "updatedAt", "matchSideId", "userId", "status")
SELECT gen_random_uuid()::text, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, s."id", em."pair2Player1Id", 'ACTIVE'
FROM "EventMatch" em
JOIN "EventMatchSide" s ON s."matchId" = em."id" AND s."sideIndex" = 2
WHERE NOT EXISTS (
  SELECT 1 FROM "EventMatchParticipant" p
  WHERE p."matchSideId" = s."id" AND p."userId" = em."pair2Player1Id"
);

INSERT INTO "EventMatchParticipant" ("id", "createdAt", "updatedAt", "matchSideId", "userId", "status")
SELECT gen_random_uuid()::text, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, s."id", em."pair2Player2Id", 'ACTIVE'
FROM "EventMatch" em
JOIN "EventMatchSide" s ON s."matchId" = em."id" AND s."sideIndex" = 2
WHERE NOT EXISTS (
  SELECT 1 FROM "EventMatchParticipant" p
  WHERE p."matchSideId" = s."id" AND p."userId" = em."pair2Player2Id"
);

-- Backfill score line (sequence 1) for existing scores
INSERT INTO "EventScoreLine" (
  "id", "createdAt", "updatedAt", "matchId", "sequence", "scoreSide1", "scoreSide2", "status", "isCounted", "enteredById", "enteredAt"
)
SELECT gen_random_uuid()::text, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, em."id", 1, em."score1", em."score2", 'VALID', true, em."updatedById", em."updatedAt"
FROM "EventMatch" em
WHERE (em."score1" IS NOT NULL OR em."score2" IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM "EventScoreLine" sl
    WHERE sl."matchId" = em."id" AND sl."sequence" = 1
  );

-- Update match status for completed legacy matches
UPDATE "EventMatch"
SET "status" = 'COMPLETED'
WHERE ("score1" IS NOT NULL OR "score2" IS NOT NULL)
  AND "status" = 'SCHEDULED';

-- Backfill manual ELO entries into rating changes
INSERT INTO "EventRatingChange" (
  "id", "createdAt", "eventId", "userId", "ratingSystem", "reason", "before", "delta", "after", "appliedAt"
)
SELECT gen_random_uuid()::text,
       CURRENT_TIMESTAMP,
       eme."eventId",
       eme."userId",
       'ELO',
       'MANUAL',
       COALESCE(eme."previousElo", eme."newElo"),
       eme."newElo" - COALESCE(eme."previousElo", eme."newElo"),
       eme."newElo",
       eme."updatedAt"
FROM "EventManualElo" eme
WHERE NOT EXISTS (
  SELECT 1 FROM "EventRatingChange" erc
  WHERE erc."eventId" = eme."eventId"
    AND erc."userId" = eme."userId"
    AND erc."reason" = 'MANUAL'
);

-- Backfill event-level ELO into rating changes
INSERT INTO "EventRatingChange" (
  "id", "createdAt", "eventId", "userId", "ratingSystem", "reason", "before", "delta", "after", "appliedAt"
)
SELECT gen_random_uuid()::text,
       CURRENT_TIMESTAMP,
       es."eventId",
       es."userId",
       'ELO',
       'EVENT_FINAL',
       es."previousElo",
       es."newElo" - es."previousElo",
       es."newElo",
       es."updatedAt"
FROM "EventScore" es
WHERE NOT EXISTS (
  SELECT 1 FROM "EventRatingChange" erc
  WHERE erc."eventId" = es."eventId"
    AND erc."userId" = es."userId"
    AND erc."reason" = 'EVENT_FINAL'
);

-- Backfill per-user rating settings with default K-factor
INSERT INTO "UserRatingSettings" ("id", "createdAt", "updatedAt", "userId", "ratingSystem", "kFactor")
SELECT gen_random_uuid()::text, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, u."id", 'ELO', 40
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "UserRatingSettings" urs
  WHERE urs."userId" = u."id" AND urs."ratingSystem" = 'ELO'
);
