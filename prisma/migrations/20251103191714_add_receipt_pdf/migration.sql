/*
  Warnings:

  - You are about to drop the `CustomerReceiptPdf` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."CustomerReceiptPdf" DROP CONSTRAINT "CustomerReceiptPdf_receiptId_fkey";

-- DropTable
DROP TABLE "public"."CustomerReceiptPdf";

-- CreateTable
CREATE TABLE "ReceiptPDF" (
    "id" BIGSERIAL NOT NULL,
    "receiptId" BIGINT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptPDF_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptPDF_receiptId_key" ON "ReceiptPDF"("receiptId");

-- AddForeignKey
ALTER TABLE "ReceiptPDF" ADD CONSTRAINT "ReceiptPDF_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "CustomerReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
