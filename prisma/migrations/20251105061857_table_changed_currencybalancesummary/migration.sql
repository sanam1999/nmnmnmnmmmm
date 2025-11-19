/*
  Warnings:

  - You are about to drop the `currency_balance_summary` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."currency_balance_summary";

-- CreateTable
CREATE TABLE "CurrencyBalanceSummary" (
    "id" BIGSERIAL NOT NULL,
    "currencyType" TEXT NOT NULL,
    "summaryDate" TIMESTAMP(3) NOT NULL,
    "openingBalance" DOUBLE PRECISION NOT NULL,
    "purchases" DOUBLE PRECISION NOT NULL,
    "exchangeBuy" DOUBLE PRECISION NOT NULL,
    "exchangeSell" DOUBLE PRECISION NOT NULL,
    "sales" DOUBLE PRECISION NOT NULL,
    "deposits" DOUBLE PRECISION NOT NULL,
    "closingBalance" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CurrencyBalanceSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyBalanceSummary_currencyType_summaryDate_key" ON "CurrencyBalanceSummary"("currencyType", "summaryDate");
