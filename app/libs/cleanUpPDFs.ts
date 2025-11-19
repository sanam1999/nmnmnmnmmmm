import { promises as fs } from "fs";
import path from "path";
import { prisma } from "./prisma"; 
export const PDF_DIR = path.join(process.cwd(), "public/customer-pdfs");

/**
 * Cleanup PDFs older than `daysToKeep`
 * @param daysToKeep Number of days to keep PDFs
 */
export async function cleanupOldPDFs(daysToKeep: number = 3) {
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    // 1️⃣ Get old PDFs from DB
    const oldPDFs = await prisma.receiptPDF.findMany({
      where: { createdAt: { lt: cutoffDate } },
    });

    // 2️⃣ Delete files from server
    for (const pdf of oldPDFs) {
      const filePath = path.join(process.cwd(), "public", pdf.filePath);
      try {
        await fs.unlink(filePath);
        console.log(`Deleted file: ${filePath}`);
      } catch (err) {
        console.warn(`File not found, skipping: ${filePath}`,err);
      }
    }

    // 3️⃣ Delete DB records
    const deletedCount = await prisma.receiptPDF.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });

    console.log(`Cleanup complete. Deleted ${deletedCount.count} PDFs.`);

    return { deletedFiles: oldPDFs.length, deletedDBRecords: deletedCount.count };
  } catch (err) {
    console.error("Error cleaning up PDFs:", err);
    throw err;
  }
}
