// app/api/balance-statement/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../libs/prisma";
import { toDayDate } from "../../libs/day";
const CURRENCIES = [
  "USD",
  "GBP",
  "EUR",
  "CHF",
  "AUD",
  "NZD",
  "SGD",
  "INR",
  "CAD",
];

type CurrencyBalance = {
  currencyType: string;
  openingBalance: string;
  purchases: string;
  exchangeBuy: string;
  exchangeSell: string;
  sales: string;
  deposits: string;
  closingBalance: string;
};

// Helper function to create the date object for the day before 'from'
const getPreviousDay = (date: Date) => {
  const prev = new Date(date);
  prev.setDate(date.getDate() - 1);
  return toDayDate(prev);
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDateParam = searchParams.get("fromDate");
    const toDateParam = searchParams.get("toDate");

    if (!fromDateParam || !toDateParam) {
      return NextResponse.json(
        { error: "Missing date range" },
        { status: 400 }
      );
    } // Calculate 'from' (start of day) and 'to' (end of day)

    const from = toDayDate(fromDateParam);
    //from.setHours(0, 0, 0, 0);

    const to = toDayDate(toDateParam);
    //to.setHours(23, 59, 59, 999);

    const prevDay = getPreviousDay(from);

    const results: CurrencyBalance[] = [];

    const processingPromises = CURRENCIES.map(async (currency) => {
      //Find the previous day's closing for the Opening Balance
      const previousBalance = await prisma.dailyCurrencyBalance.findFirst({
        where: {
          currencyType: currency,
          date: { lte: prevDay },
        },
        orderBy: { date: "desc" },
        select: { closingBalance: true },
      });

      const openingBalance = previousBalance
        ? Number(previousBalance.closingBalance)
        : 0; // 2. Aggregate Purchases for the ENTIRE date range (from to to) in one query
      const nextDayAfterTo = toDayDate(new Date(to.getTime() + 24 * 60 * 60 * 1000));
      const purchasesAgg = await prisma.customerReceiptCurrency.aggregate({
        _sum: { amountFcy: true },
        where: {
          currencyType: currency, // Check receiptDate is between from (inclusive) and to (inclusive)
          receipt: { receiptDate: { gte: from, lt: nextDayAfterTo } },
        },
      });

      const totalPurchases = Number(purchasesAgg._sum.amountFcy ?? 0); // 3. Aggregate Deposits for the ENTIRE date range (from to to) in one query

      const depositsAgg = await prisma.depositRecord.aggregate({
        _sum: { amount: true },
        where: {
          currencyType: currency,
          date: { gte: from, lt: nextDayAfterTo },
        },
      });

      const totalDeposits = Number(depositsAgg._sum.amount ?? 0);

      const totalExchangeBuy = 0;
      const totalExchangeSell = 0;
      const totalSales = 0;

      const closingBalance =
        openingBalance +
        totalPurchases +
        totalExchangeBuy -
        totalExchangeSell -
        totalSales -
        totalDeposits;

      return {
        currencyType: currency,
        openingBalance: openingBalance.toFixed(2),
        purchases: totalPurchases.toFixed(2),
        exchangeBuy: totalExchangeBuy.toFixed(2),
        exchangeSell: totalExchangeSell.toFixed(2),
        sales: totalSales.toFixed(2),
        deposits: totalDeposits.toFixed(2),
        closingBalance: closingBalance.toFixed(2),
      };
    }); // Wait for all currencies to be processed concurrently

    const finalResults = await Promise.all(processingPromises);

    return NextResponse.json(finalResults);
  } catch (err) {
    console.error("balance-statement error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}