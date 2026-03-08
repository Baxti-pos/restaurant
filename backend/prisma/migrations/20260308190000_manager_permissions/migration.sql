-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MANAGER';

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "ManagerBranch" (
    "id" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagerBranch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagerBranch_managerId_branchId_key" ON "ManagerBranch"("managerId", "branchId");

-- CreateIndex
CREATE INDEX "ManagerBranch_branchId_isActive_idx" ON "ManagerBranch"("branchId", "isActive");

-- CreateIndex
CREATE INDEX "ManagerBranch_managerId_isActive_idx" ON "ManagerBranch"("managerId", "isActive");

-- AddForeignKey
ALTER TABLE "ManagerBranch" ADD CONSTRAINT "ManagerBranch_managerId_fkey"
FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerBranch" ADD CONSTRAINT "ManagerBranch_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
