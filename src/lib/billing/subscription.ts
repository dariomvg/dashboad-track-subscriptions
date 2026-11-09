import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  BILLING_GRACE_DAYS,
  EXPIRY_WARNING_DAYS,
  type PlanId,
  type SubscriptionStatus,
} from "@/lib/config";

export type OwnSubscription = {
  plan: PlanId;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  trialUsed: boolean;
  mpPreapprovalId: string | null;
  pendingPlan: PlanId | null;
};

type SubscriptionRow = {
  plan: PlanId;
  status: SubscriptionStatus;
  current_period_end: string | null;
  trial_used: boolean;
  mp_preapproval_id: string | null;
  pending_plan: PlanId | null;
};

/** Reads the caller's own row (RLS only exposes it to its owner). */
export async function getOwnSubscription(userId: string): Promise<OwnSubscription | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end, trial_used, mp_preapproval_id, pending_plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error("Could not load subscription.");
  if (!data) return null;

  const row = data as SubscriptionRow;
  return {
    plan: row.plan,
    status: row.status,
    currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end) : null,
    trialUsed: row.trial_used,
    mpPreapprovalId: row.mp_preapproval_id,
    pendingPlan: row.pending_plan,
  };
}

/** A paid plan the user can still use: active, or cancelled with days left. */
export function hasPaidAccess(sub: OwnSubscription | null, now = new Date()): boolean {
  if (!sub || sub.plan === "free") return false;
  if (sub.status !== "active" && sub.status !== "cancelled") return false;
  return sub.currentPeriodEnd !== null && sub.currentPeriodEnd.getTime() > now.getTime();
}

/** Mirrors public.effective_plan() in the database; null means suspended. */
export function getEffectivePlan(sub: OwnSubscription | null, now = new Date()): PlanId | null {
  if (!sub) return null;
  if (sub.plan === "free" || sub.status === "pending") return "free";
  return hasPaidAccess(sub, now) ? sub.plan : null;
}

export type ExpiryNotice = { kind: "ending" | "overdue"; endsAt: Date };

const DAY_MS = 86_400_000;

/**
 * - ending: a cancelled plan that's about to run out.
 * - overdue: an active plan whose renewal charge hasn't been confirmed yet
 *   (we're inside the grace window after the next payment date).
 */
export function getExpiryNotice(
  sub: OwnSubscription | null,
  now = new Date()
): ExpiryNotice | null {
  if (!sub || !sub.currentPeriodEnd || !hasPaidAccess(sub, now)) return null;

  const msLeft = sub.currentPeriodEnd.getTime() - now.getTime();

  if (sub.status === "cancelled" && msLeft <= EXPIRY_WARNING_DAYS * DAY_MS) {
    return { kind: "ending", endsAt: sub.currentPeriodEnd };
  }
  if (sub.status === "active" && msLeft <= BILLING_GRACE_DAYS * DAY_MS) {
    return { kind: "overdue", endsAt: sub.currentPeriodEnd };
  }
  return null;
}

/** An active (auto-renewing) paid plan, as opposed to a cancelled one with days left. */
export function hasActivePaidPlan(sub: OwnSubscription | null, now = new Date()): boolean {
  return sub?.status === "active" && hasPaidAccess(sub, now);
}

/** The date the user has actually paid through (the period end minus the grace days). */
export function getPaidThroughDate(sub: OwnSubscription | null): Date | null {
  if (!sub?.currentPeriodEnd) return null;
  return new Date(sub.currentPeriodEnd.getTime() - BILLING_GRACE_DAYS * DAY_MS);
}