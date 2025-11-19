import { NextResponse } from "next/server";
import { cleanupOldPDFs } from "../../../libs/cleanUpPDFs";

export async function DELETE() {
  try {
    const result = await cleanupOldPDFs(0); // 0 = delete all PDFs immediately
    return NextResponse.json({
      message: `Deleted ${result.deletedFiles} files and ${result.deletedDBRecords} records.`,
    });
  } catch (err) {
    let errorMessage = "Failed to delete PDFs.";

    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (typeof err === "object" && err !== null && "message" in err) {
      // This handles cases where the error might be an object that isn't a true 'Error' instance
      errorMessage = (err as { message: string }).message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
