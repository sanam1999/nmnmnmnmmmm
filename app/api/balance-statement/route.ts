// app/api/balance-statement/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../libs/prisma";

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

// Helper: get previous day's end in UTC
const getPreviousDayUTC = (date: Date) => {
  const prev = new Date(date);
  prev.setUTCDate(prev.getUTCDate() - 1);
  prev.setUTCHours(23, 59, 59, 999);
  return prev;
};

// Helper: parse date string to UTC start/end
const parseDateUTC = (dateStr: string, isEndOfDay = false) => {
  const date = new Date(dateStr);
  if (isEndOfDay) {
    date.setUTCHours(23, 59, 59, 999);
  } else {
    date.setUTCHours(0, 0, 0, 0);
  }
  return date;
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
    }

    // Parse dates as UTC
    const from = parseDateUTC(fromDateParam, false);
    const to = parseDateUTC(toDateParam, true);
    const prevDay = getPreviousDayUTC(from);

    const processingPromises = CURRENCIES.map(async (currency) => {
      // 1️⃣ Previous day's closing balance
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
        : 0;

      // 2️⃣ Aggregate purchases
      const purchasesAgg = await prisma.customerReceiptCurrency.aggregate({
        _sum: { amountFcy: true },
        where: {
          currencyType: currency,
          receipt: {
            receiptDate: { gte: from, lte: to },
          },
        },
      });

      const totalPurchases = Number(purchasesAgg._sum.amountFcy ?? 0);

      // 3️⃣ Aggregate deposits
      const depositsAgg = await prisma.depositRecord.aggregate({
        _sum: { amount: true },
        where: {
          currencyType: currency,
          date: { gte: from, lte: to },
        },
      });

      const totalDeposits = Number(depositsAgg._sum.amount ?? 0);

      // 4️⃣ Other fields placeholders
      const totalExchangeBuy = 0;
      const totalExchangeSell = 0;
      const totalSales = 0;

      // 5️⃣ Skip currency if completely empty
      if (
        openingBalance === 0 &&
        totalPurchases === 0 &&
        totalDeposits === 0 &&
        totalExchangeBuy === 0 &&
        totalExchangeSell === 0 &&
        totalSales === 0
      ) {
        return null; // skip this currency
      }

      // 6️⃣ Calculate closing balance
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
    });

    // Wait for all promises and filter out nulls
    const finalResults = (await Promise.all(processingPromises)).filter(
      Boolean
    );

    return NextResponse.json(finalResults);
  } catch (err) {
    console.error("balance-statement error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
