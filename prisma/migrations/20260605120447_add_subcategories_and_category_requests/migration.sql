-- CreateEnum
CREATE TYPE "HelpType" AS ENUM ('ADVICE', 'EXPLANATION', 'TEACHING', 'PRACTICAL_GUIDANCE', 'PERSONAL_EXPERIENCE', 'EMOTIONAL_SUPPORT', 'RELIGIOUS_DISCUSSION', 'BUSINESS_MENTORING', 'OTHER');

-- CreateEnum
CREATE TYPE "CategoryRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'MERGED');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "helpType" "HelpType" NOT NULL DEFAULT 'ADVICE',
ADD COLUMN     "subcategoryId" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Subcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "categoryId" TEXT,
    "query" TEXT NOT NULL,
    "suggestedName" TEXT,
    "description" TEXT,
    "status" "CategoryRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subcategory_categoryId_idx" ON "Subcategory"("categoryId");

-- CreateIndex
CREATE INDEX "Subcategory_slug_idx" ON "Subcategory"("slug");

-- CreateIndex
CREATE INDEX "Subcategory_isActive_idx" ON "Subcategory"("isActive");

-- CreateIndex
CREATE INDEX "Subcategory_sortOrder_idx" ON "Subcategory"("sortOrder");

-- CreateIndex
CREATE INDEX "Subcategory_createdAt_idx" ON "Subcategory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subcategory_categoryId_slug_key" ON "Subcategory"("categoryId", "slug");

-- CreateIndex
CREATE INDEX "CategoryRequest_userId_idx" ON "CategoryRequest"("userId");

-- CreateIndex
CREATE INDEX "CategoryRequest_categoryId_idx" ON "CategoryRequest"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryRequest_status_idx" ON "CategoryRequest"("status");

-- CreateIndex
CREATE INDEX "CategoryRequest_createdAt_idx" ON "CategoryRequest"("createdAt");

-- CreateIndex
CREATE INDEX "CategoryRequest_status_createdAt_idx" ON "CategoryRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Category_sortOrder_idx" ON "Category"("sortOrder");

-- CreateIndex
CREATE INDEX "Service_subcategoryId_idx" ON "Service"("subcategoryId");

-- CreateIndex
CREATE INDEX "Service_helpType_idx" ON "Service"("helpType");

-- CreateIndex
CREATE INDEX "Service_categoryId_isActive_idx" ON "Service"("categoryId", "isActive");

-- CreateIndex
CREATE INDEX "Service_subcategoryId_isActive_idx" ON "Service"("subcategoryId", "isActive");

-- CreateIndex
CREATE INDEX "Service_helpType_isActive_idx" ON "Service"("helpType", "isActive");

-- AddForeignKey
ALTER TABLE "Subcategory" ADD CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRequest" ADD CONSTRAINT "CategoryRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRequest" ADD CONSTRAINT "CategoryRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
