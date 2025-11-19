// app/libs/day.ts
// Convert a local date string (YYYY-MM-DD) or JS Date into a Date object
// that always represents the same "day" key in the DB by storing the
// UTC timestamp that corresponds to local midnight.
//
// Example: If user picks "2025-11-06" in Sri Lanka (UTC+5:30),
// this will return 2025-11-05T18:30:00.000Z — which is the UTC
// representation of 2025-11-06 00:00 local.
// Use this everywhere you store / query DailyCurrencyBalance.date
export function toDayDate(input: string | Date): Date {
  const d = typeof input === "string" ? new Date(input) : new Date(input);
  const ymd = d.toISOString().slice(0, 10);
  return new Date(ymd + "T00:00:00Z");
}

export function toDayKey(input: string | Date): string {
  return toDayDate(input).toISOString().slice(0, 10);
}

