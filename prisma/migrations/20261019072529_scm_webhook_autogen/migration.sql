-- AlterTable
ALTER TABLE "scm_webhook_connections" ADD COLUMN     "autoGenerate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "targetGroupId" TEXT;

-- AlterTable
ALTER TABLE "scm_webhook_events" ADD COLUMN     "error" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'RECEIVED';

-- AddForeignKey
ALTER TABLE "scm_webhook_connections" ADD CONSTRAINT "scm_webhook_connections_targetGroupId_fkey" FOREIGN KEY ("targetGroupId") REFERENCES "scenario_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
