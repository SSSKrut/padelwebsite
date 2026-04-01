-- AlterTable: add reminderSentAt to Event
ALTER TABLE "Event" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

-- CreateTable: PremiumSubscription
CREATE TABLE "PremiumSubscription" (
    "id" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,

    CONSTRAINT "PremiumSubscription_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PremiumSubscription" ADD CONSTRAINT "PremiumSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremiumSubscription" ADD CONSTRAINT "PremiumSubscription_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
