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
import { cancelPlan } from "@/lib/billing/manage";
import { billingErrors, settingsContent } from "@/lib/config";
import { fillTemplate } from "@/lib/format";

export function DialogCancelPlan({ accessUntil }: { accessUntil: string }) {
  const router = useRouter();
  const content = settingsContent.plan;

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);

    const result = await cancelPlan();
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
        {content.cancelLabel}
      </Button>

      {open && (
        <Dialog open onOpenChange={(next) => !next && !pending && setOpen(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{content.cancelTitle}</DialogTitle>
              <DialogDescription>
                {fillTemplate(content.cancelBody, { date: accessUntil })}
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
              <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
                {pending && <LoaderCircle className="animate-spin" />}
                {pending ? content.cancelingLabel : content.cancelConfirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}