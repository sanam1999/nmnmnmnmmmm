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
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const day = toDayDate(new Date(date));
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    // Get opening balance from most recent previous day
    const prevDay = new Date(day.getTime() - 86400000);
    const prevDayDate = toDayDate(prevDay);

    const prevBalance = await prisma.dailyCurrencyBalance.findFirst({
      where: {
        currencyType,
        date: { lte: prevDayDate },
      },
      orderBy: { date: "desc" },
      select: { closingBalance: true },
    });

    const openingBalance = Number(prevBalance?.closingBalance ?? 0);

    // Calculate today's purchases
    const purchasesAgg = await prisma.customerReceiptCurrency.aggregate({
      _sum: { amountFcy: true },
      where: {
        currencyType,
        receipt: {
          receiptDate: {
            gte: day,
            lte: dayEnd,
          },
        },
      },
    });

    const purchases = Number(purchasesAgg._sum.amountFcy ?? 0);

    // Get existing daily record to retrieve exchange and sales values
    const existingDaily = await prisma.dailyCurrencyBalance.findUnique({
      where: { currencyType_date: { currencyType, date: day } },
    });

    const exchangeBuy = Number(existingDaily?.exchangeBuy ?? 0);
    const exchangeSell = Number(existingDaily?.exchangeSell ?? 0);
    const sales = Number(existingDaily?.sales ?? 0);

    // Get current total deposits for this day
    const currentDepositsAgg = await prisma.depositRecord.aggregate({
      _sum: { amount: true },
      where: { currencyType, date: day },
    });

    const currentTotalDeposits = Number(currentDepositsAgg._sum.amount ?? 0);

    // Calculate pre-deposit balance using complete formula
    const preDepositBalance =
      openingBalance +
      purchases +
      exchangeBuy -
      exchangeSell -
      sales;

    const availableBalance = preDepositBalance - currentTotalDeposits;

    // Validate deposit amount
    if (depositAmount > availableBalance) {
      return NextResponse.json(
        {
          error: `Deposit exceeds available balance. Available: ${availableBalance.toFixed(
            2
          )}, Requested: ${depositAmount.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    // Create deposit record
    await prisma.depositRecord.create({
      data: {
        currencyType,
        amount: depositAmount,
        date: day,
      },
    });

    // Calculate new totals
    const newTotalDeposits = currentTotalDeposits + depositAmount;
    const newClosingBalance = preDepositBalance - newTotalDeposits;

    // Update or create daily balance record
    if (existingDaily) {
      await prisma.dailyCurrencyBalance.update({
        where: { id: existingDaily.id },
        data: {
          openingBalance,
          deposits: newTotalDeposits,
          closingBalance: newClosingBalance,
        },
      });
    } else {
      await prisma.dailyCurrencyBalance.create({
        data: {
          currencyType,
          date: day,
          openingBalance,
          purchases,
          exchangeBuy: 0,
          exchangeSell: 0,
          sales: 0,
          deposits: newTotalDeposits,
          closingBalance: newClosingBalance,
        },
      });
    }

    // Forward propagation - update all future days
    let currentDay = day;
    let currentClosing = newClosingBalance;

    while (true) {
      const nextDay = new Date(currentDay.getTime() + 86400000);
      const nextDayDate = toDayDate(nextDay);

      const nextDayBalance = await prisma.dailyCurrencyBalance.findUnique({
        where: { currencyType_date: { currencyType, date: nextDayDate } },
      });

      if (!nextDayBalance) break;

      const nextOpening = currentClosing;

      // Calculate next day closing using complete formula
      const nextClosing =
        nextOpening +
        Number(nextDayBalance.purchases ?? 0) +
        Number(nextDayBalance.exchangeBuy ?? 0) -
        Number(nextDayBalance.exchangeSell ?? 0) -
        Number(nextDayBalance.sales ?? 0) -
        Number(nextDayBalance.deposits ?? 0);

      await prisma.dailyCurrencyBalance.update({
        where: { id: nextDayBalance.id },
        data: {
          openingBalance: nextOpening,
          closingBalance: nextClosing,
        },
      });

      currentDay = nextDayDate;
      currentClosing = nextClosing;
    }

    return NextResponse.json({
      success: true,
      message: "Deposit added successfully",
      depositAmount: depositAmount.toFixed(2),
      newTotalDeposits: newTotalDeposits.toFixed(2),
      newClosingBalance: newClosingBalance.toFixed(2),
    });
  } catch (err) {
    console.error("update-deposit error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

