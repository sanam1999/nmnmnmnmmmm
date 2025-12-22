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

    let from: Date;
    let to: Date;

    // Parse dates with validation
    if (!fromDateParam || !toDateParam) {
      // Default to today if no dates provided
      const today = new Date();
      from = toDayDate(today);
      to = toDayDate(today);
    } else {
      // Parse provided dates
      const fromParsed = new Date(fromDateParam);
      const toParsed = new Date(toDateParam);

      if (isNaN(fromParsed.getTime()) || isNaN(toParsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format" },
          { status: 400 }
        );
      }

      from = toDayDate(fromParsed);
      to = toDayDate(toParsed);
    }

    const prevDay = getPreviousDay(from);

    const processingPromises = CURRENCIES.map(async (currency) => {
      // 1. Find the previous day's closing balance for the Opening Balance
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

      // 2. If it's a single day, we can aggregate directly
      // If it's a date range, we need to sum up the daily records
      const isSingleDay = from.getTime() === to.getTime();

      if (isSingleDay) {
        // Single day: Calculate from scratch or use existing daily record
        const toEndOfDay = new Date(to);
        toEndOfDay.setHours(23, 59, 59, 999);

        const purchasesAgg = await prisma.customerReceiptCurrency.aggregate({
          _sum: { amountFcy: true },
          where: {
            currencyType: currency,
            receipt: {
              receiptDate: {
                gte: from,
                lte: toEndOfDay,
              },
            },
          },
        });

        const totalPurchases = Number(purchasesAgg._sum.amountFcy ?? 0);

        const depositsAgg = await prisma.depositRecord.aggregate({
          _sum: { amount: true },
          where: {
            currencyType: currency,
            date: { gte: from, lte: toEndOfDay },
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
      } else {
        // Date range: Sum up purchases and deposits across all days
        const toEndOfDay = new Date(to);
        toEndOfDay.setHours(23, 59, 59, 999);

        const purchasesAgg = await prisma.customerReceiptCurrency.aggregate({
          _sum: { amountFcy: true },
          where: {
            currencyType: currency,
            receipt: {
              receiptDate: {
                gte: from,
                lte: toEndOfDay,
              },
            },
          },
        });

        const totalPurchases = Number(purchasesAgg._sum.amountFcy ?? 0);

        const depositsAgg = await prisma.depositRecord.aggregate({
          _sum: { amount: true },
          where: {
            currencyType: currency,
            date: { gte: from, lte: toEndOfDay },
          },
        });

        const totalDeposits = Number(depositsAgg._sum.amount ?? 0);

        const totalExchangeBuy = 0;
        const totalExchangeSell = 0;
        const totalSales = 0;

        // For date ranges, closing = opening + all changes
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
      }
    });

    // Wait for all currencies to be processed concurrently
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