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
import { dashboardContent, trackerErrors } from "@/lib/config";
import type { Service, TrackerErrorCode } from "@/lib/tracker/types";

type DialogDeleteServiceProps = {
  service: Service;
  onConfirm: () => Promise<TrackerErrorCode | null>;
  onClose: () => void;
};

export function DialogDeleteService({ service, onConfirm, onClose }: DialogDeleteServiceProps) {
  const content = dashboardContent.deleteDialog;
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<TrackerErrorCode | null>(null);

  async function handleConfirm() {
    setPending(true);
    setErrorCode(null);
    const error = await onConfirm();
    if (error) {
      setErrorCode(error);
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>
        <p className="text-sm font-medium">{service.title}</p>
        {errorCode && (
          <Alert variant="destructive">
            <AlertDescription>{trackerErrors[errorCode]}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            {content.cancelLabel}
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" />}
            {pending ? content.confirmingLabel : content.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
