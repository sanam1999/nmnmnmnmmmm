-- CreateTable
CREATE TABLE "currency_balance_summary" (
    "id" BIGSERIAL NOT NULL,
    "summary_date" TIMESTAMP(3) NOT NULL,
    "currency_type" TEXT NOT NULL,
    "purchases" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "exchangeBuy" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "exchangeSell" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sales" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "deposits" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "currency_balance_summary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currency_balance_summary_summary_date_currency_type_key" ON "currency_balance_summary"("summary_date", "currency_type");
