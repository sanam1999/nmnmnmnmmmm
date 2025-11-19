/*
  Warnings:

  - You are about to drop the `ReceiptPDF` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ReceiptPDF" DROP CONSTRAINT "ReceiptPDF_receiptId_fkey";

-- DropTable
DROP TABLE "public"."ReceiptPDF";

-- CreateTable
CREATE TABLE "CustomerReceiptPdf" (
    "id" BIGSERIAL NOT NULL,
    "receiptId" BIGINT,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerReceiptPdf_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerReceiptPdf_createdAt_idx" ON "CustomerReceiptPdf"("createdAt");

-- AddForeignKey
ALTER TABLE "CustomerReceiptPdf" ADD CONSTRAINT "CustomerReceiptPdf_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "CustomerReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
