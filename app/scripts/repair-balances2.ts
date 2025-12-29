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

    // Get all dates that have either daily records, deposits, or purchases
    const dailyRecords = await prisma.dailyCurrencyBalance.findMany({
      where: { currencyType: currency },
      select: { date: true },
    });

    const depositRecords = await prisma.depositRecord.findMany({
      where: { currencyType: currency },
      select: { date: true },
    });

    const purchaseRecords = await prisma.customerReceiptCurrency.findMany({
      where: { currencyType: currency },
      include: { receipt: { select: { receiptDate: true } } },
    });

    // Collect all unique dates
    const allDatesSet = new Set<string>();
    dailyRecords.forEach((r) => {
      const dayDate = toDayDate(r.date);
      allDatesSet.add(dayDate.toISOString().split("T")[0]);
    });
    depositRecords.forEach((r) => {
      const dayDate = toDayDate(r.date);
      allDatesSet.add(dayDate.toISOString().split("T")[0]);
    });
    purchaseRecords.forEach((r) => {
      const dayDate = toDayDate(r.receipt.receiptDate);
      allDatesSet.add(dayDate.toISOString().split("T")[0]);
    });

    const allDates = Array.from(allDatesSet)
      .map((d) => new Date(d))
      .sort((a, b) => a.getTime() - b.getTime());

    if (allDates.length === 0) {
      console.log(`No records found for ${currency}`);
      continue;
    }

    console.log(`Found ${allDates.length} unique dates to process`);

    let previousClosing = 0;

    for (let i = 0; i < allDates.length; i++) {
      const date = toDayDate(allDates[i]);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      console.log(
        `\n📅 Processing ${currency} ${date.toISOString().split("T")[0]}`
      );

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

      // Get actual deposits (FIXED: proper date filtering)
      const depositsAgg = await prisma.depositRecord.aggregate({
        _sum: { amount: true },
        where: {
          currencyType: currency,
          date: date, // Match exact day
        },
      });
      const deposits = Number(depositsAgg._sum.amount ?? 0);

      // Get existing record if it exists
      const existingRecord = await prisma.dailyCurrencyBalance.findUnique({
        where: {
          currencyType_date: {
            currencyType: currency,
            date: date,
          },
        },
      });

      // Get exchange and sales from existing record or default to 0
      const exchangeBuy = Number(existingRecord?.exchangeBuy ?? 0);
      const exchangeSell = Number(existingRecord?.exchangeSell ?? 0);
      const sales = Number(existingRecord?.sales ?? 0);

      // Calculate closing balance using CONSISTENT formula
      const closingBalance =
        openingBalance +
        purchases +
        exchangeBuy -
        exchangeSell -
        sales -
        deposits;

      // Display calculation details
      console.log(`   Opening: ${openingBalance.toFixed(2)}`);
      console.log(`   + Purchases: ${purchases.toFixed(2)}`);
      console.log(`   + ExchBuy: ${exchangeBuy.toFixed(2)}`);
      console.log(`   - ExchSell: ${exchangeSell.toFixed(2)}`);
      console.log(`   - Sales: ${sales.toFixed(2)}`);
      console.log(`   - Deposits: ${deposits.toFixed(2)}`);
      console.log(`   --------------------------------`);
      if (existingRecord) {
        console.log(
          `   Old Closing: ${Number(existingRecord.closingBalance).toFixed(2)}`
        );
      }
      console.log(`   ✓ New Closing: ${closingBalance.toFixed(2)}`);

      // Upsert the record
      await prisma.dailyCurrencyBalance.upsert({
        where: {
          currencyType_date: {
            currencyType: currency,
            date: date,
          },
        },
        update: {
          openingBalance,
          purchases,
          deposits,
          exchangeBuy,
          exchangeSell,
          sales,
          closingBalance,
        },
        create: {
          currencyType: currency,
          date: date,
          openingBalance,
          purchases,
          deposits,
          exchangeBuy,
          exchangeSell,
          sales,
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

