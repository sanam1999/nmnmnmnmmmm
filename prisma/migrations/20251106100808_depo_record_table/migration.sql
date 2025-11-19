/*
  Warnings:

  - You are about to drop the column `createdById` on the `DepositRecord` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."DepositRecord" DROP CONSTRAINT "DepositRecord_createdById_fkey";

-- AlterTable
ALTER TABLE "DepositRecord" DROP COLUMN "createdById";
