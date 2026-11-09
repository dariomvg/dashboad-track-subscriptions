import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ButtonCheckout } from "@/components/billing/button-checkout";
import { NavbarApp } from "@/components/layouts/navbar-app";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAuth } from "@/lib/auth/supabase/basic-auth/actions";
import { getPlan } from "@/lib/billing/plans";
import { getOwnSubscription, hasPaidAccess } from "@/lib/billing/subscription";
import { formatPrice } from "@/lib/format";
import { checkoutContent, isPaidPlanId, PLANS, plansContent, ROUTES } from "@/lib/config";

export const metadata: Metadata = {
  title: checkoutContent.metaTitle,
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const user = await requireAuth();

  const params = await searchParams;
  const planId = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  if (!isPaidPlanId(planId)) redirect(ROUTES.plans);

  const [plan, subscription] = await Promise.all([
    getPlan(planId),
    getOwnSubscription(user.id),
  ]);
  if (!plan) redirect(ROUTES.plans);
  if (hasPaidAccess(subscription)) redirect(ROUTES.settings);

  const trialEligible = plan.trialDays > 0 && !subscription?.trialUsed;
  const price = `${formatPrice(plan.price, plan.currency)} ${plansContent.perMonth}`;

  return (
    <>
      <NavbarApp accountName={user.email ?? ""} showUpgrade />
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">{checkoutContent.title}</CardTitle>
            <CardDescription>{checkoutContent.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-3">
              <SummaryRow label={checkoutContent.planLabel} value={PLANS[planId].name} />
              <SummaryRow label={checkoutContent.billingLabel} value={checkoutContent.billingValue} />
              <SummaryRow label={checkoutContent.priceLabel} value={price} />
              {trialEligible && (
                <SummaryRow
                  label={checkoutContent.trialLabel}
                  value={`${plan.trialDays} ${checkoutContent.trialSuffix}`}
                />
              )}
              <SummaryRow
                label={checkoutContent.dueTodayLabel}
                value={
                  trialEligible
                    ? checkoutContent.dueTodayFree
                    : formatPrice(plan.price, plan.currency)
                }
              />
            </dl>
            <p className="pt-6 text-sm text-muted-foreground">{checkoutContent.note}</p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <ButtonCheckout planId={planId} />
            <Link
              href={ROUTES.plans}
              className={buttonVariants({ variant: "ghost", className: "w-full" })}
            >
              {checkoutContent.backLabel}
            </Link>
          </CardFooter>
        </Card>
      </main>
    </>
  );
}