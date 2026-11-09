import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/config";

export type PlanRecord = {
  id: PlanId;
  price: number;
  currency: string;
  frequency: number;
  maxServices: number | null;
  trialDays: number;
};

type PlanRow = {
  id: PlanId;
  price: number | string;
  currency: string;
  frequency: number;
  max_services: number | null;
  trial_days: number;
};

const PLAN_COLUMNS = "id, price, currency, frequency, max_services, trial_days";

function toPlanRecord(row: PlanRow): PlanRecord {
  return {
    id: row.id,
    price: Number(row.price),
    currency: row.currency,
    frequency: row.frequency,
    maxServices: row.max_services,
    trialDays: row.trial_days,
  };
}

/** Source of truth for prices, limits and trial: the `plans` table. */
export async function getPlans(): Promise<PlanRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select(PLAN_COLUMNS)
    .order("price", { ascending: true });

  if (error || !data) throw new Error("Could not load plans.");
  return (data as PlanRow[]).map(toPlanRecord);
}

export async function getPlan(id: PlanId): Promise<PlanRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select(PLAN_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("Could not load plan.");
  return data ? toPlanRecord(data as PlanRow) : null;
}