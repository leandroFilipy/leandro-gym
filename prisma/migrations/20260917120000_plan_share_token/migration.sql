-- AlterTable
ALTER TABLE "WorkoutPlan" ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutPlan_shareToken_key" ON "WorkoutPlan"("shareToken");
