-- CreateEnum
CREATE TYPE "ExpertDocumentType" AS ENUM ('CV', 'PORTFOLIO');

-- CreateTable
CREATE TABLE "ExpertDocument" (
    "id" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "type" "ExpertDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpertDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpertDocument_expertId_idx" ON "ExpertDocument"("expertId");

-- CreateIndex
CREATE INDEX "ExpertDocument_type_idx" ON "ExpertDocument"("type");

-- CreateIndex
CREATE INDEX "ExpertDocument_createdAt_idx" ON "ExpertDocument"("createdAt");

-- AddForeignKey
ALTER TABLE "ExpertDocument" ADD CONSTRAINT "ExpertDocument_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "ExpertProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
