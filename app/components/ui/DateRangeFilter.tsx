"use client";

import { Calendar } from "lucide-react";
import { Input } from "./input";
import { Label } from "./label";
import { Button } from "./button";

interface DateRangeFilterProps {
  fromDate: string;
  toDate: string;
  loading?: boolean;
  onFromChange: (date: string) => void;
  onToChange: (date: string) => void;
  onFilter: () => void;
}

export const DateRangeFilter = ({
  fromDate,
  toDate,
  loading = false,
  onFromChange,
  onToChange,
  onFilter,
}: DateRangeFilterProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="space-y-2">
        <Label htmlFor="fromDate" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          From Date
        </Label>
        <Input
          id="fromDate"
          type="date"
          value={fromDate}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="toDate" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          To Date
        </Label>
        <Input
          id="toDate"
          type="date"
          value={toDate}
          onChange={(e) => onToChange(e.target.value)}
        />
      </div>

      <div className="flex items-end">
        <Button
          onClick={onFilter}
          className="w-full bg-gradient-to-r from-accent to-accent/90"
        >
          {loading ? "Loading..." : "Filter"}
        </Button>
      </div>
    </div>
  );
};
