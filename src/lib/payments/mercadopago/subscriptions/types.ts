export type PreapprovalStatus = "pending" | "authorized" | "paused" | "cancelled";

export type FrequencyType = "days" | "months";

export interface FreeTrialInput {
  frequency: number;
  frequencyType: FrequencyType;
}

export interface AutoRecurringInput {
  frequency: number;
  frequencyType: FrequencyType;
  /** Currency units (decimal), NOT cents. */
  transactionAmount: number;
  currencyId: string;
  /** Creation-time only: Mercado Pago cannot add or remove a trial afterwards. */
  freeTrial?: FreeTrialInput;
}

export interface CreateSubscriptionInput {
  payerEmail: string;
  backUrl: string;
  reason: string;
  externalReference: string;
  autoRecurring: AutoRecurringInput;
}

export interface MPSubscriptionResult {
  id: string;
  status: PreapprovalStatus;
  initPoint: string;
}

export interface MPAutoRecurring {
  frequency: number;
  frequencyType: FrequencyType;
  transactionAmount: number;
  currencyId: string;
  startDate: string | null;
  endDate: string | null;
  freeTrial: FreeTrialInput | null;
}

export interface MPSubscription {
  id: string;
  status: PreapprovalStatus;
  payerEmail: string;
  preapprovalPlanId: string | null;
  reason: string | null;
  externalReference: string | null;
  autoRecurring: MPAutoRecurring;
  nextPaymentDate: string | null;
  dateCreated: string;
  lastModified: string;
}

export interface SubscriptionStatusResult {
  id: string;
  status: PreapprovalStatus;
}

export type AuthorizedPaymentStatus = "scheduled" | "processed" | "recycling" | "cancelled";

export interface AuthorizedPayment {
  id: string;
  preapprovalId: string;
  transactionAmount: number;
  status: AuthorizedPaymentStatus;
  dateCreated: string;
}

export interface RenewalInfo {
  lastPaymentDate: string | null;
  estimatedNextPaymentDate: string | null;
  frequency: number;
  frequencyType: FrequencyType;
}

export interface ExpirationInfo {
  endDate: string | null;
  expired: boolean;
}

export interface SubscriptionWebhookNotification {
  id?: number | string;
  type?: string;
  action?: string;
  entity?: string;
  data?: { id?: string };
  [key: string]: unknown;
}

export type MPErrorResult = { success: false; error: string; code?: string };

export type MPResult<T> = { success: true; data: T } | MPErrorResult;