"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { CircleCheck, Download, LoaderCircle, Plus } from "lucide-react";

import { DialogDeleteService } from "@/components/dashboard/dialog-delete-service";
import { FormService } from "@/components/dashboard/form-service";
import { SelectNative } from "@/components/dashboard/select-native";
import { TableServices } from "@/components/dashboard/table-services";
import { TotalsServices } from "@/components/dashboard/totals-services";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CURRENCIES,
  dashboardContent,
  ROUTES,
  trackerErrors,
} from "@/lib/config";
import { getLocalToday, getMonthStart, getNextChargeDate } from "@/lib/tracker/dates";
import { exportServicesCsv, exportServicesPdf } from "@/lib/tracker/export";
import {
  createService,
  deleteService,
  setPaidMonth,
  updateService,
} from "@/lib/tracker/mutations";
import { computeTotals } from "@/lib/tracker/totals";
import type {
  Service,
  ServiceInput,
  ServicePatch,
  ServiceStatus,
  TrackerErrorCode,
  TrackerResult,
} from "@/lib/tracker/types";

const ALL = "all";
const STATUS_ORDER: Record<ServiceStatus, number> = { active: 0, paused: 1, cancelled: 2 };

const subscribeNoop = () => () => {};
const getClientToday = () => getLocalToday();

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

type DashboardServicesProps = {
  initialServices: Service[];
  maxServices: number | null;
  initialToday: string;
};

