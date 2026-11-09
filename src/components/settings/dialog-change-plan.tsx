"use client";

import { useRouter } from "next/navigation";
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
import { changePlan } from "@/lib/billing/manage";
import { billingErrors, settingsContent, type PaidPlanId } from "@/lib/config";

type DialogChangePlanProps = {
  targetPlanId: PaidPlanId;
  targetName: string;
  price: string;
};

export function DialogChangePlan({ targetPlanId, targetName, price }: DialogChangePlanProps) {
  const router = useRouter();
  const content = settingsContent.plan;

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);

    const result = await changePlan(targetPlanId);
    if (!result.success) {
      setError(billingErrors[result.error]);
      setPending(false);
      return;
    }

    setOpen(false);
    setPending(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {content.switchPrefix} {targetName}
      </Button>

      {open && (
        <Dialog open onOpenChange={(next) => !next && !pending && setOpen(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {content.switchPrefix} {targetName}?
              </DialogTitle>
              <DialogDescription>
                {content.switchBodyPrefix} {price}. {content.switchBodySuffix}
              </DialogDescription>
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
                {pending ? content.switchingLabel : content.switchConfirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
