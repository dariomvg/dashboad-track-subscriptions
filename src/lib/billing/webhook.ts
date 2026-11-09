import "server-only";
import { getPayment } from "@/lib/billing/upgrade";
import {
  BILLING_GRACE_DAYS,
  isPaidPlanId,
  MIN_PRORATED_CHARGE,
  PLAN_RANK,
  type PaidPlanId,
  type PlanId,
} from "@/lib/config";
import {
  getAuthorizedPaymentById,
  getPreapproval,
  updatePreapprovalAmount,
  updatePreapprovalStatus,
} from "@/lib/payments/mercadopago/subscriptions/service";
import type {
  MPErrorResult,
  MPSubscription,
} from "@/lib/payments/mercadopago/subscriptions/types";
import { createAdminClient } from "@/lib/supabase/admin";

const PROVIDER = "mercadopago";
const DAY_MS = 86_400_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Not worth retrying: Mercado Pago gets a 200 and the event is stored as failed. */
export class PermanentWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentWebhookError";
  }
}

export type WebhookOutcome = { userId: string | null; result: string };

type SubscriptionRow = {
  plan: PlanId;
  status: string;
  current_period_end: string | null;
  mp_preapproval_id: string | null;
  trial_used: boolean;
  pending_plan: PlanId | null;
};

type PaidPlanRow = {
  id: PaidPlanId;
  price: number | string;
  currency: string;
  frequency: number;
};

const SUBSCRIPTION_COLUMNS =
  "plan, status, current_period_end, mp_preapproval_id, trial_used, pending_plan";

function mpError(result: MPErrorResult, context: string): Error {
  const message = `${context}: ${result.error}`;
  return result.code === "404" ? new PermanentWebhookError(message) : new Error(message);
}

function computePeriodEnd(subscription: MPSubscription, now: Date): Date {
  const next = subscription.nextPaymentDate ? new Date(subscription.nextPaymentDate) : null;

  let base: Date;
  if (next && !Number.isNaN(next.getTime())) {
    base = next;
  } else {
    base = new Date(now);
    const { frequency, frequencyType } =
      subscription.autoRecurring.freeTrial ?? subscription.autoRecurring;
    if (frequencyType === "days") {
      base.setDate(base.getDate() + frequency);
    } else {
      base.setMonth(base.getMonth() + frequency);
    }
  }

  return new Date(base.getTime() + BILLING_GRACE_DAYS * DAY_MS);
}

/**
 * Brings our row in line with the CURRENT state of the subscription at
 * Mercado Pago. Nothing from the webhook body is trusted: we only use its
 * ids to fetch the resource, so replayed or out-of-order notifications are
 * harmless.
 */
