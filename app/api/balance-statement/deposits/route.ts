import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";
import { toDayDate } from "@/app/libs/day";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const currency = searchParams.get("currency");
    const date = searchParams.get("date");

    console.log("Deposits API called with:", { currency, date });

    if (!currency || !date) {
      return NextResponse.json(
        { error: "Missing parameters: currency and date are required" },
        { status: 400 }
      );
    }

    const startDate = toDayDate(new Date(date));
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    console.log("Searching deposits for date range:", { startDate, endDate });

    const deposits = await prisma.depositRecord.findMany({
      where: {
        currencyType: currency,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`Found ${deposits.length} deposits for ${currency}`);

    const serializedDeposits = deposits.map((deposit) => ({
      id: deposit.id.toString(),
      currencyType: deposit.currencyType,
      amount: Number(deposit.amount),
      date: deposit.date.toISOString(),
      createdAt: deposit.createdAt.toISOString(),
    }));

    return NextResponse.json(serializedDeposits);
  } catch (err) {
    console.error("Fetch deposits error:", err);
    return NextResponse.json(
      { error: "Internal server error while fetching deposits" },
      { status: 500 }
    );
  }
}