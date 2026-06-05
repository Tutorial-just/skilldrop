-- CreateTable
CREATE TABLE "ExpertSettings" (
    "id" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "bookingEmails" BOOLEAN NOT NULL DEFAULT true,
    "callReminders" BOOLEAN NOT NULL DEFAULT true,
    "reviewAlerts" BOOLEAN NOT NULL DEFAULT true,
    "weeklySummary" BOOLEAN NOT NULL DEFAULT false,
    "profileVisible" BOOLEAN NOT NULL DEFAULT true,
    "showAvailability" BOOLEAN NOT NULL DEFAULT true,
    "showStartingPrice" BOOLEAN NOT NULL DEFAULT true,
    "showLanguages" BOOLEAN NOT NULL DEFAULT true,
    "autoConfirmBookings" BOOLEAN NOT NULL DEFAULT false,
    "allowSameDayBookings" BOOLEAN NOT NULL DEFAULT true,
    "minimumNoticeMinutes" INTEGER NOT NULL DEFAULT 120,
    "bufferBetweenCallsMin" INTEGER NOT NULL DEFAULT 10,
    "hideEmailFromBuyers" BOOLEAN NOT NULL DEFAULT true,
    "requireBuyerMessage" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpertSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpertSettings_expertId_key" ON "ExpertSettings"("expertId");

-- CreateIndex
CREATE INDEX "ExpertSettings_expertId_idx" ON "ExpertSettings"("expertId");

-- AddForeignKey
ALTER TABLE "ExpertSettings" ADD CONSTRAINT "ExpertSettings_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "ExpertProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
