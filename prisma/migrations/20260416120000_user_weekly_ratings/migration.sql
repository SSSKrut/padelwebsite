-- CreateTable
CREATE TABLE "UserWeeklyRating" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "rating" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "UserWeeklyRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserWeeklyRating_userId_weekStart_key" ON "UserWeeklyRating"("userId", "weekStart");
CREATE INDEX "UserWeeklyRating_weekStart_rank_idx" ON "UserWeeklyRating"("weekStart", "rank");

-- AddForeignKey
ALTER TABLE "UserWeeklyRating" ADD CONSTRAINT "UserWeeklyRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
