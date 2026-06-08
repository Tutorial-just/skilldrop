-- CreateEnum
CREATE TYPE "HelpUrgency" AS ENUM ('TODAY', 'THIS_WEEK', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "HelpRequestStatus" AS ENUM ('OPEN', 'MATCHED', 'BOOKED', 'CLOSED', 'NO_MATCH');

-- CreateTable
CREATE TABLE "HelpRequest" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "query" TEXT NOT NULL,
    "helpType" "HelpType",
    "urgency" "HelpUrgency" NOT NULL DEFAULT 'FLEXIBLE',
    "preferredLanguage" TEXT,
    "budgetMaxCents" INTEGER,
    "status" "HelpRequestStatus" NOT NULL DEFAULT 'OPEN',
    "selectedExpertId" TEXT,
    "selectedServiceId" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallOutcome" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "problemSummary" TEXT NOT NULL,
    "discussionNotes" TEXT,
    "nextSteps" TEXT NOT NULL,
    "usefulLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "followUpRecommended" BOOLEAN NOT NULL DEFAULT false,
    "followUpNote" TEXT,
    "isVisibleToBuyer" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HelpRequest_buyerId_idx" ON "HelpRequest"("buyerId");

-- CreateIndex
CREATE INDEX "HelpRequest_categoryId_idx" ON "HelpRequest"("categoryId");

-- CreateIndex
CREATE INDEX "HelpRequest_subcategoryId_idx" ON "HelpRequest"("subcategoryId");

-- CreateIndex
CREATE INDEX "HelpRequest_helpType_idx" ON "HelpRequest"("helpType");

-- CreateIndex
CREATE INDEX "HelpRequest_urgency_idx" ON "HelpRequest"("urgency");

-- CreateIndex
CREATE INDEX "HelpRequest_status_idx" ON "HelpRequest"("status");

-- CreateIndex
CREATE INDEX "HelpRequest_createdAt_idx" ON "HelpRequest"("createdAt");

-- CreateIndex
CREATE INDEX "HelpRequest_buyerId_status_idx" ON "HelpRequest"("buyerId", "status");

-- CreateIndex
CREATE INDEX "HelpRequest_status_createdAt_idx" ON "HelpRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CallOutcome_bookingId_key" ON "CallOutcome"("bookingId");

-- CreateIndex
CREATE INDEX "CallOutcome_bookingId_idx" ON "CallOutcome"("bookingId");

-- CreateIndex
CREATE INDEX "CallOutcome_buyerId_idx" ON "CallOutcome"("buyerId");

-- CreateIndex
CREATE INDEX "CallOutcome_expertId_idx" ON "CallOutcome"("expertId");

-- CreateIndex
CREATE INDEX "CallOutcome_createdAt_idx" ON "CallOutcome"("createdAt");

-- CreateIndex
CREATE INDEX "CallOutcome_buyerId_createdAt_idx" ON "CallOutcome"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "CallOutcome_expertId_createdAt_idx" ON "CallOutcome"("expertId", "createdAt");

-- AddForeignKey
ALTER TABLE "HelpRequest" ADD CONSTRAINT "HelpRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpRequest" ADD CONSTRAINT "HelpRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpRequest" ADD CONSTRAINT "HelpRequest_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallOutcome" ADD CONSTRAINT "CallOutcome_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallOutcome" ADD CONSTRAINT "CallOutcome_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallOutcome" ADD CONSTRAINT "CallOutcome_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "ExpertProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
