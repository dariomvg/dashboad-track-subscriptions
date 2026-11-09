"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { SelectNative } from "@/components/dashboard/select-native";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dashboardContent, trackerErrors } from "@/lib/config";
import {
  BILLING_CYCLES,
  type BillingCycle,
  type Service,
  type ServiceInput,
  type TrackerErrorCode,
} from "@/lib/tracker/types";

type FormServiceProps = {
  service: Service | null;
  defaultDate: string;
  categories: string[];
  currencies: string[];
  onSubmit: (input: ServiceInput) => Promise<TrackerErrorCode | null>;
  onClose: () => void;
};

export function FormService({
  service,
  defaultDate,
  categories,
  currencies,
  onSubmit,
  onClose,
}: FormServiceProps) {
  const content = dashboardContent.form;
  const isEditing = service !== null;

  const [title, setTitle] = useState(service?.title ?? "");
  const [amount, setAmount] = useState(service ? String(service.amount) : "");
  const [currency, setCurrency] = useState(service?.currency ?? "");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(service?.billingCycle ?? "monthly");
  const [nextBillingDate, setNextBillingDate] = useState(defaultDate);
  const [category, setCategory] = useState(service?.category ?? "");
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<TrackerErrorCode | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorCode(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setErrorCode("invalid_data");
      return;
    }

    setPending(true);
    const error = await onSubmit({
      title: title.trim(),
      amount: Math.round(parsedAmount * 100) / 100,
      currency: currency.trim().toUpperCase(),
      billingCycle,
      nextBillingDate,
      category: category.trim(),
    });
    if (error) {
      setErrorCode(error);
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? content.editTitle : content.addTitle}</DialogTitle>
          <DialogDescription>
            {isEditing ? content.editDescription : content.addDescription}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {errorCode && (
            <Alert variant="destructive">
              <AlertDescription>{trackerErrors[errorCode]}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="service-title">{content.nameLabel}</Label>
            <Input
              id="service-title"
              placeholder={content.namePlaceholder}
              maxLength={100}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              disabled={pending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="service-amount">{content.costLabel}</Label>
              <Input
                id="service-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                disabled={pending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="service-currency">{content.currencyLabel}</Label>
              <Input
                id="service-currency"
                list="service-currency-options"
                placeholder={content.currencyPlaceholder}
                maxLength={3}
                pattern="[A-Za-z]{3}"
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                required
                disabled={pending}
              />
              <datalist id="service-currency-options">
                {currencies.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="service-cycle">{content.cycleLabel}</Label>
              <SelectNative
                id="service-cycle"
                value={billingCycle}
                onChange={(event) => setBillingCycle(event.target.value as BillingCycle)}
                disabled={pending}
              >
                {BILLING_CYCLES.map((cycle) => (
                  <option key={cycle} value={cycle}>
                    {dashboardContent.cycleLabels[cycle]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="service-date">{content.dateLabel}</Label>
              <Input
                id="service-date"
                type="date"
                value={nextBillingDate}
                onChange={(event) => setNextBillingDate(event.target.value)}
                required
                disabled={pending}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="service-category">{content.categoryLabel}</Label>
            <Input
              id="service-category"
              list="service-category-options"
              placeholder={content.categoryPlaceholder}
              maxLength={50}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              required
              disabled={pending}
            />
            <datalist id="service-category-options">
              {categories.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              {content.cancelLabel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" />}
              {pending
                ? content.savingLabel
                : isEditing
                  ? content.editSubmitLabel
                  : content.addSubmitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
