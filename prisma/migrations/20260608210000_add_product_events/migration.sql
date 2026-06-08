-- Product funnel analytics. Best-effort events used by admin analytics.
CREATE TABLE "ProductEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "event" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductEvent_userId_idx" ON "ProductEvent"("userId");
CREATE INDEX "ProductEvent_email_idx" ON "ProductEvent"("email");
CREATE INDEX "ProductEvent_event_idx" ON "ProductEvent"("event");
CREATE INDEX "ProductEvent_entityType_entityId_idx" ON "ProductEvent"("entityType", "entityId");
CREATE INDEX "ProductEvent_createdAt_idx" ON "ProductEvent"("createdAt");
CREATE INDEX "ProductEvent_event_createdAt_idx" ON "ProductEvent"("event", "createdAt");

ALTER TABLE "ProductEvent" ADD CONSTRAINT "ProductEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
