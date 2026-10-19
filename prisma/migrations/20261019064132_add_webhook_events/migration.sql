-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "action" TEXT,
    "deliveryId" TEXT,
    "sourceRef" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_deliveryId_key" ON "webhook_events"("deliveryId");

-- CreateIndex
CREATE INDEX "webhook_events_provider_createdAt_idx" ON "webhook_events"("provider", "createdAt");
