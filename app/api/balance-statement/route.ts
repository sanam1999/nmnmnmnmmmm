// app/api/balance-statement/route.ts - COMPLETE FIX
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../libs/prisma";

const CURRENCIES = ["USD","GBP","EUR","CHF","AUD","NZD","SGD","INR","CAD"];

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDateParam = searchParams.get("fromDate");
    const toDateParam = searchParams.get("toDate");

    if (!fromDateParam || !toDateParam) {
      return NextResponse.json({ error: "Missing date range" }, { status: 400 });
    }

    const from = new Date(fromDateParam);
    const to = new Date(toDateParam);
    to.setHours(23, 59, 59, 999);

    const results: CurrencyBalance[] = [];

    for (const currency of CURRENCIES) {
      // Get daily balance data for the date range
      const dailyBalances = await prisma.dailyCurrencyBalance.findMany({
        where: {
          currencyType: currency,
          date: {
            gte: from,
            lte: to,
          },
        },
        orderBy: { date: "asc" },
      });

      // If we have daily balance records for the exact date range
      if (dailyBalances.length > 0) {
        // Use the daily records directly
        const totals = dailyBalances.reduce((acc, day) => ({
          purchases: acc.purchases + Number(day.purchases || 0),
          exchangeBuy: acc.exchangeBuy + Number(day.exchangeBuy || 0),
          exchangeSell: acc.exchangeSell + Number(day.exchangeSell || 0),
          sales: acc.sales + Number(day.sales || 0),
          deposits: acc.deposits + Number(day.deposits || 0),
        }), {
          purchases: 0,
          exchangeBuy: 0,
          exchangeSell: 0,
          sales: 0,
          deposits: 0,
        });

        const firstDay = dailyBalances[0];
        const lastDay = dailyBalances[dailyBalances.length - 1];

        results.push({
          currencyType: currency,
          openingBalance: Number(firstDay.openingBalance || 0).toFixed(2),
          purchases: totals.purchases.toFixed(2),
          exchangeBuy: totals.exchangeBuy.toFixed(2),
          exchangeSell: totals.exchangeSell.toFixed(2),
          sales: totals.sales.toFixed(2),
          deposits: totals.deposits.toFixed(2),
          closingBalance: Number(lastDay.closingBalance || 0).toFixed(2),
        });
      } else {
        // ✅ FIXED: If no daily records exist, we need to calculate properly
        // Find the most recent daily balance before the fromDate to get opening
        const previousDay = new Date(from);
        previousDay.setDate(previousDay.getDate() - 1);
        
        const previousBalance = await prisma.dailyCurrencyBalance.findFirst({
          where: {
            currencyType: currency,
            date: {
              lte: previousDay,
            },
          },
          orderBy: { date: 'desc' },
        });

        // Calculate opening balance from previous day's closing
        const openingBalance = previousBalance ? Number(previousBalance.closingBalance) : 0;

        // Calculate purchases for the date range
        const purchasesAgg = await prisma.customerReceiptCurrency.aggregate({
          _sum: { amountFcy: true },
          where: {
            currencyType: currency,
            receipt: { receiptDate: { gte: from, lte: to } },
          },
        });

        const purchases = purchasesAgg._sum.amountFcy ? Number(purchasesAgg._sum.amountFcy) : 0;

        // Calculate deposits for the date range
        const depositsAgg = await prisma.depositRecord.aggregate({
          _sum: { amount: true },
          where: {
            currencyType: currency,
            date: { gte: from, lte: to },
          },
        });

        const deposits = depositsAgg._sum.amount ? Number(depositsAgg._sum.amount) : 0;

        const exchangeBuy = 0;
        const exchangeSell = 0;
        const sales = 0;

        const closingBalance = openingBalance + purchases + exchangeBuy - exchangeSell - sales - deposits;

        results.push({
          currencyType: currency,
          openingBalance: openingBalance.toFixed(2),
          purchases: purchases.toFixed(2),
          exchangeBuy: exchangeBuy.toFixed(2),
          exchangeSell: exchangeSell.toFixed(2),
          sales: sales.toFixed(2),
          deposits: deposits.toFixed(2),
          closingBalance: closingBalance.toFixed(2),
        });

        // ✅ AUTO-CREATE the daily record for future use
        // Create daily records for each day in the range
        const currentDate = new Date(from);
        let currentOpening = openingBalance;
        
        while (currentDate <= to) {
          const dayStart = new Date(currentDate);
          const dayEnd = new Date(currentDate);
          dayEnd.setHours(23, 59, 59, 999);

          // Calculate day-specific transactions
          const dayPurchasesAgg = await prisma.customerReceiptCurrency.aggregate({
            _sum: { amountFcy: true },
            where: {
              currencyType: currency,
              receipt: { 
                receiptDate: { 
                  gte: dayStart, 
                  lte: dayEnd 
                } 
              },
            },
          });

          const dayDepositsAgg = await prisma.depositRecord.aggregate({
            _sum: { amount: true },
            where: {
              currencyType: currency,
              date: { gte: dayStart, lte: dayEnd },
            },
          });

          const dayPurchases = dayPurchasesAgg._sum.amountFcy ? Number(dayPurchasesAgg._sum.amountFcy) : 0;
          const dayDeposits = dayDepositsAgg._sum.amount ? Number(dayDepositsAgg._sum.amount) : 0;

          const dayClosing = currentOpening + dayPurchases - dayDeposits;

          // Create or update daily record
          await prisma.dailyCurrencyBalance.upsert({
            where: {
              currencyType_date: {
                currencyType: currency,
                date: currentDate,
              },
            },
            update: {
              openingBalance: currentOpening,
              purchases: dayPurchases,
              deposits: dayDeposits,
              closingBalance: dayClosing,
            },
            create: {
              currencyType: currency,
              date: currentDate,
              openingBalance: currentOpening,
              purchases: dayPurchases,
              exchangeBuy: 0,
              exchangeSell: 0,
              sales: 0,
              deposits: dayDeposits,
              closingBalance: dayClosing,
            },
          });

          // Move to next day
          currentOpening = dayClosing;
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error("balance-statement error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}