-- AlterTable
ALTER TABLE "WorkoutSession" ADD COLUMN     "readinessAskedAt" TIMESTAMP(3),
ADD COLUMN     "readinessEnergy" INTEGER,
ADD COLUMN     "readinessScore" INTEGER,
ADD COLUMN     "readinessSleep" INTEGER,
ADD COLUMN     "readinessSoreness" INTEGER;

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "path" TEXT,
    "digest" TEXT,
    "userId" TEXT,
    "userAgent" TEXT,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");

-- CreateIndex
CREATE INDEX "ErrorLog_fingerprint_createdAt_idx" ON "ErrorLog"("fingerprint", "createdAt");

-- AddForeignKey
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
