import "server-only";

/**
 * Server-side functions for the Mercado Pago Subscriptions module.
 *
 * NOT a "use server" file on purpose: every export of a "use server" file is
 * a public endpoint any client can call with arbitrary arguments, and these
 * functions (cancel, change amount, read any subscription by id) perform no
 * ownership checks. They must only be called from our own authenticated
 * server code (see src/lib/billing/actions.ts), which verifies the user.
 */

import {
  createPreapproval,
  getPreapproval,
  getPreapprovalStatus,
  getAuthorizedPayments,
  updatePreapprovalStatus,
  updatePreapprovalAmount,
} from "./service";
import type {
  CreateSubscriptionInput,
  MPSubscriptionResult,
  MPSubscription,
  SubscriptionStatusResult,
  RenewalInfo,
  ExpirationInfo,
  MPResult,
} from "./types";

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/** Creates a subscription and returns the URL to redirect the payer to for authorization. */
export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<MPResult<MPSubscriptionResult>> {
  if (!input.payerEmail) {
    return { success: false, error: "A payerEmail is required." };
  }
  if (!input.backUrl) {
    return { success: false, error: "A backUrl is required." };
  }
  if (!input.externalReference) {
    return { success: false, error: "An externalReference is required." };
  }

  const { frequency, transactionAmount, currencyId } = input.autoRecurring ?? {};
  if (!Number.isInteger(frequency) || (frequency as number) <= 0) {
    return { success: false, error: "A positive integer frequency is required." };
  }
  if (!Number.isFinite(transactionAmount) || (transactionAmount as number) <= 0) {
    return { success: false, error: "A positive transactionAmount is required." };
  }
  if (!currencyId) {
    return { success: false, error: "A currencyId is required." };
  }

  return createPreapproval(input);
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Fetches the full subscription record by id. */
export async function getSubscription(id: string): Promise<MPResult<MPSubscription>> {
  if (!id) return { success: false, error: "A subscription id is required." };
  return getPreapproval(id);
}

/** Fetches a simplified status snapshot for a subscription. */
export async function getSubscriptionStatus(
  id: string
): Promise<MPResult<SubscriptionStatusResult>> {
  if (!id) return { success: false, error: "A subscription id is required." };
  return getPreapprovalStatus(id);
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/** Cancels a subscription. Terminal — it cannot be resumed after this. */
export async function cancelSubscription(id: string): Promise<MPResult<MPSubscription>> {
  if (!id) return { success: false, error: "A subscription id is required." };
  return updatePreapprovalStatus(id, "cancelled");
}

/** Pauses an active subscription. */
export async function pauseSubscription(id: string): Promise<MPResult<MPSubscription>> {
  if (!id) return { success: false, error: "A subscription id is required." };
  return updatePreapprovalStatus(id, "paused");
}

/** Resumes a paused subscription. */
export async function resumeSubscription(id: string): Promise<MPResult<MPSubscription>> {
  if (!id) return { success: false, error: "A subscription id is required." };
  return updatePreapprovalStatus(id, "authorized");
}

// ---------------------------------------------------------------------------
// Plan / amount changes
// ---------------------------------------------------------------------------

/**
 * Changes a subscription's recurring amount. Used for upgrade, downgrade,
 * plan changes, and quantity changes alike — Mercado Pago only lets you
 * update the transaction amount on an active subscription, not swap plans.
 * Whether a given call is an "upgrade" or "downgrade" is a decision made by
 * the caller, not this function.
 */
export async function changeSubscriptionAmount(
  id: string,
  newAmount: number
): Promise<MPResult<MPSubscription>> {
  if (!id) return { success: false, error: "A subscription id is required." };
  if (!Number.isFinite(newAmount) || newAmount <= 0) {
    return { success: false, error: "A positive newAmount is required." };
  }
  return updatePreapprovalAmount(id, newAmount);
}

// ---------------------------------------------------------------------------
// Renewal / expiration (read-only — Mercado Pago has no "renew" endpoint)
// ---------------------------------------------------------------------------

/**
 * Renewal info. `estimatedNextPaymentDate` prefers Mercado Pago's own
 * `next_payment_date`; if it's missing it falls back to the last processed
 * authorized payment plus the billing frequency.
 */
export async function getRenewalInfo(id: string): Promise<MPResult<RenewalInfo>> {
  if (!id) return { success: false, error: "A subscription id is required." };

  const subscriptionResult = await getPreapproval(id);
  if (!subscriptionResult.success) return subscriptionResult;

  const paymentsResult = await getAuthorizedPayments(id);
  if (!paymentsResult.success) return paymentsResult;

  const { frequency, frequencyType } = subscriptionResult.data.autoRecurring;
  const processedPayments = paymentsResult.data
    .filter((p) => p.status === "processed")
    .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());

  const lastPaymentDate = processedPayments[0]?.dateCreated ?? null;

  let estimatedNextPaymentDate: string | null = subscriptionResult.data.nextPaymentDate;
  if (!estimatedNextPaymentDate && lastPaymentDate) {
    const next = new Date(lastPaymentDate);
    if (frequencyType === "days") {
      next.setDate(next.getDate() + frequency);
    } else {
      next.setMonth(next.getMonth() + frequency);
    }
    estimatedNextPaymentDate = next.toISOString();
  }

  return {
    success: true,
    data: { lastPaymentDate, estimatedNextPaymentDate, frequency, frequencyType },
  };
}

/** Reads whether a subscription has a defined end date, and whether it's already past it. */
export async function getExpirationInfo(id: string): Promise<MPResult<ExpirationInfo>> {
  if (!id) return { success: false, error: "A subscription id is required." };

  const result = await getPreapproval(id);
  if (!result.success) return result;

  const endDate = result.data.autoRecurring.endDate;
  const expired = endDate ? new Date(endDate).getTime() < Date.now() : false;

  return { success: true, data: { endDate, expired } };
}