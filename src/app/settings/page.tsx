import type { Metadata } from "next";
import Link from "next/link";

import { NavbarApp } from "@/components/layouts/navbar-app";
import { CardAccount } from "@/components/settings/card-account";
import { CardCurrentPlan, type PlanState } from "@/components/settings/card-current-plan";
import { DialogCancelPlan } from "@/components/settings/dialog-cancel-plan";
import { DialogDowngradePlan } from "@/components/settings/dialog-downgrade-plan";
import { DialogUpgradePlan } from "@/components/settings/dialog-upgrade-plan";
import { FormChangePassword } from "@/components/settings/form-change-password";
import { buttonVariants } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth/supabase/basic-auth/actions";
import { getPlans } from "@/lib/billing/plans";
import { getUpgradeQuote } from "@/lib/billing/proration";
import {
  getOwnSubscription,
  getPaidThroughDate,
  hasPaidAccess,
} from "@/lib/billing/subscription";
import { fillTemplate, formatDate, formatPrice } from "@/lib/format";
import { isPaidPlanId, PLANS, ROUTES, settingsContent } from "@/lib/config";

export const metadata: Metadata = {
  title: settingsContent.metaTitle,
};

export default async function SettingsPage() {
  const user = await requireAuth();
  const [subscription, plans] = await Promise.all([getOwnSubscription(user.id), getPlans()]);

  const content = settingsContent.plan;
  const hasAccess = hasPaidAccess(subscription);
  const planId = subscription?.plan ?? "free";
  const isFree = planId === "free" || subscription?.status === "pending";

  let state: PlanState;
  if (isFree) state = "free";
  else if (hasAccess) state = subscription?.status === "cancelled" ? "cancelled" : "active";
  else state = "suspended";

  const record = plans.find((plan) => plan.id === planId);
  const priceOf = (id: string) => {
    const planRecord = plans.find((plan) => plan.id === id);
    return planRecord
      ? `${formatPrice(planRecord.price, planRecord.currency)} ${content.perMonth}`
      : content.freePrice;
  };
  const price = isFree || !record ? content.freePrice : priceOf(planId);

  const paidThrough = getPaidThroughDate(subscription);

  let detail: { label: string; value: string } | null = null;
  if (subscription?.currentPeriodEnd && !isFree) {
    if (state === "active") {
      if (paidThrough) detail = { label: content.nextPaymentLabel, value: formatDate(paidThrough) };
    } else if (state === "cancelled") {
      detail = { label: content.accessUntilLabel, value: formatDate(subscription.currentPeriodEnd) };
    } else {
      detail = { label: content.endedLabel, value: formatDate(subscription.currentPeriodEnd) };
    }
  }

  let note: string | null = null;
  if (state === "cancelled" && subscription?.currentPeriodEnd) {
    note = fillTemplate(content.cancelledNote, {
      date: formatDate(subscription.currentPeriodEnd),
    });
  } else if (state === "active" && subscription?.pendingPlan && paidThrough) {
    note = fillTemplate(content.scheduledNote, {
      plan: PLANS[subscription.pendingPlan].name,
      current: PLANS[planId].name,
      date: formatDate(paidThrough),
    });
  }

  // Standard can upgrade to Pro (paying the prorated difference); Pro can schedule Standard.
  const upgradeTarget = planId === "standard" ? "pro" : null;
  const downgradeTarget = planId === "pro" && !subscription?.pendingPlan ? "standard" : null;

  const upgradeRecord = upgradeTarget ? plans.find((plan) => plan.id === upgradeTarget) : undefined;
  const quote =
    state === "active" && record && upgradeRecord
      ? getUpgradeQuote({
          currentPrice: record.price,
          targetPrice: upgradeRecord.price,
          paidThrough,
        })
      : null;

  return (
    <>
      <NavbarApp accountName={user.email ?? ""} showUpgrade={!hasAccess} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">{settingsContent.title}</h1>

        <CardAccount
          email={user.email ?? ""}
          verified={user.emailVerified}
          createdAt={user.createdAt}
        />

        <CardCurrentPlan
          planName={PLANS[planId].name}
          state={state}
          price={price}
          detail={detail}
          note={note}
        >
          {state === "free" && (
            <Link href={ROUTES.plans} className={buttonVariants()}>
              {content.upgradeLabel}
            </Link>
          )}

          {state === "active" && (
            <>
              {upgradeTarget && isPaidPlanId(upgradeTarget) && upgradeRecord && quote && paidThrough && (
                <DialogUpgradePlan
                  targetPlanId={upgradeTarget}
                  targetName={PLANS[upgradeTarget].name}
                  amount={formatPrice(quote.amount, upgradeRecord.currency)}
                  date={formatDate(paidThrough)}
                  price={priceOf(upgradeTarget)}
                />
              )}
              {downgradeTarget && paidThrough && (
                <DialogDowngradePlan
                  targetPlanId={downgradeTarget}
                  targetName={PLANS[downgradeTarget].name}
                  currentName={PLANS[planId].name}
                  date={formatDate(paidThrough)}
                  price={priceOf(downgradeTarget)}
                />
              )}
              {subscription?.currentPeriodEnd && (
                <DialogCancelPlan accessUntil={formatDate(subscription.currentPeriodEnd)} />
              )}
            </>
          )}

          {state === "suspended" && (
            <>
              <Link
                href={`${ROUTES.checkout}?plan=${planId}`}
                className={buttonVariants()}
              >
                {content.renewLabel}
              </Link>
              <Link href={ROUTES.plans} className={buttonVariants({ variant: "outline" })}>
                {content.viewPlansLabel}
              </Link>
            </>
          )}
        </CardCurrentPlan>

        <FormChangePassword email={user.email ?? ""} />
      </main>
    </>
  );
}