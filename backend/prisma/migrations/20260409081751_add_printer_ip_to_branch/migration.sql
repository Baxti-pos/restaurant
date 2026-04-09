-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "printerIp" TEXT,
ADD COLUMN     "printerPort" INTEGER NOT NULL DEFAULT 9100;
