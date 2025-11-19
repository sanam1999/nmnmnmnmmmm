"use client";

import { useEffect, useState } from "react";

interface Deposit {
  id: string;
  amount: string;
  createdAt: string;
}

export function DepositList({
  currency,
  date,
  refreshKey,
}: {
  currency: string;
  date: string;
  refreshKey?: number;
}) {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/balance-statement/deposits?currency=${encodeURIComponent(currency)}&date=${encodeURIComponent(date)}`
      );
      const data = await res.json();
      if (!Array.isArray(data)) {
        console.warn("Invalid deposits response", data);
        setDeposits([]);
        return;
      }
      setDeposits(data);
    } catch (err) {
      console.error("DepositList fetch error:", err);
      setDeposits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, date, refreshKey]); // refresh when key changes

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  if (!deposits || deposits.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        No deposits found for <b>{currency}</b>.
      </p>
    );

  return (
    <div className="space-y-2">
      <p className="font-semibold text-sm">Deposit History ({currency})</p>
      <div className="space-y-1">
        {deposits.map((d) => (
          <div
            key={d.id}
            className="flex justify-between items-center bg-white border rounded p-2 text-sm shadow-sm"
          >
            <span className="font-medium">{Number(d.amount).toFixed(2)}</span>
            <span className="opacity-60">
              {new Date(d.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
