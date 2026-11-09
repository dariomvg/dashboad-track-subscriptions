"use server";

import { getCurrentUser } from "@/lib/auth/supabase/basic-auth/actions";
import { getPlan } from "@/lib/billing/plans";
import { getUpgradeQuote } from "@/lib/billing/proration";
import {
  getOwnSubscription,
  getPaidThroughDate,
  hasActivePaidPlan,
} from "@/lib/billing/subscription";
import type { BillingErrorCode, StartCheckoutResult } from "@/lib/billing/types";
import { createUpgradePreference } from "@/lib/billing/upgrade";
import { isPaidPlanId, PLAN_RANK, PLANS, ROUTES, siteConfig } from "@/lib/config";
import {
  cancelSubscription,
  changeSubscriptionAmount,
} from "@/lib/payments/mercadopago/subscriptions/actions";
import { createAdminClient } from "@/lib/supabase/admin";

type ManageResult = { success: true } | { success: false; error: BillingErrorCode };

function fail(error: BillingErrorCode) {
  return { success: false as const, error };
}

/**
 * Resolves the caller and their active paid subscription. The Mercado Pago
 * id always comes from OUR row for the authenticated user, never from the client.
 */
async function loadActiveSubscription() {
  const { data: user } = await getCurrentUser();
  if (!user) return { error: "unauthenticated" as const };

  const subscription = await getOwnSubscription(user.id);
  if (!subscription || !hasActivePaidPlan(subscription) || !subscription.mpPreapprovalId) {
    return { error: "not_subscribed" as const };
  }

  return { user, subscription, mpId: subscription.mpPreapprovalId };
}

/**
 * Upgrade (Standard -> Pro): the user pays the prorated price difference now
 * through a one-time Mercado Pago payment. The webhook applies the plan
 * change once that payment is approved (see processUpgradePayment).
 */
export async function startUpgrade(planId: string): Promise<StartCheckoutResult> {
  if (!isPaidPlanId(planId)) return fail("invalid_plan");

  const context = await loadActiveSubscription();
  if ("error" in context) return fail(context.error);
  const { user, subscription, mpId } = context;

  const currentPlanId = subscription.plan;
  if (!isPaidPlanId(currentPlanId)) return fail("not_subscribed");
  if (currentPlanId === planId) return fail("same_plan");
  if (PLAN_RANK[planId] < PLAN_RANK[currentPlanId]) return fail("invalid_plan");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return fail("misconfigured");

  const [current, target] = await Promise.all([getPlan(currentPlanId), getPlan(planId)]);
  if (!current || !target) return fail("invalid_plan");

  const quote = getUpgradeQuote({
    currentPrice: current.price,
    targetPrice: target.price,
    paidThrough: getPaidThroughDate(subscription),
  });
  if (!quote) return fail("upgrade_unavailable");

  try {
    const url = await createUpgradePreference({
      userId: user.id,
      email: user.email ?? "",
      fromPlan: currentPlanId,
      targetPlan: planId,
      preapprovalId: mpId,
      amount: quote.amount,
      currency: target.currency,
      title: `${siteConfig.name} ${PLANS[planId].name} upgrade (prorated)`,
      returnUrl: `${siteUrl}${ROUTES.checkoutUpgrade}?plan=${planId}`,
      failureUrl: `${siteUrl}${ROUTES.checkoutError}`,
      notificationUrl: `${siteUrl}/api/webhooks/mercadopago-subscriptions`,
    });
    return { success: true, url };
  } catch (err) {
    console.error("[billing] createUpgradePreference failed", err);
    return fail("provider_error");
  }
}

/**
 * Downgrade (Pro -> Standard): the recurring amount drops for the NEXT
 * charge, but the user keeps Pro until the period already paid ends. The
 * webhook flips the plan when the next period starts.
 */
export async function scheduleDowngrade(planId: string): Promise<ManageResult> {
  if (!isPaidPlanId(planId)) return fail("invalid_plan");

  const context = await loadActiveSubscription();
  if ("error" in context) return fail(context.error);
  const { user, subscription, mpId } = context;

  const currentPlanId = subscription.plan;
  if (!isPaidPlanId(currentPlanId)) return fail("not_subscribed");
  if (currentPlanId === planId) return fail("same_plan");
  if (PLAN_RANK[planId] > PLAN_RANK[currentPlanId]) return fail("invalid_plan");
  if (subscription.pendingPlan) return fail("change_scheduled");

  const plan = await getPlan(planId);
  if (!plan || plan.price <= 0) return fail("invalid_plan");

  const result = await changeSubscriptionAmount(mpId, plan.price);
  if (!result.success) {
    console.error("[billing] changeSubscriptionAmount failed", result.code, result.error);
    return fail("provider_error");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({ pending_plan: planId })
    .eq("user_id", user.id)
    .eq("mp_preapproval_id", mpId);

  // The webhook also records the pending downgrade from the new amount.
  if (error) console.error("[billing] could not store scheduled downgrade", error.message);

  return { success: true };
}

/**
 * Cancels the recurring payment. It can't be undone: the user keeps the
 * current plan until the end of the period already paid, with no refund,
 * and can subscribe again once it ends.
 */
export async function cancelPlan(): Promise<ManageResult> {
  const context = await loadActiveSubscription();
  if ("error" in context) return fail(context.error);

  const result = await cancelSubscription(context.mpId);
  if (!result.success) {
    console.error("[billing] cancelSubscription failed", result.code, result.error);
    return fail("provider_error");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({ status: "cancelled", pending_plan: null })
    .eq("user_id", context.user.id)
    .eq("mp_preapproval_id", context.mpId);

  // Mercado Pago is already cancelled; the webhook reconciles our row if this fails.
  if (error) console.error("[billing] could not store cancellation", error.message);

  return { success: true };
}