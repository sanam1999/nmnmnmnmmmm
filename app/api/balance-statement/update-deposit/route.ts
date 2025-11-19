// app/api/balance-statement/update-deposit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../libs/prisma";
import { toDayDate } from "../../../libs/day";

export async function POST(req: NextRequest) {
  try {
    const { currencyType, date, amount } = await req.json();

    if (!currencyType || !date || amount === undefined) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const depositAmount = Number(amount);
    if (isNaN(depositAmount)) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const day = toDayDate(date);

    // 1) Insert audit record
    await prisma.depositRecord.create({
      data: {
        currencyType,
        amount: depositAmount,
        date: day,
      },
    });

    // 2) Aggregate day deposits
    const agg = await prisma.depositRecord.aggregate({
      _sum: { amount: true },
      where: { currencyType, date: day },
    });

    const totalDeposits = Number(agg._sum.amount ?? 0);

    // 3) Find or create daily row
    let daily = await prisma.dailyCurrencyBalance.findUnique({
      where: { currencyType_date: { currencyType, date: day } },
    });

    if (!daily) {
      // Find previous day to get opening balance
      const prevDay = new Date(day.getTime() - 24 * 60 * 60 * 1000);
      const prev = await prisma.dailyCurrencyBalance.findUnique({
        where: { currencyType_date: { currencyType, date: prevDay } },
      });

      const openingBalance = Number(prev?.closingBalance ?? 0);

      // Calculate purchases for this specific day
      const dayStart = new Date(day);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      
      const purchasesAgg = await prisma.customerReceiptCurrency.aggregate({
        _sum: { amountFcy: true },
        where: {
          currencyType,
          receipt: { 
            receiptDate: { 
              gte: dayStart, 
              lte: dayEnd 
            } 
          },
        },
      });
      
      const dayPurchases = purchasesAgg._sum.amountFcy ? Number(purchasesAgg._sum.amountFcy) : 0;
      
      // Correct closing balance calculation
      const closingBalance = openingBalance + dayPurchases - totalDeposits;

      daily = await prisma.dailyCurrencyBalance.create({
        data: {
          currencyType,
          date: day,
          openingBalance,
          purchases: dayPurchases,
          exchangeBuy: 0,
          exchangeSell: 0,
          sales: 0,
          deposits: totalDeposits,
          closingBalance,
        },
      });
    } else {
      // 4) update existing row with correct calculation
      const closing =
        Number(daily.openingBalance ?? 0) +
        Number(daily.purchases ?? 0) +
        Number(daily.exchangeBuy ?? 0) -
        Number(daily.exchangeSell ?? 0) -
        Number(daily.sales ?? 0) -
        totalDeposits;

      await prisma.dailyCurrencyBalance.update({
        where: { id: daily.id },
        data: {
          deposits: totalDeposits,
          closingBalance: closing,
        },
      });
    }

    // Fetch today's updated closing balance
    const current = await prisma.dailyCurrencyBalance.findUnique({
      where: { currencyType_date: { currencyType, date: day } },
    });

    let currentClosing = Number(current?.closingBalance ?? 0);
    let currentDay = day;

    // 5) CORRECTED forward propagation
    while (true) {
      const nextDay = new Date(currentDay.getTime() + 86400000);

      const next = await prisma.dailyCurrencyBalance.findUnique({
        where: { currencyType_date: { currencyType, date: nextDay } },
      });

      if (!next) break;

      // Next day's opening should be current day's closing
      const nextOpening = currentClosing;
      
      // Recalculate next day's closing based on its own transactions
      const nextClosing =
        nextOpening +
        Number(next.purchases ?? 0) +
        Number(next.exchangeBuy ?? 0) -
        Number(next.exchangeSell ?? 0) -
        Number(next.sales ?? 0) -
        Number(next.deposits ?? 0);

      await prisma.dailyCurrencyBalance.update({
        where: { id: next.id },
        data: {
          openingBalance: nextOpening,
          closingBalance: nextClosing,
        },
      });

      // Move to next day for propagation
      currentDay = nextDay;
      currentClosing = nextClosing;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("update-deposit error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}