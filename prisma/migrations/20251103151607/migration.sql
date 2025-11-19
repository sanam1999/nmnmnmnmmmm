/*
  Warnings:

  - You are about to drop the `ReceiptPDF` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ReceiptPDF" DROP CONSTRAINT "ReceiptPDF_receiptId_fkey";

-- DropTable
DROP TABLE "public"."ReceiptPDF";
