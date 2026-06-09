-- Marketplace quality layers: service moderation, problem attachments and dispute resolution notes.
CREATE TYPE "ServiceModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'NEEDS_CHANGES', 'REJECTED');

ALTER TABLE "Service"
  ADD COLUMN "moderationStatus" "ServiceModerationStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "moderationNote" TEXT,
  ADD COLUMN "moderatedAt" TIMESTAMP(3);

CREATE INDEX "Service_moderationStatus_idx" ON "Service"("moderationStatus");

CREATE TABLE "HelpRequestAttachment" (
  "id" TEXT NOT NULL,
  "helpRequestId" TEXT NOT NULL,
  "title" TEXT,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HelpRequestAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HelpRequestAttachment_helpRequestId_idx" ON "HelpRequestAttachment"("helpRequestId");
CREATE INDEX "HelpRequestAttachment_createdAt_idx" ON "HelpRequestAttachment"("createdAt");

ALTER TABLE "HelpRequestAttachment"
  ADD CONSTRAINT "HelpRequestAttachment_helpRequestId_fkey"
  FOREIGN KEY ("helpRequestId") REFERENCES "HelpRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingReport"
  ADD COLUMN "adminNote" TEXT,
  ADD COLUMN "resolvedAt" TIMESTAMP(3);
