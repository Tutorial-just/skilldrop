-- CreateIndex
CREATE INDEX "Booking_availabilityId_status_startTime_idx" ON "Booking"("availabilityId", "status", "startTime");
