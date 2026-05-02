-- AlterTable
ALTER TABLE "test_scenarios" ADD COLUMN     "category" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "expectedResult" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "preconditions" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "steps" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;
