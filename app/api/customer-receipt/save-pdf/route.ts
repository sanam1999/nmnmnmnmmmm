import fs from "fs";
import path from "path";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/libs/prisma";

/** Convert current time to Sri Lanka local time (UTC+5:30) */
function getSriLankaTime(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 60 * 60 * 1000);
}

export async function POST(req: NextRequest) {
  try {
    const { receiptId, fileName, pdfBase64 } = await req.json();

    if (!receiptId || !fileName || !pdfBase64) {
      return NextResponse.json(
        { error: "Missing required fields (receiptId, fileName, pdfBase64)" },
        { status: 400 }
      );
    }

    // ---- Create PDF Folder if missing ----
    const folderPath = path.join(process.cwd(), "public", "pdf");

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const filePath = path.join(folderPath, fileName);

    // ---- Convert and Write PDF File ----
    const buffer = Buffer.from(pdfBase64, "base64");
    fs.writeFileSync(filePath, buffer);

    // ---- Create DB Entry with Sri Lanka Time ----
    await prisma.receiptPDF.create({
      data: {
        receiptId: BigInt(receiptId),
        fileName,
        filePath: `/pdf/${fileName}`,
        createdAt: getSriLankaTime(), 
      },
    });

    return NextResponse.json({
      message: "PDF saved successfully",
      filePath: `/pdf/${fileName}`,
    });
  } catch (err) {
    console.error("Error saving PDF:", err);
    return NextResponse.json(
      { error: "Server error occurred while saving the PDF" },
      { status: 500 }
    );
  }
}
