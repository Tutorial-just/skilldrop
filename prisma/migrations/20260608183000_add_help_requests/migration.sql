-- Add saved buyer problems / help requests.
-- This separates real buyer demand from CategoryRequest, which is only for missing categories/topics.

CREATE TYPE "HelpUrgency" AS ENUM ('TODAY', 'THIS_WEEK', 'FLEXIBLE');
CREATE TYPE "HelpRequestStatus" AS ENUM ('OPEN', 'MATCHED', 'BOOKED', 'CLOSED', 'NO_MATCH');

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

CREATE INDEX "HelpRequest_buyerId_idx" ON "HelpRequest"("buyerId");
CREATE INDEX "HelpRequest_categoryId_idx" ON "HelpRequest"("categoryId");
CREATE INDEX "HelpRequest_subcategoryId_idx" ON "HelpRequest"("subcategoryId");
CREATE INDEX "HelpRequest_helpType_idx" ON "HelpRequest"("helpType");
CREATE INDEX "HelpRequest_urgency_idx" ON "HelpRequest"("urgency");
CREATE INDEX "HelpRequest_status_idx" ON "HelpRequest"("status");
CREATE INDEX "HelpRequest_createdAt_idx" ON "HelpRequest"("createdAt");
CREATE INDEX "HelpRequest_buyerId_status_idx" ON "HelpRequest"("buyerId", "status");
CREATE INDEX "HelpRequest_status_createdAt_idx" ON "HelpRequest"("status", "createdAt");

ALTER TABLE "HelpRequest" ADD CONSTRAINT "HelpRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HelpRequest" ADD CONSTRAINT "HelpRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HelpRequest" ADD CONSTRAINT "HelpRequest_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
