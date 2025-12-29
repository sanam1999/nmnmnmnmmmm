// FILE 4: app/api/balance-statement/repair/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../libs/prisma";
import { toDayDate } from "../../../libs/day";

const CURRENCIES = ["USD", "GBP", "EUR", "CHF", "AUD", "NZD", "SGD", "INR", "CAD"];

export async function POST(req: NextRequest) {
    try {
        const results: any[] = [];

        for (const currency of CURRENCIES) {
            const records = await prisma.dailyCurrencyBalance.findMany({
                where: { currencyType: currency },
                orderBy: { date: "asc" },
            });

            if (records.length === 0) {
                results.push({ currency, status: "no_records" });
                continue;
            }

            let previousClosing = 0;

            for (let i = 0; i < records.length; i++) {
                const record = records[i];
                const date = toDayDate(record.date);
                const dateEnd = new Date(date);
                dateEnd.setHours(23, 59, 59, 999);

                const openingBalance = i === 0 ? 0 : previousClosing;

                const purchasesAgg = await prisma.customerReceiptCurrency.aggregate({
                    _sum: { amountFcy: true },
                    where: {
                        currencyType: currency,
                        receipt: {
                            receiptDate: {
                                gte: date,
                                lte: dateEnd,
                            },
                        },
                    },
                });

                const purchases = Number(purchasesAgg._sum.amountFcy ?? 0);

                const depositsAgg = await prisma.depositRecord.aggregate({
                    _sum: { amount: true },
                    where: {
                        currencyType: currency,
                        date: { gte: date, lte: dateEnd },
                    },
                });

                const deposits = Number(depositsAgg._sum.amount ?? 0);

                const exchangeBuy = Number(record.exchangeBuy ?? 0);
                const exchangeSell = Number(record.exchangeSell ?? 0);
                const sales = Number(record.sales ?? 0);

                const closingBalance =
                    openingBalance + purchases + exchangeBuy - exchangeSell - sales - deposits;

                await prisma.dailyCurrencyBalance.update({
                    where: { id: record.id },
                    data: {
                        openingBalance,
                        purchases,
                        deposits,
                        closingBalance,
                    },
                });

                previousClosing = closingBalance;
            }

            results.push({
                currency,
                status: "repaired",
                recordsUpdated: records.length,
            });
        }

        return NextResponse.json({
            success: true,
            message: "Balance repair completed",
            results,
        });
    } catch (err) {
        console.error("Repair error:", err);
        return NextResponse.json(
            { error: "Internal server error during repair" },
            { status: 500 }
        );
    }
}





// for postman repair datanase use this api 
//POST https://pearlcitypos.com/api/balance-statement/repair