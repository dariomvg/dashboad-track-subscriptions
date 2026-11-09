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
import { scheduleDowngrade } from "@/lib/billing/manage";
import { billingErrors, settingsContent, type PaidPlanId } from "@/lib/config";
import { fillTemplate } from "@/lib/format";

type DialogDowngradePlanProps = {
  targetPlanId: PaidPlanId;
  targetName: string;
  currentName: string;
  date: string;
  price: string;
};

export function DialogDowngradePlan({
  targetPlanId,
  targetName,
  currentName,
  date,
  price,
}: DialogDowngradePlanProps) {
  const router = useRouter();
  const content = settingsContent.plan;
  const values = { plan: targetName, current: currentName, date, price };

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);

    const result = await scheduleDowngrade(targetPlanId);
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
        {fillTemplate(content.downgradeToLabel, values)}
      </Button>

      {open && (
        <Dialog open onOpenChange={(next) => !next && !pending && setOpen(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{fillTemplate(content.downgradeTitle, values)}</DialogTitle>
              <DialogDescription>
                {fillTemplate(content.downgradeBody, values)}
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
                {pending ? content.downgradingLabel : content.downgradeConfirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
