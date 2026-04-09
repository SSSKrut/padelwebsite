-- CreateTable
CREATE TABLE "EventCancellation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "cancelledById" TEXT NOT NULL,

    CONSTRAINT "EventCancellation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventCancellation_eventId_key" ON "EventCancellation"("eventId");

-- AddForeignKey
ALTER TABLE "EventCancellation" ADD CONSTRAINT "EventCancellation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCancellation" ADD CONSTRAINT "EventCancellation_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
