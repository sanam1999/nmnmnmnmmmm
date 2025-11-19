-- CreateTable
CREATE TABLE "DepositRecord" (
    "id" BIGSERIAL NOT NULL,
    "currencyType" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" BIGINT,

    CONSTRAINT "DepositRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DepositRecord_currencyType_date_idx" ON "DepositRecord"("currencyType", "date");

-- AddForeignKey
ALTER TABLE "DepositRecord" ADD CONSTRAINT "DepositRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
