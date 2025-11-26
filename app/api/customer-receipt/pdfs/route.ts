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
        createdAt: 'desc', // Show newest first
      },
      take: 20, // Optional: Limit the number of displayed PDFs
    });
    
    // Convert BigInt IDs and ensure a clean array is returned
    const formattedPDFs = recentPDFs.map((pdf) => ({
        ...pdf,
        id: pdf.id.toString(),
        // Convert createdAt to string for easier client-side consumption
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