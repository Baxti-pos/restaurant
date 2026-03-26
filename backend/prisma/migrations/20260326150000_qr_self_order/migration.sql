-- CreateEnum
CREATE TYPE "GuestSessionStatus" AS ENUM ('OPEN', 'EXPIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "QrOrderRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ServiceRequestType" AS ENUM ('CALL_WAITER');

-- CreateEnum
CREATE TYPE "OrderItemSource" AS ENUM ('STAFF', 'QR_CUSTOMER');

-- CreateEnum
CREATE TYPE "OrderItemFulfillmentStatus" AS ENUM ('ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELED');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "fulfillmentStatus" "OrderItemFulfillmentStatus" NOT NULL DEFAULT 'ACCEPTED',
ADD COLUMN     "guestSessionId" TEXT,
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "source" "OrderItemSource" NOT NULL DEFAULT 'STAFF';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "description" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "portionLabel" TEXT;

-- AlterTable
ALTER TABLE "Table" ADD COLUMN     "callWaiterEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "qrEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "qrLastGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "qrLastScannedAt" TIMESTAMP(3),
ADD COLUMN     "qrPublicToken" TEXT,
ADD COLUMN     "qrVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "selfOrderEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "GuestTableSession" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "publicSessionKey" TEXT NOT NULL,
    "status" "GuestSessionStatus" NOT NULL DEFAULT 'OPEN',
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSubmittedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "GuestTableSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrOrderRequest" (
    "id" TEXT NOT NULL,
    "publicCode" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "guestSessionId" TEXT NOT NULL,
    "linkedOrderId" TEXT,
    "status" "QrOrderRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "rejectionReason" TEXT,
    "subtotalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "acceptedAt" TIMESTAMP(3),
    "acceptedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QrOrderRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrOrderRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "productId" TEXT,
    "productNameSnapshot" TEXT NOT NULL,
    "productImageUrlSnapshot" TEXT,
    "portionLabelSnapshot" TEXT,
    "unitPriceSnapshot" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QrOrderRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "publicCode" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "guestSessionId" TEXT NOT NULL,
    "requestType" "ServiceRequestType" NOT NULL DEFAULT 'CALL_WAITER',
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestTableSession_publicSessionKey_key" ON "GuestTableSession"("publicSessionKey");

-- CreateIndex
CREATE INDEX "GuestTableSession_branchId_tableId_status_lastSeenAt_idx" ON "GuestTableSession"("branchId", "tableId", "status", "lastSeenAt");

-- CreateIndex
CREATE INDEX "GuestTableSession_tableId_status_startedAt_idx" ON "GuestTableSession"("tableId", "status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "QrOrderRequest_publicCode_key" ON "QrOrderRequest"("publicCode");

-- CreateIndex
CREATE INDEX "QrOrderRequest_branchId_status_createdAt_idx" ON "QrOrderRequest"("branchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "QrOrderRequest_tableId_status_createdAt_idx" ON "QrOrderRequest"("tableId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "QrOrderRequest_guestSessionId_createdAt_idx" ON "QrOrderRequest"("guestSessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QrOrderRequest_guestSessionId_clientRequestId_key" ON "QrOrderRequest"("guestSessionId", "clientRequestId");

-- CreateIndex
CREATE INDEX "QrOrderRequestItem_requestId_idx" ON "QrOrderRequestItem"("requestId");

-- CreateIndex
CREATE INDEX "QrOrderRequestItem_productId_idx" ON "QrOrderRequestItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_publicCode_key" ON "ServiceRequest"("publicCode");

-- CreateIndex
CREATE INDEX "ServiceRequest_branchId_status_createdAt_idx" ON "ServiceRequest"("branchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_tableId_status_createdAt_idx" ON "ServiceRequest"("tableId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_guestSessionId_createdAt_idx" ON "ServiceRequest"("guestSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_requestId_idx" ON "OrderItem"("requestId");

-- CreateIndex
CREATE INDEX "OrderItem_guestSessionId_idx" ON "OrderItem"("guestSessionId");

-- CreateIndex
CREATE INDEX "OrderItem_fulfillmentStatus_idx" ON "OrderItem"("fulfillmentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Table_qrPublicToken_key" ON "Table"("qrPublicToken");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "QrOrderRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestTableSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestTableSession" ADD CONSTRAINT "GuestTableSession_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestTableSession" ADD CONSTRAINT "GuestTableSession_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrOrderRequest" ADD CONSTRAINT "QrOrderRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrOrderRequest" ADD CONSTRAINT "QrOrderRequest_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrOrderRequest" ADD CONSTRAINT "QrOrderRequest_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestTableSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrOrderRequest" ADD CONSTRAINT "QrOrderRequest_linkedOrderId_fkey" FOREIGN KEY ("linkedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrOrderRequest" ADD CONSTRAINT "QrOrderRequest_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrOrderRequest" ADD CONSTRAINT "QrOrderRequest_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrOrderRequestItem" ADD CONSTRAINT "QrOrderRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "QrOrderRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrOrderRequestItem" ADD CONSTRAINT "QrOrderRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestTableSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
