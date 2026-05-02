/*
  Warnings:

  - You are about to drop the column `apiToken` on the `jira_connections` table. All the data in the column will be lost.
  - You are about to drop the column `baseUrl` on the `jira_connections` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `jira_connections` table. All the data in the column will be lost.
  - You are about to drop the column `qualityFeedback` on the `test_scenarios` table. All the data in the column will be lost.
  - You are about to drop the column `qualityScore` on the `test_scenarios` table. All the data in the column will be lost.
  - Added the required column `accessToken` to the `jira_connections` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cloudId` to the `jira_connections` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiresAt` to the `jira_connections` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refreshToken` to the `jira_connections` table without a default value. This is not possible if the table is not empty.
  - Added the required column `siteName` to the `jira_connections` table without a default value. This is not possible if the table is not empty.
  - Added the required column `siteUrl` to the `jira_connections` table without a default value. This is not possible if the table is not empty.
  - Added the required column `groupId` to the `test_scenarios` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ScenarioGroupType" AS ENUM ('BUG', 'FEATURE', 'REGRESSION', 'SMOKE', 'INTEGRATION', 'E2E', 'PERFORMANCE', 'OTHER');

-- AlterTable
ALTER TABLE "jira_connections" DROP COLUMN "apiToken",
DROP COLUMN "baseUrl",
DROP COLUMN "email",
ADD COLUMN     "accessToken" TEXT NOT NULL,
ADD COLUMN     "cloudId" TEXT NOT NULL,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "refreshToken" TEXT NOT NULL,
ADD COLUMN     "siteName" TEXT NOT NULL,
ADD COLUMN     "siteUrl" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "test_scenarios" DROP COLUMN "qualityFeedback",
DROP COLUMN "qualityScore",
ADD COLUMN     "groupId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "scenario_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ScenarioGroupType" NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenario_groups_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "test_scenarios" ADD CONSTRAINT "test_scenarios_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "scenario_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_groups" ADD CONSTRAINT "scenario_groups_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
