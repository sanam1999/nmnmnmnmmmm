

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

import { Input } from "../ui/input";
import { Button } from "../ui/button";

import { DateRangeFilter } from "../ui/DateRangeFilter";
import { generateBalanceStatementPDF } from "../balanceStatement/pdfGenerator";
import { toast } from "@/app/hooks/use-toast";

interface CurrencyBalance {
  currencyType: string;
  openingBalance: string;
  purchases: string;
  exchangeBuy: string;
  exchangeSell: string;
  sales: string;
  deposits: string;
  closingBalance: string;
}

interface DepositRecord {
  id: string;
  currencyType: string;
  amount: number;
  date: Date;
  createdAt: Date;
}

export interface BalanceStatementPDFData {
  fromDate: string;
  toDate: string;
  balances: CurrencyBalance[];
}
const fetchSriLankaTime = async () => {
  const res = await fetch("/api/date");
  if (!res.ok) throw new Error("Error fetching date");
  return res.json();
};

// Helper to get Sri Lanka date string YYYY-MM-DD
export const getSriLankaDateString = async (): Promise<string | null> => {
  try {
    const data = await fetchSriLankaTime();
    return data.date;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export default function BalanceStatement() {
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [depositInputs, setDepositInputs] = useState<Record<string, string>>({});
  const [depositRecords, setDepositRecords] = useState<Record<string, DepositRecord[]>>({});
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");

  const fetchBalanceData = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/balance-statement?fromDate=${fromDate}&toDate=${toDate}`
      );

      if (!res.ok) throw new Error("Failed to fetch balance data");

      const response = await res.json();
      console.log(response)
      const data: CurrencyBalance[] = Array.isArray(response)
        ? response
        : response.rows || [];

      setBalances(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching balances:", err);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // Fetch deposit records (MEMOIZED)
  // =========================
  const fetchDepositRecords = useCallback(
    async (currencyType: string) => {
      try {
        const res = await fetch(
          `/api/balance-statement/deposits?currency=${currencyType}&date=${toDate}`
        );

        if (!res.ok) throw new Error("Failed to fetch deposit records");

        const deposits: DepositRecord[] = await res.json();

        setDepositRecords((prev) => ({
          ...prev,
          [currencyType]: deposits,
        }));
      } catch (err) {
        console.error("Error fetching deposit records:", err);
      }
    },
    [toDate]
  );

  // =========================
  // Filter visible balances
  // =========================
  const visibleBalances = balances.filter((b) => {
    const hasTransactions = [
      "purchases",
      "exchangeBuy",
      "exchangeSell",
      "sales",
      "deposits",
    ].some(
      (field) => parseFloat(b[field as keyof CurrencyBalance] || "0") !== 0
    );

    const hasOpening = parseFloat(b.openingBalance || "0") !== 0;

    return hasOpening || hasTransactions;
  });


  useEffect(() => {
    const fetchWhenReady = () => {
      if (fromDate != null) {
        fetchBalanceData();
      } else {
        // Retry after delay
        setTimeout(fetchWhenReady, 3000);
      }
    };

    fetchWhenReady();
  }, []);

  useEffect(() => {
    const fetchDate = async () => {
      const date = await getSriLankaDateString();
      if (date) {
        setFromDate(date);
        setToDate(date);
      }
    };
    fetchDate();
  }, []);

  useEffect(() => {
    visibleBalances.forEach((balance) => {
      const hasDeposits = parseFloat(balance.deposits || "0") > 0;
      const alreadyFetched = depositRecords[balance.currencyType];

      if (hasDeposits && !alreadyFetched) {
        fetchDepositRecords(balance.currencyType);
      }
    });
  }, [visibleBalances, depositRecords, fetchDepositRecords]);


  const handleDepositInput = (value: string) => {
    setDepositInputs((prev) => ({
      ...prev,
      [selectedCurrency]: value,
    }));
  };

  const handleSaveDeposit = async () => {
    if (!selectedCurrency) return;

    const amount = parseFloat(depositInputs[selectedCurrency] || "");

    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Deposit",
        description: "Please enter a valid deposit amount.",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch("/api/balance-statement/update-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currencyType: selectedCurrency,
          date: toDate,
          amount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Error",
          description: data.error || "Something went wrong",
          variant: "destructive",
        });
        return;
      }

      setDepositInputs((prev) => ({ ...prev, [selectedCurrency]: "" }));
      setSelectedCurrency("");

      // Refresh data
      await fetchBalanceData();

      // Force refetch deposits for updated currency
      setDepositRecords((prev) => {
        const copy = { ...prev };
        delete copy[selectedCurrency];
        return copy;
      });
    } catch (err) {
      console.error("Error saving deposit:", err);
    }
  };

  const getTotalDeposits = (currencyType: string): number => {
    const balance = balances.find((b) => b.currencyType === currencyType);
    return balance ? parseFloat(balance.deposits || "0") : 0;
  };

  const availableCurrencies = visibleBalances.map(
    (balance) => balance.currencyType
  );

  const handleDownloadReport = () => {
    generateBalanceStatementPDF({
      fromDate,
      toDate,
      balances: visibleBalances,
    });
  };

  return (
    <Card className="shadow-[var(--shadow-medium)]">
      <CardHeader className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground">
        <CardTitle className="text-2xl">Balance Statement</CardTitle>
        <p className="text-sm opacity-90">Multi-Currency Inventory Dashboard</p>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">

        {/* ✅ Reusable Date Filter */}
        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          loading={loading}
          onFromChange={setFromDate}
          onToChange={setToDate}
          onFilter={fetchBalanceData}
        />

        {/* ✅ Deposit Input Section - Outside the Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Deposit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Currency
                  </label>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Choose currency</option>
                    {availableCurrencies.map(currency => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Deposit Amount
                  </label>
                  <Input
                    type="number"
                    value={selectedCurrency ? (depositInputs[selectedCurrency] || "") : ""}
                    onChange={(e) => handleDepositInput(e.target.value)}
                    className="text-right font-mono"
                    placeholder="0.00"
                    disabled={!selectedCurrency}
                  />
                </div>
              </div>

              <Button
                variant="default"
                onClick={handleSaveDeposit}
                disabled={!selectedCurrency || !depositInputs[selectedCurrency]}
              >
                Add Deposit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ✅ Balance Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Currency Type</TableHead>
                  <TableHead className="text-right">Opening Balance (a)</TableHead>
                  <TableHead className="text-right">Purchases (b)</TableHead>
                  <TableHead className="text-right">Exchange-Buy (c)</TableHead>
                  <TableHead className="text-right">Exchange-Sell (d)</TableHead>
                  <TableHead className="text-right">Sales (e)</TableHead>
                  <TableHead className="text-right">Deposits (f)</TableHead>
                  <TableHead className="text-right font-semibold">Closing Balance</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {visibleBalances.map((balance, index) => (
                  <TableRow key={balance.currencyType || index} className="hover:bg-muted/30">
                    <TableCell className="font-semibold">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                        {balance.currencyType}
                      </span>
                    </TableCell>

                    <TableCell className="text-right font-mono">{balance.openingBalance}</TableCell>
                    <TableCell className="text-right font-mono text-accent">{balance.purchases}</TableCell>
                    <TableCell className="text-right font-mono text-accent">{balance.exchangeBuy}</TableCell>
                    <TableCell className="text-right font-mono text-destructive">{balance.exchangeSell}</TableCell>
                    <TableCell className="text-right font-mono text-destructive">{balance.sales}</TableCell>

                    {/* ✅ Deposit Column - Only shows total amount */}
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-lg font-semibold">
                          {getTotalDeposits(balance.currencyType).toFixed(2)}
                        </span>

                      </div>
                    </TableCell>

                    <TableCell className="text-right font-mono font-bold text-primary">
                      {balance.closingBalance}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button size="lg" className="gap-2 bg-gradient-to-r from-accent to-accent/90" onClick={handleDownloadReport} disabled={visibleBalances.length === 0 || loading}>
            Download Report
          </Button>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">Closing Balance Formula:</span> (a) + (b) + (c) - (d) - (e) - (f)
          </p>
        </div>
      </CardContent>
    </Card>
  );


}
