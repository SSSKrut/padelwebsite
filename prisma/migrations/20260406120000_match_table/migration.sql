-- CreateEnum
CREATE TYPE "MatchTableStatus" AS ENUM ('DRAFT', 'OPEN', 'CONFIRMED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "matchTableStatus" "MatchTableStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "matchTableGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "matchTableConfirmedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EventCourtAssignment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courtNumber" INTEGER NOT NULL,

    CONSTRAINT "EventCourtAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMatch" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,
    "courtNumber" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "pair1Player1Id" TEXT NOT NULL,
    "pair1Player2Id" TEXT NOT NULL,
    "pair2Player1Id" TEXT NOT NULL,
    "pair2Player2Id" TEXT NOT NULL,
    "score1" INTEGER,
    "score2" INTEGER,
    "updatedById" TEXT,

    CONSTRAINT "EventMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventCourtAssignment_eventId_userId_key" ON "EventCourtAssignment"("eventId", "userId");

-- CreateIndex
CREATE INDEX "EventCourtAssignment_eventId_courtNumber_idx" ON "EventCourtAssignment"("eventId", "courtNumber");

-- CreateIndex
CREATE INDEX "EventMatch_eventId_courtNumber_round_idx" ON "EventMatch"("eventId", "courtNumber", "round");

-- AddForeignKey
ALTER TABLE "EventCourtAssignment" ADD CONSTRAINT "EventCourtAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCourtAssignment" ADD CONSTRAINT "EventCourtAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMatch" ADD CONSTRAINT "EventMatch_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
