-- CreateTable
CREATE TABLE "BookingReport" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingReport_bookingId_idx" ON "BookingReport"("bookingId");

-- CreateIndex
CREATE INDEX "BookingReport_reporterId_idx" ON "BookingReport"("reporterId");

-- CreateIndex
CREATE INDEX "BookingReport_status_idx" ON "BookingReport"("status");

-- AddForeignKey
ALTER TABLE "BookingReport" ADD CONSTRAINT "BookingReport_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReport" ADD CONSTRAINT "BookingReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
