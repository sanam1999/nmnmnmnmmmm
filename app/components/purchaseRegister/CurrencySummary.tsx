"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";

interface CurrencyDetail {
  currencyType: string;
  amountFcy: string;
  rate: string;
}

interface PurchaseRecord {
  id: string;
  sourceOfForeignCurrency: string[];
  remarks: string;
  currencies: CurrencyDetail[];
}

interface CurrencySummaryProps {
  purchases: PurchaseRecord[];
}

export const CurrencySummary: React.FC<CurrencySummaryProps> = ({
  purchases,
}) => {
  const currencies = [
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

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Currency Summary</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-4">
        {currencies.map((currency) => {
          const totalFcy = purchases.reduce((sum, purchase) => {
            const currSum = purchase.currencies
              .filter((c) => c.currencyType === currency)
              .reduce((s, c) => s + parseFloat(c.amountFcy || "0"), 0);
            return sum + currSum;
          }, 0);

          return (
            <Card
              key={currency}
              className="text-center shadow-[var(--shadow-small)] border border-primary/10 hover:shadow-[var(--shadow-medium)] transition-shadow"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-primary text-lg font-bold">
                  {currency}
                </CardTitle>
              </CardHeader>
              <CardContent>
               
                <p className="text-base font-medium">{totalFcy.toFixed(2)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