export function DashboardServices({
  initialServices,
  maxServices,
  initialToday,
}: DashboardServicesProps) {
  const content = dashboardContent;

  const [services, setServices] = useState(initialServices);
  const [currencyFilter, setCurrencyFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [formState, setFormState] = useState<{ service: Service | null } | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [busyIds, setBusyIds] = useState<ReadonlySet<number>>(new Set());
  const [markingAll, setMarkingAll] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [errorCode, setErrorCode] = useState<TrackerErrorCode | null>(null);

  // Server renders with its own date; the browser then switches to the user's local date.
  const today = useSyncExternalStore(subscribeNoop, getClientToday, () => initialToday);
  const monthStart = getMonthStart(today);

  const currencies = useMemo(() => uniqueSorted(services.map((s) => s.currency)), [services]);
  const categories = useMemo(() => uniqueSorted(services.map((s) => s.category)), [services]);

  const activeCurrency = currencies.includes(currencyFilter) ? currencyFilter : ALL;
  const activeCategory = categories.includes(categoryFilter) ? categoryFilter : ALL;

  const visible = useMemo(() => {
    return services
      .filter((s) => activeCurrency === ALL || s.currency === activeCurrency)
      .filter((s) => activeCategory === ALL || s.category === activeCategory)
      .sort((a, b) => {
        if (a.status !== b.status) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        const dateA = getNextChargeDate(a.nextBillingDate, a.billingCycle, today);
        const dateB = getNextChargeDate(b.nextBillingDate, b.billingCycle, today);
        return dateA.localeCompare(dateB) || a.title.localeCompare(b.title);
      });
  }, [services, activeCurrency, activeCategory, today]);

  const totals = useMemo(() => computeTotals(visible, monthStart), [visible, monthStart]);

  const activeCount = services.filter((s) => s.status === "active").length;
  const limitReached = maxServices !== null && activeCount >= maxServices;
  const unpaidIds = services
    .filter((s) => s.status === "active" && s.lastPaidMonth !== monthStart)
    .map((s) => s.id);

  const categoryOptions = uniqueSorted([...DEFAULT_CATEGORIES, ...categories]);
  const currencyOptions = uniqueSorted([...DEFAULT_CURRENCIES, ...currencies]);

  async function runOnService(id: number, action: () => Promise<TrackerResult<Service>>) {
    setErrorCode(null);
    setBusyIds((prev) => new Set(prev).add(id));
    const result = await action();
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    if (result.error !== null) {
      setErrorCode(result.error);
      return;
    }
    setServices((prev) => prev.map((s) => (s.id === id ? result.data : s)));
  }

  function patchService(service: Service, patch: ServicePatch) {
    return runOnService(service.id, () => updateService(service.id, patch));
  }

  function handleTogglePaid(service: Service) {
    const paid = service.lastPaidMonth === monthStart;
    return patchService(service, { lastPaidMonth: paid ? null : monthStart });
  }

  async function handleMarkAllPaid() {
    setErrorCode(null);
    setMarkingAll(true);
    const result = await setPaidMonth(unpaidIds, monthStart);
    setMarkingAll(false);

    if (result.error !== null) {
      setErrorCode(result.error);
      return;
    }
    const updated = new Map(result.data.map((s) => [s.id, s]));
    setServices((prev) => prev.map((s) => updated.get(s.id) ?? s));
  }

  async function handleSubmitForm(input: ServiceInput): Promise<TrackerErrorCode | null> {
    const editing = formState?.service ?? null;
    const result = editing
      ? await updateService(editing.id, input)
      : await createService(input);

    if (result.error !== null) return result.error;

    setErrorCode(null);
    setServices((prev) =>
      editing
        ? prev.map((s) => (s.id === editing.id ? result.data : s))
        : [...prev, result.data]
    );
    setFormState(null);
    return null;
  }

  async function handleConfirmDelete(): Promise<TrackerErrorCode | null> {
    if (!deleting) return null;
    const result = await deleteService(deleting.id);

    if (result.error !== null && result.error !== "not_found") return result.error;

    setServices((prev) => prev.filter((s) => s.id !== deleting.id));
    setErrorCode(null);
    setDeleting(null);
    return null;
  }

  async function handleExport(kind: "csv" | "pdf") {
    setExporting(kind);
    try {
      if (kind === "csv") exportServicesCsv(services, today);
      else await exportServicesPdf(services, today);
    } catch {
      setErrorCode("unknown");
    } finally {
      setExporting(null);
    }
  }

  function clearFilters() {
    setCurrencyFilter(ALL);
    setCategoryFilter(ALL);
  }

  const usage =
    maxServices === null
      ? `${activeCount} ${content.usageSuffix}`
      : `${activeCount} / ${maxServices} ${content.usageSuffix}`;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{content.title}</h1>
          <p className="text-sm text-muted-foreground">{usage}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport("csv")}
            disabled={services.length === 0 || exporting !== null}
          >
            {exporting === "csv" ? <LoaderCircle className="animate-spin" /> : <Download />}
            {content.exportCsvLabel}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport("pdf")}
            disabled={services.length === 0 || exporting !== null}
          >
            {exporting === "pdf" ? <LoaderCircle className="animate-spin" /> : <Download />}
            {content.exportPdfLabel}
          </Button>
          <Button
            variant="outline"
            onClick={handleMarkAllPaid}
            disabled={unpaidIds.length === 0 || markingAll}
          >
            {markingAll ? <LoaderCircle className="animate-spin" /> : <CircleCheck />}
            {content.markAllPaidLabel}
          </Button>
          <Button onClick={() => setFormState({ service: null })} disabled={limitReached}>
            <Plus />
            {content.addLabel}
          </Button>
        </div>
      </div>

      {limitReached && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {content.limitReached}
            <Link
              href={ROUTES.plans}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {content.upgradeLabel}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {errorCode && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {trackerErrors[errorCode]}
            {errorCode === "plan_limit_reached" && (
              <Link href={ROUTES.plans} className="font-medium underline underline-offset-4">
                {content.upgradeLabel}
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}

      <TotalsServices totals={totals} />

      {services.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <CardTitle className="text-xl">{content.emptyTitle}</CardTitle>
            <CardDescription>{content.emptyDescription}</CardDescription>
            <Button className="mt-2" onClick={() => setFormState({ service: null })}>
              <Plus />
              {content.addLabel}
            </Button>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex w-full flex-col gap-2 sm:w-44">
              <Label htmlFor="filter-currency">{content.currencyFilterLabel}</Label>
              <SelectNative
                id="filter-currency"
                value={activeCurrency}
                onChange={(event) => setCurrencyFilter(event.target.value)}
              >
                <option value={ALL}>{content.allOption}</option>
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-52">
              <Label htmlFor="filter-category">{content.categoryFilterLabel}</Label>
              <SelectNative
                id="filter-category"
                value={activeCategory}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value={ALL}>{content.allOption}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>

          {visible.length === 0 ? (
            <Card>
              <CardHeader className="items-center text-center">
                <CardTitle className="text-xl">{content.noMatchTitle}</CardTitle>
                <Button variant="outline" className="mt-2" onClick={clearFilters}>
                  {content.clearFiltersLabel}
                </Button>
              </CardHeader>
            </Card>
          ) : (
            <TableServices
              services={visible}
              today={today}
              monthStart={monthStart}
              busyIds={busyIds}
              onTogglePaid={handleTogglePaid}
              onChangeStatus={(service, status) => patchService(service, { status })}
              onEdit={(service) => setFormState({ service })}
              onDelete={setDeleting}
            />
          )}
        </>
      )}

      {formState && (
        <FormService
          key={formState.service?.id ?? "new"}
          service={formState.service}
          defaultDate={
            formState.service
              ? getNextChargeDate(
                  formState.service.nextBillingDate,
                  formState.service.billingCycle,
                  today
                )
              : today
          }
          categories={categoryOptions}
          currencies={currencyOptions}
          onSubmit={handleSubmitForm}
          onClose={() => setFormState(null)}
        />
      )}

      {deleting && (
        <DialogDeleteService
          service={deleting}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}
