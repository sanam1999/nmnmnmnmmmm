-- CreateTable
CREATE TABLE "Currency" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "symbol" TEXT,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" SERIAL NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "rateDate" TIMESTAMP(3) NOT NULL,
    "buyRate" DECIMAL(18,6),
    "sellRate" DECIMAL(18,6),

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerReceipt" (
    "id" BIGSERIAL NOT NULL,
    "permitNo" TEXT NOT NULL DEFAULT 'DEF/RD/6000',
    "serialNumber" TEXT NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL,
    "customerName" TEXT,
    "nicPassport" TEXT,
    "sourceOfForeignCurrency" TEXT,
    "currencyId" INTEGER NOT NULL,
    "amountFcy" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "rateOffered" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "amountIssuedLkr" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Currency_code_key" ON "Currency"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_currencyId_rateDate_key" ON "ExchangeRate"("currencyId", "rateDate");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerReceipt_serialNumber_key" ON "CustomerReceipt"("serialNumber");

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReceipt" ADD CONSTRAINT "CustomerReceipt_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
