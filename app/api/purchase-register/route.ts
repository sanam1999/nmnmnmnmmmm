import { NextResponse } from "next/server";

import { PrismaClient,Prisma  } from "@prisma/client";



const prisma = new PrismaClient();



// Define types for the Prisma models

type CustomerReceipt = {

  id: bigint;

  permitNo: string;

  serialNumber: string;

  receiptDate: Date;

  customerName: string | null;

  nicPassport: string | null;

  sourceOfForeignCurrency: string | null;

  remarks: string | null;

  createdAt: Date;

  currencies: CustomerReceiptCurrency[];

};



type CustomerReceiptCurrency = {

  id: bigint;

  receiptId: bigint;

  currencyType: string;

  amountFcy: Prisma.Decimal; 

  rateOffered: Prisma.Decimal; 

  amountIssuedLkr: Prisma.Decimal; 

};



export async function GET() {

  try {

    console.log("Fetching purchase records...");

   

    const receipts = await prisma.customerReceipt.findMany({

      include: { currencies: true },

      orderBy: { receiptDate: "desc" },

    });



    console.log(`Found ${receipts.length} receipts`);



    // Convert BigInt IDs and Decimal fields to strings with proper typing

    const serialized = receipts.map((r: CustomerReceipt) => ({

      id: r.id.toString(),

      permitNo: r.permitNo,

      serialNumber: r.serialNumber,

      date: r.receiptDate.toISOString().split('T')[0], // Format as YYYY-MM-DD

      customerName: r.customerName || "",

      nicPassport: r.nicPassport || "",

      sourceOfForeignCurrency: r.sourceOfForeignCurrency

        ? r.sourceOfForeignCurrency.split(",")

        : [],

      remarks: r.remarks || "",

      currencies: r.currencies.map((c: CustomerReceiptCurrency) => ({

        id: c.id.toString(),

        currencyType: c.currencyType,

        amountFcy: c.amountFcy.toString(),

        rate: c.rateOffered.toString(),

        amountIssuedLkr: c.amountIssuedLkr.toString(),

      })),

    }));



    return NextResponse.json(serialized);

  } catch (err) {

    console.error("API Error:", err);

    return NextResponse.json(

      { error: "Failed to fetch receipts: " + (err as Error).message },

      { status: 500 }

    );

  }

}

