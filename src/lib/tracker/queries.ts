import "server-only";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_COLUMNS, toService, type ServiceRow } from "./mapping";
import type { Service } from "./types";

/** Initial load for the dashboard. RLS limits the result to the caller's rows. */
export async function getServices(userId: string): Promise<Service[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select(SERVICE_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error || !data) throw new Error("Could not load services.");
  return (data as ServiceRow[]).map(toService);
}
