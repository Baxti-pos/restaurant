-- CreateTable
CREATE TABLE "CommissionPayout" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "waiterId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionPayout_branchId_paidAt_idx" ON "CommissionPayout"("branchId", "paidAt");

-- CreateIndex
CREATE INDEX "CommissionPayout_waiterId_idx" ON "CommissionPayout"("waiterId");

-- AddForeignKey
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_waiterId_fkey" FOREIGN KEY ("waiterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
