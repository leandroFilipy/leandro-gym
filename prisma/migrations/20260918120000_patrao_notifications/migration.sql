-- CreateEnum
CREATE TYPE "PatraoTone" AS ENUM ('MANSO', 'SEM_DO', 'CARRASCO');

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "nightCheckEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "patraoTone" "PatraoTone" NOT NULL DEFAULT 'MANSO';
