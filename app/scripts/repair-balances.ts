// scripts/repair-balances.ts
// Run this script to recalculate all daily balances correctly
// Usage: npx ts-node scripts/repair-balances.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CURRENCIES = ["USD", "GBP", "EUR", "CHF", "AUD", "NZD", "SGD", "INR", "CAD"];

function toDayDate(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function repairBalances() {
  console.log("Starting balance repair...\n");

  for (const currency of CURRENCIES) {
    console.log(`\n=== Processing ${currency} ===`);

    // Get all daily balance records for this currency, ordered by date
    const records = await prisma.dailyCurrencyBalance.findMany({
      where: { currencyType: currency },
      orderBy: { date: "asc" },
    });

    if (records.length === 0) {
      console.log(`No records found for ${currency}`);
      continue;
    }

    console.log(`Found ${records.length} records`);

    let previousClosing = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const date = toDayDate(record.date);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      console.log(`\nProcessing ${currency} ${date.toISOString().split("T")[0]}`);

      // 1. Opening balance = previous day's closing (or 0 for first day)
      const openingBalance = i === 0 ? 0 : previousClosing;

      // 2. Recalculate purchases from receipts
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

      // 3. Recalculate deposits from deposit records
      const depositsAgg = await prisma.depositRecord.aggregate({
        _sum: { amount: true },
        where: {
          currencyType: currency,
          date: { gte: date, lte: dateEnd },
        },
      });

      const deposits = Number(depositsAgg._sum.amount ?? 0);

      // 4. Calculate closing balance
      // Formula: Opening + Purchases + ExchangeBuy - ExchangeSell - Sales - Deposits
      const exchangeBuy = Number(record.exchangeBuy ?? 0);
      const exchangeSell = Number(record.exchangeSell ?? 0);
      const sales = Number(record.sales ?? 0);

      const closingBalance =
        openingBalance + purchases + exchangeBuy - exchangeSell - sales - deposits;

      console.log(`  Opening: ${openingBalance.toFixed(2)}`);
      console.log(`  Purchases: ${purchases.toFixed(2)}`);
      console.log(`  Deposits: ${deposits.toFixed(2)}`);
      console.log(`  Old Closing: ${Number(record.closingBalance).toFixed(2)}`);
      console.log(`  New Closing: ${closingBalance.toFixed(2)}`);

      // 5. Update the record
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

    console.log(`\n✓ ${currency} balances repaired`);
  }

  console.log("\n\n=== Balance repair completed ===");
}

repairBalances()
  .catch((e) => {
    console.error("Error during repair:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
