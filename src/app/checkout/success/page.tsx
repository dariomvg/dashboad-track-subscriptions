import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StatusCheckout } from "@/components/billing/status-checkout";
import { NavbarApp } from "@/components/layouts/navbar-app";
import { requireAuth } from "@/lib/auth/supabase/basic-auth/actions";
import { getOwnSubscription, hasPaidAccess } from "@/lib/billing/subscription";
import { checkoutStatusContent, ROUTES } from "@/lib/config";
import { getSubscription } from "@/lib/payments/mercadopago/subscriptions/actions";

export const metadata: Metadata = {
  title: checkoutStatusContent.success.metaTitle,
};

const PREAPPROVAL_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export default async function CheckoutSuccessPage({
  searchParams,
}: PageProps<"/checkout/success">) {
  const user = await requireAuth();

  const params = await searchParams;
  const preapprovalId = Array.isArray(params.preapproval_id)
    ? params.preapproval_id[0]
    : params.preapproval_id;

  // The id in the URL is only used to route the UI, never to grant access:
  // it must belong to this user according to Mercado Pago itself.
  if (preapprovalId && PREAPPROVAL_ID_PATTERN.test(preapprovalId)) {
    const result = await getSubscription(preapprovalId);
    if (result.success && result.data.externalReference === user.id) {
      if (result.data.status === "pending") redirect(ROUTES.checkoutPending);
      if (result.data.status === "cancelled") redirect(ROUTES.checkoutError);
    }
  }

  const subscription = await getOwnSubscription(user.id);
  if (hasPaidAccess(subscription)) redirect(ROUTES.dashboard);

  const content = checkoutStatusContent.success;

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
