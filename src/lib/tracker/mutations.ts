import { createClient } from "@/lib/auth/supabase/basic-auth/client";
import { SERVICE_COLUMNS, toRowPatch, toService, type ServiceRow } from "./mapping";
import type { Service, ServiceInput, ServicePatch, TrackerErrorCode, TrackerResult } from "./types";

/**
 * Browser-side CRUD. Authorization is enforced by the database: RLS limits
 * every statement to the caller's rows, column grants block protected
 * columns, and triggers enforce plan limits and account suspension.
 */

const INVALID_DATA_CODES = new Set(["23502", "23514", "22P02", "22007", "22008", "22003", "22001"]);

function toErrorCode(error: { message: string; code?: string }): TrackerErrorCode {
  if (error.message.includes("plan_limit_reached")) return "plan_limit_reached";
  if (error.message.includes("account_suspended")) return "account_suspended";
  if (error.code === "PGRST116") return "not_found";
  if (error.code && INVALID_DATA_CODES.has(error.code)) return "invalid_data";
  return "unknown";
}

export async function createService(input: ServiceInput): Promise<TrackerResult<Service>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({
      title: input.title,
      amount: input.amount,
      currency: input.currency,
      billing_cycle: input.billingCycle,
      next_billing_date: input.nextBillingDate,
      category: input.category,
      status: "active",
    })
    .select(SERVICE_COLUMNS)
    .single();

  if (error || !data) return { error: toErrorCode(error ?? { message: "" }), data: null };
  return { error: null, data: toService(data as ServiceRow) };
}

export async function updateService(
  id: number,
  patch: ServicePatch
): Promise<TrackerResult<Service>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("services")
    .update(toRowPatch(patch))
    .eq("id", id)
    .select(SERVICE_COLUMNS)
    .single();

  if (error || !data) return { error: toErrorCode(error ?? { message: "" }), data: null };
  return { error: null, data: toService(data as ServiceRow) };
}

export async function deleteService(id: number): Promise<TrackerResult<number>> {
  const supabase = createClient();
  const { data, error } = await supabase.from("services").delete().eq("id", id).select("id");

  if (error) return { error: toErrorCode(error), data: null };
  if (!data || data.length === 0) return { error: "not_found", data: null };
  return { error: null, data: id };
}

/** Sets (or clears, with null) the paid month of several services at once. */
export async function setPaidMonth(
  ids: number[],
  month: string | null
): Promise<TrackerResult<Service[]>> {
  if (ids.length === 0) return { error: null, data: [] };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("services")
    .update({ last_paid_month: month })
    .in("id", ids)
    .select(SERVICE_COLUMNS);

  if (error || !data) return { error: toErrorCode(error ?? { message: "" }), data: null };
  return { error: null, data: (data as ServiceRow[]).map(toService) };
}
