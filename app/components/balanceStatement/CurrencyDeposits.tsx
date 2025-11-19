"use client";

import { useEffect, useState } from "react";

interface Deposit {
  id: number;
  amount: string;
  createdAt: string;
}

interface Props {
  currency: string;
  date: string;
}

export function CurrencyDeposits({ currency, date }: Props) {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDeposits = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/balance-statement/deposits?currency=${currency}&date=${date}`
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setDeposits(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeposits();
  }, [currency, date]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading deposits...</p>;

  if (deposits.length === 0)
    return <p className="text-sm text-muted-foreground">No deposits for this date.</p>;

  return (
    <table className="w-full text-sm mt-2 border rounded">
      <thead className="bg-muted/50">
        <tr>
          <th className="p-2">ID</th>
          <th className="p-2 text-right">Amount</th>
          <th className="p-2">Created At</th>
        </tr>
      </thead>
      <tbody>
        {deposits.map((d) => (
          <tr key={d.id} className="border-t hover:bg-muted/20">
            <td className="p-2">{d.id}</td>
            <td className="p-2 text-right font-mono">{Number(d.amount).toFixed(2)}</td>
            <td className="p-2">{new Date(d.createdAt).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
