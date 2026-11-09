import type { Service } from "./types";

export type CurrencyTotal = {
  currency: string;
  total: number;
  paid: number;
  count: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Monthly totals per currency, counting active services only. */
export function computeTotals(services: Service[], monthStart: string): CurrencyTotal[] {
  const byCurrency = new Map<string, { total: number; paid: number; count: number }>();

  for (const service of services) {
    if (service.status !== "active") continue;

    const monthly = service.billingCycle === "yearly" ? service.amount / 12 : service.amount;
    const entry = byCurrency.get(service.currency) ?? { total: 0, paid: 0, count: 0 };

    entry.total += monthly;
    if (service.lastPaidMonth === monthStart) entry.paid += monthly;
    entry.count += 1;
    byCurrency.set(service.currency, entry);
  }

  return [...byCurrency.entries()]
    .map(([currency, value]) => ({
      currency,
      total: round2(value.total),
      paid: round2(value.paid),
      count: value.count,
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
