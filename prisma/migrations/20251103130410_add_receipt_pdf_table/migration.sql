-- CreateTable
CREATE TABLE "ReceiptPDF" (
    "id" BIGSERIAL NOT NULL,
    "receiptId" BIGINT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptPDF_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReceiptPDF" ADD CONSTRAINT "ReceiptPDF_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "CustomerReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
