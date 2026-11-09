import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StatusCheckout } from "@/components/billing/status-checkout";
import { NavbarApp } from "@/components/layouts/navbar-app";
import { requireAuth } from "@/lib/auth/supabase/basic-auth/actions";
import { getOwnSubscription, hasPaidAccess } from "@/lib/billing/subscription";
import { checkoutStatusContent, isPaidPlanId, ROUTES } from "@/lib/config";

export const metadata: Metadata = {
  title: checkoutStatusContent.upgrade.metaTitle,
};

export default async function CheckoutUpgradePage({
  searchParams,
}: PageProps<"/checkout/upgrade">) {
  const user = await requireAuth();

  const params = await searchParams;
  const planParam = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  if (!isPaidPlanId(planParam)) redirect(ROUTES.settings);

  const subscription = await getOwnSubscription(user.id);
  if (hasPaidAccess(subscription) && subscription?.plan === planParam) {
    redirect(ROUTES.dashboard);
  }

  const content = checkoutStatusContent.upgrade;

  return (
    <>
      <NavbarApp accountName={user.email ?? ""} showUpgrade={false} />
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <StatusCheckout
          title={content.title}
          description={content.description}
          timeoutTitle={content.timeoutTitle}
          timeoutDescription={content.timeoutDescription}
          targetPlan={planParam}
        />
      </main>
    </>
  );
}
