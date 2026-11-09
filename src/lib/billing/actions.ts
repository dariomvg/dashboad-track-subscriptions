"use server";

import { getCurrentUser } from "@/lib/auth/supabase/basic-auth/actions";
import { createSubscription } from "@/lib/payments/mercadopago/subscriptions/actions";
import { getPlan } from "@/lib/billing/plans";
import { getOwnSubscription, hasPaidAccess } from "@/lib/billing/subscription";
import type { BillingErrorCode, StartCheckoutResult } from "@/lib/billing/types";
import { isPaidPlanId, PLANS, ROUTES, siteConfig } from "@/lib/config";

function fail(error: BillingErrorCode): StartCheckoutResult {
  return { success: false, error };
}

/**
 * Creates the Mercado Pago subscription for the signed-in user and returns
 * the authorization URL. Everything that matters (user, email, price,
 * currency, trial) is read on the server; the client only sends a plan id.
 * Only available without a paid plan that still has time left.
 */
export async function startCheckout(planId: string): Promise<StartCheckoutResult> {
  if (!isPaidPlanId(planId)) return fail("invalid_plan");

  const { data: user } = await getCurrentUser();
  if (!user || !user.email) return fail("unauthenticated");
  if (!user.emailVerified) return fail("email_not_verified");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return fail("misconfigured");

  const [plan, subscription] = await Promise.all([
    getPlan(planId),
    getOwnSubscription(user.id),
  ]);
  if (!plan || plan.price <= 0) return fail("invalid_plan");
  if (hasPaidAccess(subscription)) return fail("already_subscribed");

  const trialEligible = plan.trialDays > 0 && !subscription?.trialUsed;

  const result = await createSubscription({
    payerEmail: user.email,
    backUrl: `${siteUrl}${ROUTES.checkoutSuccess}`,
    reason: `${siteConfig.name} ${PLANS[planId].name}`,
    externalReference: user.id,
    autoRecurring: {
      frequency: plan.frequency,
      frequencyType: "months",
      transactionAmount: plan.price,
      currencyId: plan.currency,
      ...(trialEligible && {
        freeTrial: { frequency: plan.trialDays, frequencyType: "days" as const },
      }),
    },
  });

  if (!result.success) {
    console.error("[billing] createSubscription failed", result.code, result.error);
    return fail("provider_error");
  }

  return { success: true, url: result.data.initPoint };
}

/**
 * Polled by the status pages until the webhook has applied the change.
 * With a target plan (upgrades) it waits until the subscription is on it.
 */
export async function getCheckoutStatus(targetPlan?: string): Promise<{ active: boolean }> {
  const { data: user } = await getCurrentUser();
  if (!user) return { active: false };

  const subscription = await getOwnSubscription(user.id);
  if (!hasPaidAccess(subscription)) return { active: false };

  if (targetPlan !== undefined) {
    return { active: isPaidPlanId(targetPlan) && subscription?.plan === targetPlan };
  }
  return { active: true };
}