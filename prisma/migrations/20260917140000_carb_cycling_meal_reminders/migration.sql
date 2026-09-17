-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "carbCyclingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "restDayCarbsCut" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "mealRemindersEnabled" BOOLEAN NOT NULL DEFAULT false;
