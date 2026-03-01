import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/dashboard
 * Returns all data needed to render the customer dashboard in a single round-trip:
 * - stat counts (orgs, active syncs, records last 30 days, success rate)
 * - 5 most recent sync logs with config info
 * - active sync configs (for health strip)
 * - open support ticket count
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, plan_tier")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // All sync config IDs for this customer
  const { data: syncConfigs } = await supabase
    .from("sync_configs")
    .select("id, name, source_object, target_object, is_active, source_org:connected_orgs!source_org_id(label), target_org:connected_orgs!target_org_id(label)")
    .eq("customer_id", customer.id);

  const allSyncIds = (syncConfigs ?? []).map((s) => s.id);
  const activeSyncs = (syncConfigs ?? []).filter((s) => s.is_active);

  // Connected orgs count
  const { count: orgCount } = await supabase
    .from("connected_orgs")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customer.id);

  // Open ticket count
  const { count: openTickets } = await supabase
    .from("support_tickets")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customer.id)
    .in("status", ["open", "in_progress"]);

  // 30-day aggregates from sync_logs
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let recordsProcessed = 0;
  let recordsSucceeded = 0;

  if (allSyncIds.length > 0) {
    const { data: logAgg } = await supabase
      .from("sync_logs")
      .select("records_processed, records_succeeded, records_failed")
      .in("sync_config_id", allSyncIds)
      .gte("started_at", thirtyDaysAgo)
      .neq("status", "running");

    for (const row of logAgg ?? []) {
      recordsProcessed += row.records_processed ?? 0;
      recordsSucceeded += row.records_succeeded ?? 0;
    }
  }

  const successRate = recordsProcessed > 0
    ? Math.round((recordsSucceeded / recordsProcessed) * 100)
    : null;

  // 5 most recent logs
  let recentLogs: unknown[] = [];
  if (allSyncIds.length > 0) {
    const { data: logs } = await supabase
      .from("sync_logs")
      .select(`
        id, status, records_processed, records_succeeded, records_failed,
        started_at, completed_at,
        sync_config:sync_configs(id, name, source_object, target_object,
          source_org:connected_orgs!source_org_id(label),
          target_org:connected_orgs!target_org_id(label)
        )
      `)
      .in("sync_config_id", allSyncIds)
      .order("started_at", { ascending: false })
      .limit(5);
    recentLogs = logs ?? [];
  }

  return NextResponse.json({
    customer,
    stats: {
      orgCount: orgCount ?? 0,
      activeSyncCount: activeSyncs.length,
      totalSyncCount: (syncConfigs ?? []).length,
      recordsProcessed,
      successRate,
      openTickets: openTickets ?? 0,
    },
    recentLogs,
    activeSyncs,
  });
}
