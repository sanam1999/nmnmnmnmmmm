/*
  Warnings:

  - You are about to drop the `CurrencyBalanceSummary` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."CurrencyBalanceSummary";

-- CreateTable
CREATE TABLE "DailyCurrencyBalance" (
    "id" BIGSERIAL NOT NULL,
    "currencyType" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "openingBalance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "purchases" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "exchangeBuy" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "exchangeSell" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "sales" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "deposits" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL(18,4) NOT NULL DEFAULT 0,

    CONSTRAINT "DailyCurrencyBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyCurrencyBalance_currencyType_date_key" ON "DailyCurrencyBalance"("currencyType", "date");
