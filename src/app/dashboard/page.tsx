import type { Metadata } from "next";

import { DashboardServices } from "@/components/dashboard/dashboard-services";
import { NoticeExpiry } from "@/components/dashboard/notice-expiry";
import { NoticeSuspended } from "@/components/dashboard/notice-suspended";
import { NavbarApp } from "@/components/layouts/navbar-app";
import { requireAuth } from "@/lib/auth/supabase/basic-auth/actions";
import { getPlan } from "@/lib/billing/plans";
import {
  getEffectivePlan,
  getExpiryNotice,
  getOwnSubscription,
  hasPaidAccess,
} from "@/lib/billing/subscription";
import { dashboardContent, PLANS, ROUTES } from "@/lib/config";
import { getServices } from "@/lib/tracker/queries";

export const metadata: Metadata = {
  title: dashboardContent.metaTitle,
};

export default async function DashboardPage() {
  const user = await requireAuth();
  const subscription = await getOwnSubscription(user.id);

  const effectivePlan = getEffectivePlan(subscription);
  const navbar = (
    <NavbarApp accountName={user.email ?? ""} showUpgrade={!hasPaidAccess(subscription)} />
  );

  // No access (expired or suspended): the account is suspended until it renews.
  if (effectivePlan === null) {
    const renewHref =
      subscription && subscription.plan !== "free"
        ? `${ROUTES.checkout}?plan=${subscription.plan}`
        : ROUTES.plans;

    return (
      <>
        {navbar}
        <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
          <NoticeSuspended renewHref={renewHref} />
        </main>
      </>
    );
  }

  const [services, plan] = await Promise.all([getServices(user.id), getPlan(effectivePlan)]);
  const notice = getExpiryNotice(subscription);

  return (
    <>
      {navbar}
      <main className="flex-1">
        {notice && subscription && (
          <div className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6">
            <NoticeExpiry notice={notice} planName={PLANS[subscription.plan].name} />
          </div>
        )}
        <DashboardServices
          initialServices={services}
          maxServices={plan?.maxServices ?? null}
          initialToday={new Date().toISOString().slice(0, 10)}
        />
      </main>
    </>
  );
}
