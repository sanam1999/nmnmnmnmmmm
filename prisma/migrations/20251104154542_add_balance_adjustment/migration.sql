-- CreateTable
CREATE TABLE "BalanceAdjustment" (
    "id" BIGSERIAL NOT NULL,
    "receiptId" BIGINT NOT NULL,
    "currencyType" TEXT NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" BIGINT,

    CONSTRAINT "BalanceAdjustment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BalanceAdjustment" ADD CONSTRAINT "BalanceAdjustment_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "CustomerReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
