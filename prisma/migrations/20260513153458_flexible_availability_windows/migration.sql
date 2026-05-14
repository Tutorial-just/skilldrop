/*
  Warnings:

  - You are about to drop the column `isBooked` on the `Availability` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_PENDING_PAYMENT';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_EXPIRED';

-- DropIndex
DROP INDEX "Availability_expertId_isBooked_idx";

-- DropIndex
DROP INDEX "Availability_isBooked_idx";

-- DropIndex
DROP INDEX "Booking_availabilityId_key";

-- AlterTable
ALTER TABLE "Availability" DROP COLUMN "isBooked",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Availability_isActive_idx" ON "Availability"("isActive");

-- CreateIndex
CREATE INDEX "Availability_expertId_isActive_idx" ON "Availability"("expertId", "isActive");

-- CreateIndex
CREATE INDEX "Booking_availabilityId_idx" ON "Booking"("availabilityId");

-- CreateIndex
CREATE INDEX "Booking_expertId_startTime_endTime_idx" ON "Booking"("expertId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "Booking_expertId_status_startTime_idx" ON "Booking"("expertId", "status", "startTime");
