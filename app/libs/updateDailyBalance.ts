import { prisma } from "./prisma";
import { toDayDate } from "./day";

export async function updateDailyBalances(receiptId: bigint) {
  const receipt = await prisma.customerReceipt.findUnique({
    where: { id: receiptId },
    include: { currencies: true },
  });
  if (!receipt) return;

  const receiptDate = toDayDate(receipt.receiptDate);

  for (const currency of receipt.currencies) {
    // get previous day's closing balance for opening balance
    const prevDay = new Date(receiptDate.getTime() - 24 * 60 * 60 * 1000);
    const previousBalance = await prisma.dailyCurrencyBalance.findFirst({
      where: {
        currencyType: currency.currencyType,
        date: { lte: prevDay },
      },
      orderBy: { date: "desc" },
      select: { closingBalance: true },
    });

    const openingBalance = previousBalance
      ? Number(previousBalance.closingBalance)
      : 0;

    // today's purchases 
    const nextDay = toDayDate(new Date(receiptDate.getTime() + 24 * 60 * 60 * 1000));
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

    // Calculate today's deposits
    const depositsAgg = await prisma.depositRecord.aggregate({
      _sum: { amount: true },
      where: {
        currencyType: currency.currencyType,
        date: { gte: receiptDate, lt: nextDay },
      },
    });
    const totalDeposits = Number(depositsAgg._sum.amount ?? 0);

    // calculate closing balance
    const exchangeBuy = 0;
    const exchangeSell = 0;
    const sales = 0;

    const closingBalance =
      openingBalance +
      totalPurchases +
      exchangeBuy -
      exchangeSell -
      sales -
      totalDeposits;

    //Find or create today's balance record
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
          openingBalance,
          purchases: totalPurchases,
          deposits: totalDeposits,
          closingBalance,
        },
      });
    } else {
      await prisma.dailyCurrencyBalance.create({
        data: {
          currencyType: currency.currencyType,
          date: receiptDate,
          openingBalance,
          purchases: totalPurchases,
          exchangeBuy: 0,
          exchangeSell: 0,
          sales: 0,
          deposits: totalDeposits,
          closingBalance,
        },
      });
    }

    // FORWARD PROPAGATION: Update all subsequent days
    let currentDay = receiptDate;
    let currentClosing = closingBalance;

    while (true) {
      const nextDay = new Date(currentDay.getTime() + 24 * 60 * 60 * 1000);

      const nextBalance = await prisma.dailyCurrencyBalance.findUnique({
        where: {
          currencyType_date: {
            currencyType: currency.currencyType,
            date: nextDay,
          },
        },
      });

      if (!nextBalance) break; // Stop when there's no more future rows

      // update opening balance to previous day's closing
      const nextOpening = currentClosing;

      // re calculate closing balance with updated opening
      const nextPreDepositClosing =
        nextOpening +
        Number(nextBalance.purchases ?? 0) +
        Number(nextBalance.exchangeBuy ?? 0) -
        Number(nextBalance.exchangeSell ?? 0) -
        Number(nextBalance.sales ?? 0);

      const nextClosing =
        nextPreDepositClosing - Number(nextBalance.deposits ?? 0);

      await prisma.dailyCurrencyBalance.update({
        where: { id: nextBalance.id },
        data: {
          openingBalance: nextOpening,
          closingBalance: nextClosing,
        },
      });

      currentDay = nextDay;
      currentClosing = nextClosing;
    }
  }
}