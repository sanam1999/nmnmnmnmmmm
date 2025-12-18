// app/api/balance-statement/deposits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

// Helper function to convert string to Date at start of day
function toDayDate(dateString: string): Date {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Helper function to get end of day
function toEndOfDay(dateString: string): Date {
  const date = new Date(dateString);
  date.setHours(23, 59, 59, 999);
  return date;
}

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

    const startDate = toDayDate(date);
    const endDate = toEndOfDay(date);

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

    // ✅ FIX: infer type from deposits array
    type Deposit = (typeof deposits)[number];

    // Convert BigInt to string for JSON serialization if needed
    const serializedDeposits = deposits.map((deposit: Deposit) => ({
      ...deposit,
      id: deposit.id.toString(),
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
