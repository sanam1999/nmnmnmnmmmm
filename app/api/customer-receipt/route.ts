// app/api/customer-receipt/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../libs/prisma";
import { updateDailyBalances } from "@/app/libs/updateDailyBalance";
import { toDayDate } from "@/app/libs/day";

// ---- Types ----
interface CurrencyRowInput {
  currencyType: string;
  amountReceived: string;
  rate: string;
  amountIssued: string;
}

interface ReceiptRequest {
  serialNo: string;
  date: string;
  customerName: string;
  nicPassport: string;
  sources: string[];
  otherSource: string;
  rows: CurrencyRowInput[];
}

export async function POST(req: NextRequest) {
  try {
    const body: ReceiptRequest = await req.json();

    const {
      serialNo,
      date,
      customerName,
      nicPassport,
      sources,
      otherSource,
      rows
    } = body;

    // Validate required fields
    if (!serialNo || !customerName || !nicPassport || sources.length === 0) {
      return NextResponse.json(
        { error: "Please fill in all required fields" },
        { status: 400 }
      );
    }

    // Filter valid rows
    const validRows = rows.filter(
      (r) =>
        r.currencyType.trim() !== "" &&
        (r.amountReceived.trim() !== "" || r.rate.trim() !== "")
    );

    if (validRows.length === 0) {
      return NextResponse.json(
        { error: "Please enter at least one currency row" },
        { status: 400 }
      );
    }

    const bankDate = toDayDate(date);

    // Save receipt
    const receipt = await prisma.customerReceipt.create({
      data: {
        serialNumber: serialNo,
        receiptDate: bankDate,
        customerName,
        nicPassport,
        sourceOfForeignCurrency: sources.join(", "),
        remarks: otherSource,
        currencies: {
          create: validRows.map((r) => ({
            currencyType: r.currencyType,
            amountFcy: parseFloat(r.amountReceived) || 0,
            rateOffered: parseFloat(r.rate) || 0,
            amountIssuedLkr: parseFloat(r.amountIssued) || 0,
          })),
        },
      },
      include: {
        currencies: true,
      },
    });

    await updateDailyBalances(receipt.id);

    // ✅ FIX: infer currency type safely
    type ReceiptCurrency = (typeof receipt.currencies)[number];

    // Return BigInt-safe JSON
    return NextResponse.json({
      message: "Receipt saved successfully",
      receipt: {
        ...receipt,
        id: receipt.id.toString(),
        currencies: receipt.currencies.map((c: ReceiptCurrency) => ({
          ...c,
          id: c.id.toString(),
          receiptId: c.receiptId.toString(),
        })),
      },
    });

  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002" &&
      "meta" in err &&
      (err as { meta?: { target?: string[] } }).meta?.target?.includes("serialNumber")
    ) {
      return NextResponse.json(
        { error: "Serial number already exists" },
        { status: 409 }
      );
    }

    console.error(err);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
