-- CreateTable
CREATE TABLE "UserEmailPreferences" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "welcome" BOOLEAN NOT NULL DEFAULT true,
    "emailVerification" BOOLEAN NOT NULL DEFAULT true,
    "passwordReset" BOOLEAN NOT NULL DEFAULT true,
    "accountApproved" BOOLEAN NOT NULL DEFAULT true,
    "eventRegistration" BOOLEAN NOT NULL DEFAULT true,
    "eventWaitlist" BOOLEAN NOT NULL DEFAULT true,
    "eventWaitlistPromotion" BOOLEAN NOT NULL DEFAULT true,
    "eventCancelled" BOOLEAN NOT NULL DEFAULT true,
    "eventReminder" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserEmailPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserEmailPreferences_userId_key" ON "UserEmailPreferences"("userId");

-- AddForeignKey
ALTER TABLE "UserEmailPreferences" ADD CONSTRAINT "UserEmailPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
