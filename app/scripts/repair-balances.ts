import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CURRENCIES = [
  "USD",
  "GBP",
  "EUR",
  "CHF",
  "AUD",
  "NZD",
  "SGD",
  "INR",
  "CAD",
];

function toDayDate(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function repairBalances() {
  console.log("Starting balance repair...\n");
  console.log("=".repeat(60));

  for (const currency of CURRENCIES) {
    console.log(`\n=== Processing ${currency} ===`);

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

      console.log(`\n📅 Processing ${currency} ${date.toISOString().split("T")[0]}`);

      // Opening balance is previous day's closing
      const openingBalance = i === 0 ? 0 : previousClosing;

      // Get actual purchases from receipts
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

      // Get actual deposits
      const depositsAgg = await prisma.depositRecord.aggregate({
        _sum: { amount: true },
        where: {
          currencyType: currency,
          date: { gte: date, lte: dateEnd },
        },
      });

      const deposits = Number(depositsAgg._sum.amount ?? 0);

      // Get exchange and sales from existing record
      const exchangeBuy = Number(record.exchangeBuy ?? 0);
      const exchangeSell = Number(record.exchangeSell ?? 0);
      const sales = Number(record.sales ?? 0);

      // Calculate closing balance using CONSISTENT formula
      // Formula: opening + purchases + exchangeBuy - exchangeSell - sales - deposits
      const closingBalance =
        openingBalance +
        purchases +
        exchangeBuy -
        exchangeSell -
        sales -
        deposits;

      // Display calculation details
      console.log(`  Opening:      ${openingBalance.toFixed(2)}`);
      console.log(`  + Purchases:  ${purchases.toFixed(2)}`);
      console.log(`  + ExchBuy:    ${exchangeBuy.toFixed(2)}`);
      console.log(`  - ExchSell:   ${exchangeSell.toFixed(2)}`);
      console.log(`  - Sales:      ${sales.toFixed(2)}`);
      console.log(`  - Deposits:   ${deposits.toFixed(2)}`);
      console.log(`  --------------------------------`);
      console.log(`  Old Closing:  ${Number(record.closingBalance).toFixed(2)}`);
      console.log(`  ✓ New Closing: ${closingBalance.toFixed(2)}`);

      // Update the record
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

    console.log(`\n✅ ${currency} balances repaired successfully`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Balance repair completed successfully");
  console.log("=".repeat(60));
}

repairBalances()
  .catch((e) => {
    console.error("\n❌ Error during repair:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });