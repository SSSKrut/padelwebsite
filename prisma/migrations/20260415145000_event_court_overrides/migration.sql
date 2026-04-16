-- CreateTable
CREATE TABLE "EventCourtOverride" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,
    "courtNumber" INTEGER NOT NULL,
    "isManual" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EventCourtOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventCourtOverride_eventId_courtNumber_key" ON "EventCourtOverride"("eventId", "courtNumber");

-- CreateIndex
CREATE INDEX "EventCourtOverride_eventId_courtNumber_idx" ON "EventCourtOverride"("eventId", "courtNumber");

-- AddForeignKey
ALTER TABLE "EventCourtOverride" ADD CONSTRAINT "EventCourtOverride_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
