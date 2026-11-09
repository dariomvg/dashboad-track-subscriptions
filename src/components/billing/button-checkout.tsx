"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { startCheckout } from "@/lib/billing/actions";
import { billingErrors, checkoutContent, type PaidPlanId } from "@/lib/config";
import { redirectToSubscriptionCheckout } from "@/lib/payments/mercadopago/subscriptions/client";

export function ButtonCheckout({ planId }: { planId: PaidPlanId }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);

    const result = await startCheckout(planId);
    if (!result.success) {
      setError(billingErrors[result.error]);
      setPending(false);
      return;
    }

    try {
      redirectToSubscriptionCheckout(result.url);
    } catch {
      setError(billingErrors.provider_error);
      setPending(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button className="w-full" onClick={handleClick} disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />}
        {pending ? checkoutContent.payingLabel : checkoutContent.payLabel}
      </Button>
    </div>
  );
}
