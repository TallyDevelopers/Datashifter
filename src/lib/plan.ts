import { SupabaseClient } from "@supabase/supabase-js";

export interface PlanFeatures {
  max_connected_orgs: number;
  max_sync_configs: number;
  can_use_filters: boolean;
  can_use_bidirectional: boolean;
  can_use_delete_sync: boolean;
}

/**
 * Loads the customer's plan features and current usage counts.
 * Returns an error string if a limit is exceeded, null if OK.
 */
export async function checkOrgLimit(
  supabase: SupabaseClient,
  customerId: string
): Promise<string | null> {
  const [{ data: customer }, { count: orgCount }] = await Promise.all([
    supabase
      .from("customers")
      .select("plan_tier")
      .eq("id", customerId)
      .single(),
    supabase
      .from("connected_orgs")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId),
  ]);

  if (!customer) return "Customer not found";

  const { data: plan } = await supabase
    .from("plan_features")
    .select("max_connected_orgs")
    .eq("plan_tier", customer.plan_tier)
    .single();

  if (!plan) return null; // Can't load plan — allow through (fail open)

  const current = orgCount ?? 0;
  if (current >= plan.max_connected_orgs) {
    return `Your ${customer.plan_tier} plan allows a maximum of ${plan.max_connected_orgs} connected org${plan.max_connected_orgs === 1 ? "" : "s"}. Upgrade to connect more.`;
  }

  return null;
}

export async function checkSyncConfigLimit(
  supabase: SupabaseClient,
  customerId: string
): Promise<string | null> {
  const [{ data: customer }, { count: syncCount }] = await Promise.all([
    supabase
      .from("customers")
      .select("plan_tier")
      .eq("id", customerId)
      .single(),
    supabase
      .from("sync_configs")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId),
  ]);

  if (!customer) return "Customer not found";

  const { data: plan } = await supabase
    .from("plan_features")
    .select("max_sync_configs, can_use_bidirectional, can_use_filters, can_use_delete_sync")
    .eq("plan_tier", customer.plan_tier)
    .single();

  if (!plan) return null; // fail open

  const current = syncCount ?? 0;
  if (current >= plan.max_sync_configs) {
    return `Your ${customer.plan_tier} plan allows a maximum of ${plan.max_sync_configs} sync configuration${plan.max_sync_configs === 1 ? "" : "s"}. Upgrade to create more.`;
  }

  return null;
}

export async function checkSyncFeatures(
  supabase: SupabaseClient,
  customerId: string,
  options: {
    bidirectional?: boolean;
    hasFilters?: boolean;
    triggerOnDelete?: boolean;
  }
): Promise<string | null> {
  const { data: customer } = await supabase
    .from("customers")
    .select("plan_tier")
    .eq("id", customerId)
    .single();

  if (!customer) return null;

  const { data: plan } = await supabase
    .from("plan_features")
    .select("can_use_bidirectional, can_use_filters, can_use_delete_sync")
    .eq("plan_tier", customer.plan_tier)
    .single();

  if (!plan) return null;

  if (options.bidirectional && !plan.can_use_bidirectional) {
    return "Bidirectional sync is not available on your current plan. Upgrade to Growth or higher.";
  }
  if (options.hasFilters && !plan.can_use_filters) {
    return "Sync filters are not available on your current plan. Upgrade to Growth or higher.";
  }
  if (options.triggerOnDelete && !plan.can_use_delete_sync) {
    return "Delete sync triggers are not available on your current plan. Upgrade to Growth or higher.";
  }

  return null;
}
