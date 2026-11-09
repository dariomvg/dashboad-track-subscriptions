"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { startUpgrade } from "@/lib/billing/manage";
import { billingErrors, settingsContent, type PaidPlanId } from "@/lib/config";
import { fillTemplate } from "@/lib/format";
import { redirectToSubscriptionCheckout } from "@/lib/payments/mercadopago/subscriptions/client";

type DialogUpgradePlanProps = {
  targetPlanId: PaidPlanId;
  targetName: string;
  amount: string;
  date: string;
  price: string;
};

export function DialogUpgradePlan({
  targetPlanId,
  targetName,
  amount,
  date,
  price,
}: DialogUpgradePlanProps) {
  const content = settingsContent.plan;
  const values = { plan: targetName, amount, date, price };

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);

    const result = await startUpgrade(targetPlanId);
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
    <>
      <Button onClick={() => setOpen(true)}>
        {fillTemplate(content.upgradeToLabel, values)}
      </Button>

      {open && (
        <Dialog open onOpenChange={(next) => !next && !pending && setOpen(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{fillTemplate(content.upgradeTitle, values)}</DialogTitle>
              <DialogDescription>{fillTemplate(content.upgradeBody, values)}</DialogDescription>
            </DialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                {content.dismissLabel}
              </Button>
              <Button onClick={handleConfirm} disabled={pending}>
                {pending && <LoaderCircle className="animate-spin" />}
                {pending
                  ? content.upgradingLabel
                  : fillTemplate(content.upgradeConfirmLabel, values)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
