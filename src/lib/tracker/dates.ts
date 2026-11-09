import type { BillingCycle } from "./types";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** The user's local date as YYYY-MM-DD. */
export function getLocalToday(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** First day of the month of a YYYY-MM-DD date (the value stored in last_paid_month). */
export function getMonthStart(isoDate: string): string {
  return `${isoDate.slice(0, 8)}01`;
}

/**
 * The stored next_billing_date doesn't advance by itself, so this rolls it
 * forward by the billing cycle until it's today or later, keeping the
 * billing day (clamped to the end of shorter months).
 */
export function getNextChargeDate(
  isoDate: string,
  cycle: BillingCycle,
  today: string
): string {
  if (isoDate >= today) return isoDate;

  const [year, month, day] = isoDate.split("-").map(Number);
  const [todayYear, todayMonth] = today.split("-").map(Number);
  const step = cycle === "yearly" ? 12 : 1;

  const candidate = (offset: number): string => {
    const total = month - 1 + offset;
    const y = year + Math.floor(total / 12);
    const m = ((total % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return `${y}-${pad(m + 1)}-${pad(Math.min(day, lastDay))}`;
  };

  const monthsElapsed = (todayYear - year) * 12 + (todayMonth - month);
  let offset = Math.max(0, Math.ceil(monthsElapsed / step) * step);
  let result = candidate(offset);
  while (result < today) {
    offset += step;
    result = candidate(offset);
  }
  return result;
}