export async function syncPreapproval(
  preapprovalId: string,
  options: { extendPeriod: boolean }
): Promise<WebhookOutcome> {
  const fetched = await getPreapproval(preapprovalId);
  if (!fetched.success) throw mpError(fetched, "fetch subscription");
  const mp = fetched.data;

  const userId = mp.externalReference;
  if (!userId || !UUID_PATTERN.test(userId)) {
    throw new PermanentWebhookError("subscription has no valid external_reference");
  }

  const admin = createAdminClient();

  const { data: rowData, error: rowError } = await admin
    .from("subscriptions")
    .select(SUBSCRIPTION_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (rowError) throw new Error(`read subscription: ${rowError.message}`);
  if (!rowData) throw new PermanentWebhookError("no subscription row for external_reference");
  const row = rowData as SubscriptionRow;

  const sameSubscription = row.mp_preapproval_id === mp.id;

  switch (mp.status) {
    case "authorized": {
      const { data: plansData, error: plansError } = await admin
        .from("plans")
        .select("id, price, currency, frequency")
        .neq("id", "free");
      if (plansError) throw new Error(`read plans: ${plansError.message}`);

      const { transactionAmount, currencyId, frequency, frequencyType } = mp.autoRecurring;
      const plan = (plansData as PaidPlanRow[]).find(
        (candidate) =>
          Math.abs(Number(candidate.price) - transactionAmount) < 0.005 &&
          candidate.currency === currencyId &&
          candidate.frequency === frequency &&
          frequencyType === "months"
      );
      if (!plan) {
        throw new PermanentWebhookError("subscription terms don't match any paid plan");
      }

      const now = new Date();
      const existingEnd = row.current_period_end ? new Date(row.current_period_end) : null;

      const hasOtherActive =
        !sameSubscription &&
        row.mp_preapproval_id !== null &&
        row.plan !== "free" &&
        row.status === "active" &&
        existingEnd !== null &&
        existingEnd.getTime() > now.getTime();

      if (hasOtherActive) {
        // Double checkout: cancel the newer one so the user isn't billed twice.
        const cancelled = await updatePreapprovalStatus(mp.id, "cancelled");
        if (!cancelled.success) throw mpError(cancelled, "cancel duplicate subscription");
        throw new PermanentWebhookError("duplicate subscription cancelled");
      }

      const computedEnd = computePeriodEnd(mp, now);
      const advanced =
        sameSubscription && existingEnd !== null && computedEnd.getTime() > existingEnd.getTime();

      // A lower amount than the current plan means a scheduled downgrade: the
      // user keeps the higher plan until the next period actually starts.
      let nextPlan: PlanId = plan.id;
      let nextPending: PlanId | null = null;
      if (
        sameSubscription &&
        row.plan !== "free" &&
        PLAN_RANK[plan.id] < PLAN_RANK[row.plan]
      ) {
        if (advanced) {
          nextPlan = plan.id;
        } else {
          nextPlan = row.plan;
          nextPending = plan.id;
        }
      }

      if (
        sameSubscription &&
        !options.extendPeriod &&
        row.status === "active" &&
        row.plan === nextPlan &&
        row.pending_plan === nextPending
      ) {
        return { userId, result: "unchanged" };
      }

      const periodEnd =
        sameSubscription && existingEnd && existingEnd.getTime() > computedEnd.getTime()
          ? existingEnd
          : computedEnd;

      const { error: updateError } = await admin
        .from("subscriptions")
        .update({
          plan: nextPlan,
          pending_plan: nextPending,
          status: "active",
          mp_preapproval_id: mp.id,
          current_period_end: periodEnd.toISOString(),
          trial_used: row.trial_used || mp.autoRecurring.freeTrial !== null,
        })
        .eq("user_id", userId);
      if (updateError) throw new Error(`activate subscription: ${updateError.message}`);

      if (!sameSubscription) return { userId, result: "activated" };
      return { userId, result: advanced ? "renewed" : "synced" };
    }

    case "paused":
    case "cancelled": {
      if (!sameSubscription) return { userId, result: "ignored_other_subscription" };

      const nextStatus = mp.status === "paused" ? "suspended" : "cancelled";
      if (row.status === nextStatus) return { userId, result: "unchanged" };

      const { error: updateError } = await admin
        .from("subscriptions")
        .update({
          status: nextStatus,
          ...(nextStatus === "cancelled" ? { pending_plan: null } : {}),
        })
        .eq("user_id", userId)
        .eq("mp_preapproval_id", mp.id);
      if (updateError) throw new Error(`update status: ${updateError.message}`);

      return { userId, result: nextStatus };
    }

    default:
      return { userId, result: "ignored_status" };
  }
}

/**
 * Applies a prorated upgrade once its one-time payment is approved. Who,
 * which plan and how much come from the preference metadata (set only by
 * our access token) and are re-checked against the plans table.
 */
export async function processUpgradePayment(paymentId: string): Promise<WebhookOutcome> {
  const fetched = await getPayment(paymentId);
  if (!fetched.success) throw mpError(fetched, "fetch payment");
  const payment = fetched.data;
  const meta = payment.metadata;

  if (meta.kind !== "plan_upgrade") return { userId: null, result: "ignored_not_upgrade" };
  if (payment.status !== "approved") return { userId: null, result: "ignored_status" };

  const userId = typeof meta.user_id === "string" ? meta.user_id : "";
  const preapprovalId = typeof meta.preapproval_id === "string" ? meta.preapproval_id : "";
  const targetPlan = meta.target_plan;
  const fromPlan = meta.from_plan;
  const amount = Number(meta.amount);

  if (
    !UUID_PATTERN.test(userId) ||
    !preapprovalId ||
    !isPaidPlanId(targetPlan) ||
    !isPaidPlanId(fromPlan)
  ) {
    throw new PermanentWebhookError("upgrade payment has invalid metadata");
  }
  if (payment.externalReference !== `upgrade:${userId}`) {
    throw new PermanentWebhookError("upgrade payment reference mismatch");
  }
  if (!Number.isFinite(amount) || Math.abs(payment.transactionAmount - amount) > 0.005) {
    throw new PermanentWebhookError("upgrade payment amount mismatch");
  }

  const admin = createAdminClient();

  const { data: rowData, error: rowError } = await admin
    .from("subscriptions")
    .select(SUBSCRIPTION_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (rowError) throw new Error(`read subscription: ${rowError.message}`);
  if (!rowData) throw new PermanentWebhookError("no subscription row for upgrade payment");
  const row = rowData as SubscriptionRow;

  if (row.mp_preapproval_id !== preapprovalId) {
    throw new PermanentWebhookError("subscription changed before the upgrade payment arrived");
  }
  if (row.plan === targetPlan) return { userId, result: "already_applied" };
  if (row.plan !== fromPlan || row.status !== "active") {
    throw new PermanentWebhookError("subscription state changed; upgrade payment needs review");
  }

  const { data: plansData, error: plansError } = await admin
    .from("plans")
    .select("id, price, currency, frequency")
    .in("id", [fromPlan, targetPlan]);
  if (plansError) throw new Error(`read plans: ${plansError.message}`);

  const plans = plansData as PaidPlanRow[];
  const from = plans.find((plan) => plan.id === fromPlan);
  const target = plans.find((plan) => plan.id === targetPlan);
  if (!from || !target) throw new PermanentWebhookError("upgrade plans not found");

  const maxAmount = Number(target.price) - Number(from.price);
  if (
    payment.currencyId !== target.currency ||
    amount < Math.min(MIN_PRORATED_CHARGE, maxAmount) - 0.005 ||
    amount > maxAmount + 0.005
  ) {
    throw new PermanentWebhookError("upgrade payment amount outside the allowed range");
  }

  const updated = await updatePreapprovalAmount(preapprovalId, Number(target.price));
  if (!updated.success) throw mpError(updated, "update subscription amount");

  const { error: updateError } = await admin
    .from("subscriptions")
    .update({ plan: targetPlan, pending_plan: null })
    .eq("user_id", userId)
    .eq("mp_preapproval_id", preapprovalId);
  if (updateError) throw new Error(`apply upgrade: ${updateError.message}`);

  return { userId, result: "upgraded" };
}

export async function processNotification(
  type: string,
  dataId: string
): Promise<WebhookOutcome> {
  if (type === "payment") return processUpgradePayment(dataId);

  if (type === "subscription_authorized_payment") {
    const payment = await getAuthorizedPaymentById(dataId);
    if (!payment.success) throw mpError(payment, "fetch authorized payment");

    return syncPreapproval(payment.data.preapprovalId, {
      extendPeriod: payment.data.status === "processed",
    });
  }

  return syncPreapproval(dataId, { extendPeriod: true });
}

// ---------------------------------------------------------------------------
// Idempotency (payment_events)
// ---------------------------------------------------------------------------

export async function claimEvent(params: {
  eventKey: string;
  eventType: string;
  resourceId: string;
  payload: unknown;
}): Promise<{ id: number; alreadyProcessed: boolean }> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("payment_events")
    .insert({
      provider: PROVIDER,
      event_key: params.eventKey,
      event_type: params.eventType,
      resource_id: params.resourceId,
      payload: params.payload,
      status: "pending",
    })
    .select("id")
    .single();

  if (!error && data) return { id: data.id as number, alreadyProcessed: false };
  if (error?.code !== "23505") throw new Error(`claim event: ${error?.message}`);

  const { data: existing, error: readError } = await admin
    .from("payment_events")
    .select("id, status")
    .eq("provider", PROVIDER)
    .eq("event_key", params.eventKey)
    .single();
  if (readError || !existing) throw new Error(`read event: ${readError?.message}`);

  return { id: existing.id as number, alreadyProcessed: existing.status === "processed" };
}

export async function finishEvent(
  id: number,
  result: { status: "processed" | "failed"; userId?: string | null; error?: string }
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("payment_events")
    .update({
      status: result.status,
      error: result.status === "failed" ? (result.error ?? "unknown error").slice(0, 500) : null,
      processed_at: result.status === "processed" ? new Date().toISOString() : null,
      ...(result.userId ? { user_id: result.userId } : {}),
    })
    .eq("id", id);

  if (error) console.error("[webhook] could not update payment_events", id, error.message);
}