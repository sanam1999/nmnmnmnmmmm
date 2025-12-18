// app/api/customer-receipt/pdfs/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/app/libs/prisma";

const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

export async function GET() {
  try {
    const recentPDFs = await prisma.receiptPDF.findMany({
      where: {
        createdAt: {
          gte: SEVEN_DAYS_AGO,
        },
      },
      select: {
        id: true,
        fileName: true,
        filePath: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    // ✅ FIX: infer type from result array
    type ReceiptPDF = (typeof recentPDFs)[number];

    // Convert BigInt IDs and ensure a clean array is returned
    const formattedPDFs = recentPDFs.map((pdf: ReceiptPDF) => ({
      ...pdf,
      id: pdf.id.toString(),
      createdAt: pdf.createdAt.toISOString(),
    }));

    return NextResponse.json({ pdfs: formattedPDFs });
  } catch (err) {
    console.error("Error fetching recent PDFs:", err);
    return NextResponse.json(
      { error: "Failed to fetch recent PDFs" },
      { status: 500 }
    );
  }
}
