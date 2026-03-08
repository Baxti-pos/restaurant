-- AlterTable
ALTER TABLE "User"
ADD COLUMN "telegramUsername" TEXT,
ADD COLUMN "salesSharePercent" DECIMAL(5,2) NOT NULL DEFAULT 8.00;

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramUsername_key" ON "User"("telegramUsername");
