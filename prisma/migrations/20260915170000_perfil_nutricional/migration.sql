-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE');

-- CreateEnum
CREATE TYPE "DietGoal" AS ENUM ('LOSE', 'MAINTAIN', 'GAIN');

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "activityLevel" "ActivityLevel" NOT NULL DEFAULT 'MODERATE',
ADD COLUMN     "autoNutritionGoal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "birthDate" DATE,
ADD COLUMN     "dietGoal" "DietGoal" NOT NULL DEFAULT 'MAINTAIN',
ADD COLUMN     "heightCm" DOUBLE PRECISION,
ADD COLUMN     "sex" "Sex";
