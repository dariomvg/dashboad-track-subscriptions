import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StatusCheckout } from "@/components/billing/status-checkout";
import { NavbarApp } from "@/components/layouts/navbar-app";
import { requireAuth } from "@/lib/auth/supabase/basic-auth/actions";
import { getOwnSubscription, hasPaidAccess } from "@/lib/billing/subscription";
import { checkoutStatusContent, ROUTES } from "@/lib/config";

export const metadata: Metadata = {
  title: checkoutStatusContent.pending.metaTitle,
};

export default async function CheckoutPendingPage() {
  const user = await requireAuth();

  const subscription = await getOwnSubscription(user.id);
  if (hasPaidAccess(subscription)) redirect(ROUTES.dashboard);

  const content = checkoutStatusContent.pending;

  return (
    <>
      <NavbarApp accountName={user.email ?? ""} showUpgrade />
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <StatusCheckout
          title={content.title}
          description={content.description}
          timeoutTitle={content.timeoutTitle}
          timeoutDescription={content.timeoutDescription}
        />
      </main>
    </>
  );
}
