"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Search } from "lucide-react";
import { toast } from "../../hooks/use-toast";
import { CurrencySummary } from "./CurrencySummary";
import { DateRangeFilter } from "../../components/ui/DateRangeFilter";

interface CurrencyDetail {
  currencyType: string;
  amountFcy: string;
  rate: string;
  amountIssuedLkr: string;
}

interface PurchaseRecord {
  id: string;
  date: string;
  serialNumber: string;
  customerName: string;
  nicPassport: string;
  sourceOfForeignCurrency: string[];
  remarks: string;
  currencies: CurrencyDetail[];
}

export const PurchaseRegister = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<PurchaseRecord[]>([]);
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  // Fetch purchases on mount
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const res = await fetch("/api/purchase-register");
        if (!res.ok) {
          let errorMsg = `HTTP error ${res.status}`;
          try {
            const errData = await res.json();
            errorMsg = errData?.error || errorMsg;
          } catch {}
          throw new Error(errorMsg);
        }

        const text = await res.text();
        const data: PurchaseRecord[] = text ? JSON.parse(text) : [];

        // Sort by serialNumber descending (latest first)
        data.sort((a, b) => parseInt(b.serialNumber) - parseInt(a.serialNumber));

        setPurchases(data);
        setFilteredPurchases(data);
      } catch (err) {
        console.error(err);
        toast({
          title: "Error",
          description: "Failed to load purchases",
          variant: "destructive",
        });
      }
    };
    fetchPurchases();
  }, []);

  // Auto-apply search filter only (not date)
  useEffect(() => {
    const filtered = purchases.filter(
      (purchase) =>
        purchase.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.nicPassport.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.serialNumber.includes(searchTerm)
    );

    // Sort by serialNumber descending
    filtered.sort((a, b) => parseInt(b.serialNumber) - parseInt(a.serialNumber));

    setFilteredPurchases(filtered);
  }, [searchTerm, purchases]);

  // Filter by date when clicking Filter button
  const handleFilter = () => {
    setLoading(true);

    let filtered = [...purchases];

    // Apply date range filter
    if (fromDate && toDate) {
      filtered = filtered.filter((purchase) => {
        const purchaseDate = new Date(purchase.date);
        const from = new Date(fromDate);
        const to = new Date(toDate);
        return purchaseDate >= from && purchaseDate <= to;
      });
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (purchase) =>
          purchase.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          purchase.nicPassport.toLowerCase().includes(searchTerm.toLowerCase()) ||
          purchase.serialNumber.includes(searchTerm)
      );
    }

    // Sort by serialNumber descending
    filtered.sort((a, b) => parseInt(b.serialNumber) - parseInt(a.serialNumber));

    setFilteredPurchases(filtered);
    setTimeout(() => setLoading(false), 300);
  };

  const totalAmountRs = filteredPurchases.reduce(
    (sum, purchase) =>
      sum +
      purchase.currencies.reduce(
        (s, c) => s + parseFloat(c.amountIssuedLkr || "0"),
        0
      ),
    0
  );

  return (
    <Card className="shadow-[var(--shadow-medium)]">
      <CardHeader className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground">
        <CardTitle className="text-2xl">Purchase Register</CardTitle>
        <p className="text-sm opacity-90">Complete Transaction History</p>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Search Bar */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Transactions</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, NIC/Passport, or serial number..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground">Total Transactions</p>
            <p className="text-2xl font-bold text-primary">{filteredPurchases.length}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 rounded-lg border border-accent/20">
            <p className="text-sm text-muted-foreground">Total Amount (LKR)</p>
            <p className="text-2xl font-bold text-accent">{totalAmountRs.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20">
            <p className="text-sm text-muted-foreground">Today&apos;s Date</p>
            <p className="text-2xl font-bold">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Date Range Filter */}
        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          loading={loading}
          onFromChange={setFromDate}
          onToChange={setToDate}
          onFilter={handleFilter}
        />

        {/* Purchase Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Ser. No.</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>NIC/PP No.</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Amount (FCY)</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount (Rs.)</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.length > 0 ? (
                  filteredPurchases.map((purchase) =>
                    purchase.currencies.map((currency, index) => (
                      <TableRow
                        key={`${purchase.id}-${currency.currencyType}`}
                        className="hover:bg-muted/30"
                      >
                        {index === 0 && (
                          <>
                            <TableCell rowSpan={purchase.currencies.length}>
                              {new Date(purchase.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell rowSpan={purchase.currencies.length}>
                              {purchase.serialNumber}
                            </TableCell>
                            <TableCell rowSpan={purchase.currencies.length}>
                              {purchase.customerName}
                            </TableCell>
                            <TableCell rowSpan={purchase.currencies.length}>
                              {purchase.nicPassport}
                            </TableCell>
                            <TableCell rowSpan={purchase.currencies.length}>
                              {purchase.sourceOfForeignCurrency
                                .map((src) => {
                                  if (src.toLowerCase() === "other" && purchase.remarks) {
                                    return `Other (${purchase.remarks})`;
                                  }
                                  return src;
                                })
                                .filter((v, i, a) => a.indexOf(v) === i)
                                .join(", ")}
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-semibold">
                            {currency.currencyType}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(currency.amountFcy).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(currency.rate).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {parseFloat(currency.amountIssuedLkr).toFixed(2)}
                        </TableCell>
                        {index === 0 && (
                          <TableCell
                            rowSpan={purchase.currencies.length}
                            className="text-muted-foreground"
                          >
                            {purchase.remarks}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <CurrencySummary purchases={filteredPurchases} />
      </CardContent>
    </Card>
  );
};
