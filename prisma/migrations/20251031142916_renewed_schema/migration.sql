/*
  Warnings:

  - You are about to drop the column `currencyId` on the `CustomerReceipt` table. All the data in the column will be lost.
  - You are about to drop the `Currency` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExchangeRate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."CustomerReceipt" DROP CONSTRAINT "CustomerReceipt_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExchangeRate" DROP CONSTRAINT "ExchangeRate_currencyId_fkey";

-- AlterTable
ALTER TABLE "CustomerReceipt" DROP COLUMN "currencyId",
ADD COLUMN     "currencyType" TEXT;

-- DropTable
DROP TABLE "public"."Currency";

-- DropTable
DROP TABLE "public"."ExchangeRate";
