"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { toast } from "../../hooks/use-toast";
import { Plus, Trash2, Save, Download } from "lucide-react";
import { generatePDF, PDFData } from "./pdfGenerator";
import { blacklistedCustomers } from "../../libs/blacklist";
import Link from "next/link";
import { toDayDate } from "../../libs/day";

// Helper to get Sri Lanka date string YYYY-MM-DD
const getSriLankaDateString = (date: Date = new Date()) => {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
};

// Convert UTC string to Sri Lanka local datetime string
const formatSriLankaDateTime = (utcString: string) => {
  return new Date(utcString).toLocaleString("en-LK", {
    timeZone: "Asia/Colombo",
  });
};

export interface CurrencyRow {
  id: string;
  currencyType: string;
  amountReceived: string;
  rate: string;
  amountIssued: string;
}

interface SavedPDF {
  id: string;
  fileName: string;
  filePath: string;
  createdAt: string;
}

interface ReceiptCurrency {
  id: string;
  currencyType: string;
  amountFcy: number;
  rateOffered: number;
  amountIssuedLkr: number;
}

export const CustomerReceipt = () => {
  const [serialNo, setSerialNo] = useState("");
  const [date, setDate] = useState(getSriLankaDateString());
  const [customerName, setCustomerName] = useState("");
  const [nicPassport, setNicPassport] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [otherSource, setOtherSource] = useState("");
  const [rows, setRows] = useState<CurrencyRow[]>([
    {
      id: Date.now().toString(),
      currencyType: "",
      amountReceived: "",
      rate: "",
      amountIssued: "",
    },
  ]);

  const [recentPDFs, setRecentPDFs] = useState<SavedPDF[]>([]);

  // Function to fetch recent PDFs
  const fetchRecentPDFs = async () => {
    try {
      const res = await fetch("/api/customer-receipt/pdfs");
      const data = await res.json();
      if (res.ok) {
        // Sort by newest first
        const formattedPDFs = data.pdfs.map((pdf: SavedPDF) => ({
          ...pdf,
          createdAt: formatSriLankaDateTime(pdf.createdAt),
        }));
        setRecentPDFs(
          formattedPDFs.sort(
            (a: SavedPDF, b: SavedPDF) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          )
        );
      } else {
        throw new Error(data.error);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch recent PDFs";
      console.error("Failed to fetch recent PDFs:", message);
    }
  };

  const loadSerial = async () => {
    try {
      const res = await fetch("/api/customer-receipt/next-serial");
      const data = await res.json();
      if (res.ok) setSerialNo(data.nextSerial);
      else console.error(data.error);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to load serial:", msg);
    }
  };

  useEffect(() => {
    fetchRecentPDFs();
    loadSerial();
  }, []);

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: Date.now().toString(),
        currencyType: "",
        amountReceived: "",
        rate: "",
        amountIssued: "",
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) setRows(rows.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: keyof CurrencyRow, value: string) => {
    setRows(
      rows.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: value };
          if (field === "amountReceived" || field === "rate") {
            const amt = parseFloat(updated.amountReceived) || 0;
            const rate = parseFloat(updated.rate) || 0;
            updated.amountIssued = (amt * rate).toFixed(2);
          }
          return updated;
        }
        return r;
      })
    );
  };

  const toggleSource = (key: string) => {
    if (sources.includes(key)) {
      setSources(sources.filter((s) => s !== key));
    } else {
      setSources([...sources, key]);
    }
  };

  const handleSaveAndDownload = async () => {
    if (!customerName || !nicPassport || sources.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required customer details.",
        variant: "destructive",
      });
      return;
    }

    // Blacklisted check
    const customerInput = nicPassport.trim().toUpperCase();
    const nameInput = customerName.trim().toLowerCase();

    const isBlackListed = blacklistedCustomers.some((entry) => {
      const nicMatches = entry.nic?.some(
        (n) => n.toUpperCase() === customerInput
      );
      const passportMatches = entry.passport?.some(
        (p) => p.toUpperCase() === customerInput
      );
      const nameMatches = entry.name.toLowerCase() === nameInput;

      return nicMatches || passportMatches || nameMatches;
    });

    if (isBlackListed) {
      toast({
        title: "Blacklisted Customer",
        description: "Receipt cannot be issued to this customer.",
        variant: "destructive",
      });
      return;
    }

    try {
      const saveRes = await fetch("https://pearlcitypos.com/api/customer-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serialNo,
          date: toDayDate(date).toISOString(),
          customerName,
          nicPassport,
          sources,
          otherSource,
          rows,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error);

      const newReceipt = saveData.receipt;

      toast({ title: "Receipt Saved", description: saveData.message });

      const pdfData: PDFData = {
        serialNo: newReceipt.serialNumber,
        date: newReceipt.receiptDate.split("T")[0],
        customerName: newReceipt.customerName,
        nicPassport: newReceipt.nicPassport,
        sources:
          newReceipt.sourceOfForeignCurrency.split(", ").filter(Boolean),
        otherSource: newReceipt.remarks || "",
        rows: newReceipt.currencies.map((c: ReceiptCurrency) => ({
          id: c.id,
          currencyType: c.currencyType,
          amountReceived: c.amountFcy.toString(),
          rate: c.rateOffered.toString(),
          amountIssued: c.amountIssuedLkr.toString(),
        })),
      };

      const pdfBase64 = generatePDF(pdfData);
      const fileName = `Receipt-${newReceipt.serialNumber}.pdf`;

      if (pdfBase64) {
        const savePdfRes = await fetch(
          "/api/customer-receipt/save-pdf",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              receiptId: newReceipt.id,
              fileName,
              pdfBase64,
            }),
          }
        );

        const savePdfData = await savePdfRes.json();
        if (!savePdfRes.ok) throw new Error(savePdfData.error);

        // Download locally
        generatePDF(pdfData, true);

        fetchRecentPDFs();
      }

      setSerialNo("");
      setCustomerName("");
      setNicPassport("");
      setSources([]);
      setOtherSource("");
      setRows([
        {
          id: Date.now().toString(),
          currencyType: "",
          amountReceived: "",
          rate: "",
          amountIssued: "",
        },
      ]);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message.startsWith("Failed to fetch")
            ? "Could not connect to server"
            : err.message
          : "Unknown error";

      toast({
        title: "Error",
        description: `Failed to process receipt: ${message}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllPDFs = async () => {
    if (!confirm("Are you sure you want to delete all PDFs?")) return;

    try {
      const res = await fetch(
        "/api/customer-receipt/delete-all-pdfs",
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: "Deleted", description: data.message });
      fetchRecentPDFs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="shadow-[var(--shadow-medium)]">
      <CardHeader className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground">
        <CardTitle className="text-2xl">Customer Receipt</CardTitle>
        <p className="text-sm opacity-90">
          Foreign Currency Sale Transaction
        </p>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="permitNo">Permit No: DFE/RD/6000</Label>
            <Input
              id="permitNo"
              value="DFE/RD/6000"
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serialNo">Serial No</Label>
            <Input
              id="serialNo"
              value={serialNo}
              readOnly
              onChange={(e) => setSerialNo(e.target.value)}
              placeholder="Enter serial number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerName">Name of the Customer *</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nicPassport">NIC/Passport No *</Label>
            <Input
              id="nicPassport"
              value={nicPassport}
              onChange={(e) => setNicPassport(e.target.value)}
              placeholder="Enter NIC or Passport number"
            />
          </div>
        </div>

        {/* Source of Foreign Currency */}
        <div>
          <Label className="text-base font-semibold">
            Source of Foreign Currency *
          </Label>
          <div className="border border-gray-300 rounded-lg divide-y divide-gray-300">
            {([
              {
                key: "Persons return for vacation from foreign employment",
                label:
                  "a) Persons return for vacation from foreign employment",
              },
              {
                key: "Relatives of those employees abroad",
                label: "b) Relatives of those employees abroad",
              },
              {
                key: "Foreign tourists (directly or through tour guides)",
                label:
                  "c) Foreign tourists (directly or through tour guides)",
              },
              {
                key: "d) Unutilized foreign currency obtained for travel purpose by residents",
                label:
                  "d) Unutilized foreign currency obtained for travel purpose by residents",
              },
              { key: "Other", label: "e) Other" },
            ] as const).map((item) => (
              <label
                key={item.key}
                className="flex justify-between items-center px-3 py-2"
              >
                <span className="text-gray-800 text-sm md:text-base">
                  {item.label}
                </span>
                {item.key === "Other" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={otherSource}
                      onChange={(e) => setOtherSource(e.target.value)}
                      placeholder="Specify"
                      className="h-7 w-40 text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!sources.includes("other"))
                          toggleSource("other");
                      }}
                    />
                    <span className="text-xs text-gray-500">
                      If other specify
                    </span>
                  </div>
                )}
                <input
                  type="checkbox"
                  checked={sources.includes(item.key)}
                  onChange={() => toggleSource(item.key)}
                  className="appearance-none border-2 border-gray-400 rounded-sm w-12 h-6 checked:bg-blue-600 checked:border-blue-600 cursor-pointer transition-all"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Currency Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">
              Currency Details
            </Label>
            <Button onClick={addRow} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Currency
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Currency Type</TableHead>
                  <TableHead>Amount Received (FCY)</TableHead>
                  <TableHead>Rate Offered</TableHead>
                  <TableHead>Amount Issued (LKR)</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Select
                        value={row.currencyType}
                        onValueChange={(value) =>
                          updateRow(row.id, "currencyType", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "USD",
                            "GBP",
                            "EUR",
                            "CHF",
                            "AUD",
                            "NZD",
                            "SGD",
                            "INR",
                            "CAD",
                          ].map((cur) => (
                            <SelectItem key={cur} value={cur}>
                              {cur}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={row.amountReceived}
                        onChange={(e) =>
                          updateRow(
                            row.id,
                            "amountReceived",
                            e.target.value
                          )
                        }
                        placeholder="0.00"
                      />
                    </TableCell>

                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={row.rate}
                        onChange={(e) =>
                          updateRow(row.id, "rate", e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </TableCell>

                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={row.amountIssued}
                        readOnly
                        className="bg-muted"
                        placeholder="0.00"
                      />
                    </TableCell>

                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Save & Download Button */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSaveAndDownload}
            size="lg"
            className="gap-2 bg-gradient-to-r from-accent to-accent/90"
          >
            <Save className="h-4 w-4" />
            Save & Download PDF
          </Button>
        </div>

        <div className="space-y-4 pt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              Issued Receipts in past 7 days
            </h2>
            {recentPDFs.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAllPDFs}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete All
              </Button>
            )}
          </div>

          {recentPDFs.length === 0 ? (
            <p className="text-sm text-gray-500">
              No recent PDFs found on the server.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead className="w-20">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPDFs.map((pdf) => (
                  <TableRow key={pdf.id}>
                    <TableCell className="font-medium">
                      {pdf.fileName}
                    </TableCell>
                    <TableCell>
                      {new Date(pdf.createdAt).toLocaleDateString(
                        "en-GB"
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={pdf.filePath}
                        passHref
                        target="_blank"
                      >
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4 text-primary" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
