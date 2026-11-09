import { MIN_PRORATED_CHARGE } from "@/lib/config";

const DAY_MS = 86_400_000;

export type UpgradeQuote = {
  amount: number;
  remainingDays: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * What an upgrade costs today: the price difference between plans, prorated
 * over the part of the paid period that's left. Returns null when there's
 * nothing left to prorate (the period is over and the renewal is pending).
 */
export function getUpgradeQuote(params: {
  currentPrice: number;
  targetPrice: number;
  paidThrough: Date | null;
  now?: Date;
}): UpgradeQuote | null {
  const { currentPrice, targetPrice, paidThrough } = params;
  const now = params.now ?? new Date();

  const difference = targetPrice - currentPrice;
  if (difference <= 0 || !paidThrough) return null;

  const remainingMs = paidThrough.getTime() - now.getTime();
  if (remainingMs <= 0) return null;

  const periodStart = new Date(paidThrough);
  periodStart.setMonth(periodStart.getMonth() - 1);
  const periodMs = paidThrough.getTime() - periodStart.getTime();

  const ratio = Math.min(1, remainingMs / periodMs);
  const prorated = round2(difference * ratio);
  const amount = round2(Math.min(difference, Math.max(MIN_PRORATED_CHARGE, prorated)));

  return { amount, remainingDays: Math.ceil(remainingMs / DAY_MS) };
}
