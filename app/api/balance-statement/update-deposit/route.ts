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
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const day = toDayDate(date);

    // 1. VALIDATE AGAINST PRE-DEPOSIT BALANCE
    const existingRow = await prisma.dailyCurrencyBalance.findUnique({
      where: { currencyType_date: { currencyType, date: day } },
    });

    if (existingRow) {
      const preDepositClosing =
        Number(existingRow.openingBalance ?? 0) +
        Number(existingRow.purchases ?? 0) +
        Number(existingRow.exchangeBuy ?? 0) -
        Number(existingRow.exchangeSell ?? 0) -
        Number(existingRow.sales ?? 0);

      if (depositAmount > preDepositClosing) {
        return NextResponse.json(
          { error: "Deposit amount cannot exceed today's available balance." },
          { status: 400 }
        );
      }
    }

    // 2. Insert deposit audit record
    await prisma.depositRecord.create({
      data: { currencyType, amount: depositAmount, date: day },
    });


    // 3. Aggregate today's deposits
    const agg = await prisma.depositRecord.aggregate({
      _sum: { amount: true },
      where: { currencyType, date: day },
    });

    const totalDeposits = Number(agg._sum.amount ?? 0);


    // 4. Find or create today's daily balance row
    let daily = existingRow;

    if (!daily) {
      // Get previous day for opening balance
      const prevDay = new Date(day.getTime() - 86400000);

      const prev = await prisma.dailyCurrencyBalance.findUnique({
        where: { currencyType_date: { currencyType, date: prevDay } },
      });

      const openingBalance = Number(prev?.closingBalance ?? 0);

      // Calculate today's purchases only
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
              lte: dayEnd,
            },
          },
        },
      });

      const purchases = Number(purchasesAgg._sum.amountFcy ?? 0);

      // Validate again for new row
      const preDepositClosing = openingBalance + purchases;
      if (depositAmount > preDepositClosing) {
        return NextResponse.json(
          { error: "Deposit amount cannot exceed today's available balance." },
          { status: 400 }
        );
      }

      // Create new row
      const closing = preDepositClosing - totalDeposits;

      daily = await prisma.dailyCurrencyBalance.create({
        data: {
          currencyType,
          date: day,
          openingBalance,
          purchases,
          exchangeBuy: 0,
          exchangeSell: 0,
          sales: 0,
          deposits: totalDeposits,
          closingBalance: closing,
        },
      });
    } else {

      // If row already exists, update closing
      const preDepositClosing =
        Number(daily.openingBalance ?? 0) +
        Number(daily.purchases ?? 0) +
        Number(daily.exchangeBuy ?? 0) -
        Number(daily.exchangeSell ?? 0) -
        Number(daily.sales ?? 0);

      const newClosing = preDepositClosing - totalDeposits;

      await prisma.dailyCurrencyBalance.update({
        where: { id: daily.id },
        data: {
          deposits: totalDeposits,
          closingBalance: newClosing,
        },
      });

      daily = await prisma.dailyCurrencyBalance.findUnique({
        where: { id: daily.id },
      })!;
    }

    // -----------------------------------------
    // 5. FORWARD PROPAGATION
    // -----------------------------------------
    let currentDay = day;

    if (!daily) {
  return NextResponse.json(
    { error: "Daily record not found" },
    { status: 404 }
  );
}

    let currentClosing = Number(daily.closingBalance ?? 0);

    while (true) {
      const nextDay = new Date(currentDay.getTime() + 86400000);

      const next = await prisma.dailyCurrencyBalance.findUnique({
        where: { currencyType_date: { currencyType, date: nextDay } },
      });

      if (!next) break; // Stop when there's no more future rows

      const nextOpening = currentClosing;

      const nextPreDepositClosing =
        nextOpening +
        Number(next.purchases ?? 0) +
        Number(next.exchangeBuy ?? 0) -
        Number(next.exchangeSell ?? 0) -
        Number(next.sales ?? 0);

      const nextClosing = nextPreDepositClosing - Number(next.deposits ?? 0);

      await prisma.dailyCurrencyBalance.update({
        where: { id: next.id },
        data: {
          openingBalance: nextOpening,
          closingBalance: nextClosing,
        },
      });

      currentDay = nextDay;
      currentClosing = nextClosing;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("update-deposit error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
