/*
  Warnings:

  - You are about to drop the column `amountFcy` on the `CustomerReceipt` table. All the data in the column will be lost.
  - You are about to drop the column `amountIssuedLkr` on the `CustomerReceipt` table. All the data in the column will be lost.
  - You are about to drop the column `currencyType` on the `CustomerReceipt` table. All the data in the column will be lost.
  - You are about to drop the column `rateOffered` on the `CustomerReceipt` table. All the data in the column will be lost.
  - You are about to drop the `Currency` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "CustomerReceipt" DROP COLUMN "amountFcy",
DROP COLUMN "amountIssuedLkr",
DROP COLUMN "currencyType",
DROP COLUMN "rateOffered";

-- DropTable
DROP TABLE "public"."Currency";

-- CreateTable
CREATE TABLE "CustomerReceiptCurrency" (
    "id" BIGSERIAL NOT NULL,
    "receiptId" BIGINT NOT NULL,
    "currencyType" TEXT NOT NULL,
    "amountFcy" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "rateOffered" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "amountIssuedLkr" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "CustomerReceiptCurrency_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CustomerReceiptCurrency" ADD CONSTRAINT "CustomerReceiptCurrency_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "CustomerReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
