-- DropTable
DROP TABLE "webhook_events";

-- CreateTable
CREATE TABLE "scm_webhook_connections" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT,
    "secret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scm_webhook_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scm_webhook_events" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "action" TEXT,
    "deliveryId" TEXT,
    "sourceRef" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scm_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scm_webhook_connections_userId_idx" ON "scm_webhook_connections"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "scm_webhook_events_deliveryId_key" ON "scm_webhook_events"("deliveryId");

-- CreateIndex
CREATE INDEX "scm_webhook_events_connectionId_createdAt_idx" ON "scm_webhook_events"("connectionId", "createdAt");

-- AddForeignKey
ALTER TABLE "scm_webhook_connections" ADD CONSTRAINT "scm_webhook_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scm_webhook_connections" ADD CONSTRAINT "scm_webhook_connections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scm_webhook_events" ADD CONSTRAINT "scm_webhook_events_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "scm_webhook_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
