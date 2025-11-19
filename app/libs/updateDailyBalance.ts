import { prisma } from "./prisma";
import { toDayDate } from "./day";

export async function updateDailyBalances(receiptId: bigint) {
  const receipt = await prisma.customerReceipt.findUnique({
    where: { id: receiptId },
    include: { currencies: true },
  });
  if (!receipt) return;

  const receiptDate = toDayDate(receipt.receiptDate);
  const nextDay = new Date(receiptDate.getTime() + 24 * 60 * 60 * 1000);

  for (const currency of receipt.currencies) {
    const prevAgg = await prisma.customerReceiptCurrency.aggregate({
      _sum: { amountFcy: true },
      where: {
        currencyType: currency.currencyType,
        receipt: { receiptDate: { lt: receiptDate } },
      },
    });
    const opening = prevAgg._sum.amountFcy ? Number(prevAgg._sum.amountFcy) : 0;

    const todayAgg = await prisma.customerReceiptCurrency.aggregate({
      _sum: { amountFcy: true },
      where: {
        currencyType: currency.currencyType,
        receipt: { receiptDate: { gte: receiptDate, lt: nextDay } },
      },
    });
    const totalPurchases = todayAgg._sum.amountFcy
      ? Number(todayAgg._sum.amountFcy)
      : 0;

    const closing = opening + totalPurchases;

    const todayBalance = await prisma.dailyCurrencyBalance.findUnique({
      where: {
        currencyType_date: {
          currencyType: currency.currencyType,
          date: receiptDate,
        },
      },
    });

    if (todayBalance) {
      await prisma.dailyCurrencyBalance.update({
        where: { id: todayBalance.id },
        data: {
          openingBalance: opening,
          purchases: totalPurchases,
          closingBalance: closing,
        },
      });
    } else {
      await prisma.dailyCurrencyBalance.create({
        data: {
          currencyType: currency.currencyType,
          date: receiptDate,
          openingBalance: opening,
          purchases: totalPurchases,
          closingBalance: closing,
        },
      });
    }
  }
}
