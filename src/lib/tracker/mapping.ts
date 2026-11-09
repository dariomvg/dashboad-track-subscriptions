import type { BillingCycle, Service, ServicePatch, ServiceStatus } from "./types";

export const SERVICE_COLUMNS =
  "id, title, amount, currency, billing_cycle, next_billing_date, category, status, last_paid_month, created_at";

export type ServiceRow = {
  id: number;
  title: string;
  amount: number | string;
  currency: string;
  billing_cycle: BillingCycle;
  next_billing_date: string;
  category: string;
  status: ServiceStatus;
  last_paid_month: string | null;
  created_at: string;
};

export function toService(row: ServiceRow): Service {
  return {
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    currency: row.currency,
    billingCycle: row.billing_cycle,
    nextBillingDate: row.next_billing_date,
    category: row.category,
    status: row.status,
    lastPaidMonth: row.last_paid_month,
    createdAt: row.created_at,
  };
}

/** Only includes the keys that were actually provided. */
export function toRowPatch(patch: ServicePatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.currency !== undefined) row.currency = patch.currency;
  if (patch.billingCycle !== undefined) row.billing_cycle = patch.billingCycle;
  if (patch.nextBillingDate !== undefined) row.next_billing_date = patch.nextBillingDate;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.lastPaidMonth !== undefined) row.last_paid_month = patch.lastPaidMonth;
  return row;
}
