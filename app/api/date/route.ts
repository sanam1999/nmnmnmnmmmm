import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const date = new Date();
        const utcString = date.toISOString();

        const sriLankaDateTime = new Date(utcString).toLocaleString("en-LK", {
            timeZone: "Asia/Colombo",
        });

        const sriLankaDate = date.toLocaleDateString("en-CA", {
            timeZone: "Asia/Colombo",
        });

        return NextResponse.json({
            dateTime: sriLankaDateTime,
            date: sriLankaDate,
        });
    } catch (err) {
        console.error("date error:", err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
