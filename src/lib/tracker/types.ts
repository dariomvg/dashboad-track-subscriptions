export const SERVICE_STATUSES = ["active", "paused", "cancelled"] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const BILLING_CYCLES = ["monthly", "yearly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export type Service = {
  id: number;
  title: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  category: string;
  status: ServiceStatus;
  lastPaidMonth: string | null;
  createdAt: string;
};

export type ServiceInput = {
  title: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  category: string;
};

export type ServicePatch = Partial<ServiceInput> & {
  status?: ServiceStatus;
  lastPaidMonth?: string | null;
};

export type TrackerErrorCode =
  | "plan_limit_reached"
  | "account_suspended"
  | "invalid_data"
  | "not_found"
  | "unknown";

export type TrackerResult<T> =
  | { error: null; data: T }
  | { error: TrackerErrorCode; data: null };
