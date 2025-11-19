/*
  Warnings:

  - You are about to drop the `BalanceAdjustment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."BalanceAdjustment" DROP CONSTRAINT "BalanceAdjustment_receiptId_fkey";

-- DropTable
DROP TABLE "public"."BalanceAdjustment";
