-- CreateIndex
CREATE INDEX "Availability_isActive_startTime_idx" ON "Availability"("isActive", "startTime");

-- CreateIndex
CREATE INDEX "Availability_expertId_isActive_startTime_idx" ON "Availability"("expertId", "isActive", "startTime");

-- CreateIndex
CREATE INDEX "Booking_buyerId_startTime_idx" ON "Booking"("buyerId", "startTime");

-- CreateIndex
CREATE INDEX "Booking_buyerId_status_startTime_idx" ON "Booking"("buyerId", "status", "startTime");

-- CreateIndex
CREATE INDEX "Booking_buyerId_updatedAt_idx" ON "Booking"("buyerId", "updatedAt");

-- CreateIndex
CREATE INDEX "Booking_expertId_updatedAt_idx" ON "Booking"("expertId", "updatedAt");

-- CreateIndex
CREATE INDEX "Booking_status_createdAt_idx" ON "Booking"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_createdAt_status_idx" ON "Booking"("createdAt", "status");

-- CreateIndex
CREATE INDEX "BookingReport_status_createdAt_idx" ON "BookingReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BookingReport_bookingId_status_idx" ON "BookingReport"("bookingId", "status");

-- CreateIndex
CREATE INDEX "BookingReport_reporterId_createdAt_idx" ON "BookingReport"("reporterId", "createdAt");

-- CreateIndex
CREATE INDEX "ExpertProfile_status_rating_idx" ON "ExpertProfile"("status", "rating");

-- CreateIndex
CREATE INDEX "ExpertProfile_status_totalSessions_idx" ON "ExpertProfile"("status", "totalSessions");

-- CreateIndex
CREATE INDEX "ExpertProfile_status_createdAt_idx" ON "ExpertProfile"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ExpertProfile_status_isVerified_rating_idx" ON "ExpertProfile"("status", "isVerified", "rating");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_email_createdAt_idx" ON "Notification"("email", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_email_isRead_createdAt_idx" ON "Notification"("email", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Review_expertId_createdAt_idx" ON "Review"("expertId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_buyerId_createdAt_idx" ON "Review"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_rating_createdAt_idx" ON "Review"("rating", "createdAt");

-- CreateIndex
CREATE INDEX "Review_wouldRecommend_createdAt_idx" ON "Review"("wouldRecommend", "createdAt");

-- CreateIndex
CREATE INDEX "Review_problemSolved_createdAt_idx" ON "Review"("problemSolved", "createdAt");
