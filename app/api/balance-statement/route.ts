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

    if (!fromDateParam || !toDateParam) {
      const today = new Date();
      from = toDayDate(today);
      to = toDayDate(today);
    } else {
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
      // Get opening balance from previous day
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

      const toEndOfDay = new Date(to);
      toEndOfDay.setHours(23, 59, 59, 999);

      // Calculate total purchases for the period
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

      // FIXED: Calculate deposits for each day in the range and sum them
      let totalDeposits = 0;
      const currentDate = new Date(from);
      while (currentDate <= to) {
        const dayDate = toDayDate(currentDate);
        
        const dayDepositsAgg = await prisma.depositRecord.aggregate({
          _sum: { amount: true },
          where: {
            currencyType: currency,
            date: dayDate, // Exact day match
          },
        });
        
        totalDeposits += Number(dayDepositsAgg._sum.amount ?? 0);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Get exchange and sales totals from daily records
      const dailyRecords = await prisma.dailyCurrencyBalance.findMany({
        where: {
          currencyType: currency,
          date: { gte: from, lte: to },
        },
        select: {
          exchangeBuy: true,
          exchangeSell: true,
          sales: true,
        },
      });

      const totalExchangeBuy = dailyRecords.reduce(
        (sum, record) => sum + Number(record.exchangeBuy ?? 0),
        0
      );
      const totalExchangeSell = dailyRecords.reduce(
        (sum, record) => sum + Number(record.exchangeSell ?? 0),
        0
      );
      const totalSales = dailyRecords.reduce(
        (sum, record) => sum + Number(record.sales ?? 0),
        0
      );

      // Calculate closing balance using complete formula
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
