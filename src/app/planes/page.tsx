import type { Metadata } from "next";
import Link from "next/link";

import { CardPlan, type PlanCta } from "@/components/billing/card-plan";
import { NavbarApp } from "@/components/layouts/navbar-app";
import { NavbarPublic } from "@/components/layouts/navbar-public";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/supabase/basic-auth/actions";
import { getPlans } from "@/lib/billing/plans";
import {
  getEffectivePlan,
  getOwnSubscription,
  hasPaidAccess,
} from "@/lib/billing/subscription";
import { formatPrice } from "@/lib/format";
import { PLAN_IDS, PLANS, plansContent, ROUTES, type PlanId } from "@/lib/config";

export const metadata: Metadata = {
  title: plansContent.metaTitle,
};

type ResolveCtaParams = {
  planId: PlanId;
  isLoggedIn: boolean;
  hasPaid: boolean;
  cancelled: boolean;
  subscriptionPlan: PlanId | null;
  effectivePlan: PlanId | null;
};

function resolveCta({
  planId,
  isLoggedIn,
  hasPaid,
  cancelled,
  subscriptionPlan,
  effectivePlan,
}: ResolveCtaParams): PlanCta {
  const choose = `${plansContent.choosePrefix} ${PLANS[planId].name}`;

  if (!isLoggedIn) {
    if (planId === "free") {
      return { kind: "link", href: ROUTES.signup, label: plansContent.getStartedLabel, variant: "outline" };
    }
    const checkout = `${ROUTES.checkout}?plan=${planId}`;
    return {
      kind: "link",
      href: `${ROUTES.login}?next=${encodeURIComponent(checkout)}`,
      label: choose,
      variant: "default",
    };
  }

  if (hasPaid) {
    if (planId === subscriptionPlan) return { kind: "current" };
    // A cancelled plan can't be changed: it just runs until it ends.
    if (planId === "free" || cancelled) return { kind: "none" };
    return { kind: "link", href: ROUTES.settings, label: plansContent.manageLabel, variant: "outline" };
  }

  if (planId === "free") {
    return effectivePlan === "free" ? { kind: "current" } : { kind: "none" };
  }
  return { kind: "link", href: `${ROUTES.checkout}?plan=${planId}`, label: choose, variant: "default" };
}

export default async function PlansPage() {
  const [plans, { data: user }] = await Promise.all([getPlans(), getCurrentUser()]);
  const subscription = user ? await getOwnSubscription(user.id) : null;

  const hasPaid = hasPaidAccess(subscription);
  const cancelled = subscription?.status === "cancelled";
  const effectivePlan = getEffectivePlan(subscription);

  return (
    <>
      {user ? (
        <NavbarApp accountName={user.email ?? ""} showUpgrade={!hasPaid} />
      ) : (
        <NavbarPublic />
      )}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {plansContent.title}
          </h1>
          <p className="max-w-2xl text-balance text-muted-foreground">
            {plansContent.description}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {PLAN_IDS.map((planId) => {
            const record = plans.find((plan) => plan.id === planId);
            if (!record) return null;

            const display = PLANS[planId];
            const isFree = record.price === 0;
            const showTrial = record.trialDays > 0 && !hasPaid && !subscription?.trialUsed;

            return (
              <CardPlan
                key={planId}
                name={display.name}
                description={display.description}
                features={display.features}
                price={isFree ? plansContent.freePrice : formatPrice(record.price, record.currency)}
                period={isFree ? null : plansContent.perMonth}
                trialBadge={showTrial ? `${record.trialDays} ${plansContent.trialSuffix}` : null}
                cta={resolveCta({
                  planId,
                  isLoggedIn: Boolean(user),
                  hasPaid,
                  cancelled,
                  subscriptionPlan: subscription?.plan ?? null,
                  effectivePlan,
                })}
              />
            );
          })}
        </div>

        {user && effectivePlan === "free" && (
          <div className="flex justify-center">
            <Link href={ROUTES.dashboard} className={buttonVariants({ variant: "ghost" })}>
              {plansContent.continueFreeLabel}
            </Link>
          </div>
        )}
      </main>
    </>
  );
}