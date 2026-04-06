-- CreateTable
CREATE TABLE "EventManualElo" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newElo" INTEGER NOT NULL,

    CONSTRAINT "EventManualElo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventManualElo_eventId_userId_key" ON "EventManualElo"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "EventManualElo" ADD CONSTRAINT "EventManualElo_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventManualElo" ADD CONSTRAINT "EventManualElo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
