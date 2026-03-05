import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/dashboard
 * Returns all data needed to render the customer dashboard in a single round-trip:
 * - stat counts (orgs, active syncs, active migrations, records last 30 days, success rate)
 * - unified recent activity (sync logs + migration runs, sorted by time)
 * - active sync configs and active migrations (for health strip)
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

  const allSyncIds = (syncConfigs ?? []).map((s: { id: string }) => s.id);
  const activeSyncs = (syncConfigs ?? []).filter((s: { is_active: boolean }) => s.is_active);

  // Migration jobs for this customer
  const { data: migrationJobs } = await supabase
    .from("cpq_jobs")
    .select("id, name, is_active, interval_minutes, last_run_at, source_org:connected_orgs!source_org_id(label), target_org:connected_orgs!target_org_id(label), cpq_job_objects(step_order, source_object, target_object, label)")
    .eq("customer_id", customer.id);

  const allMigrationJobIds = (migrationJobs ?? []).map((j: { id: string }) => j.id);
  const activeMigrations = (migrationJobs ?? []).filter((j: { is_active: boolean }) => j.is_active);

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

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 30-day aggregates from sync_logs
  let recordsProcessed = 0;
  let recordsSucceeded = 0;

  if (allSyncIds.length > 0) {
    const { data: logAgg } = await supabase
      .from("sync_logs")
      .select("records_processed, records_succeeded")
      .in("sync_config_id", allSyncIds)
      .gte("started_at", thirtyDaysAgo)
      .neq("status", "running");

    for (const row of logAgg ?? []) {
      recordsProcessed += row.records_processed ?? 0;
      recordsSucceeded += row.records_succeeded ?? 0;
    }
  }

  // 30-day aggregates from migration run steps
  if (allMigrationJobIds.length > 0) {
    const { data: migRunIds } = await supabase
      .from("cpq_job_runs")
      .select("id")
      .in("job_id", allMigrationJobIds)
      .gte("started_at", thirtyDaysAgo)
      .neq("status", "running");

    const runIds = (migRunIds ?? []).map((r: { id: string }) => r.id);
    if (runIds.length > 0) {
      const { data: stepAgg } = await supabase
        .from("cpq_job_run_steps")
        .select("records_queried, records_succeeded")
        .in("run_id", runIds);

      for (const row of stepAgg ?? []) {
        recordsProcessed += row.records_queried ?? 0;
        recordsSucceeded += row.records_succeeded ?? 0;
      }
    }
  }

  const successRate = recordsProcessed > 0
    ? Math.round((recordsSucceeded / recordsProcessed) * 100)
    : null;

  // Recent sync logs (type: "sync")
  let recentSyncLogs: unknown[] = [];
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
    recentSyncLogs = (logs ?? []).map((l) => ({ ...l, activity_type: "sync" }));
  }

  // Recent migration runs (type: "migration")
  let recentMigrationRuns: unknown[] = [];
  if (allMigrationJobIds.length > 0) {
    const { data: runs } = await supabase
      .from("cpq_job_runs")
      .select(`
        id, status, triggered_by, started_at, completed_at,
        job:cpq_jobs(id, name,
          source_org:connected_orgs!source_org_id(label),
          target_org:connected_orgs!target_org_id(label)
        ),
        cpq_job_run_steps(records_queried, records_succeeded, records_failed, status)
      `)
      .in("job_id", allMigrationJobIds)
      .order("started_at", { ascending: false })
      .limit(5);

    recentMigrationRuns = (runs ?? []).map((r) => {
      const steps = (r as { cpq_job_run_steps: Array<{ records_queried: number; records_succeeded: number; records_failed: number }> }).cpq_job_run_steps ?? [];
      const records_processed = steps.reduce((a: number, s) => a + (s.records_queried ?? 0), 0);
      const records_succeeded = steps.reduce((a: number, s) => a + (s.records_succeeded ?? 0), 0);
      const records_failed = steps.reduce((a: number, s) => a + (s.records_failed ?? 0), 0);
      return { ...r, activity_type: "migration", records_processed, records_succeeded, records_failed };
    });
  }

  // Merge and sort unified activity feed by started_at desc, take top 8
  const allActivity = [...recentSyncLogs, ...recentMigrationRuns]
    .sort((a, b) => new Date((b as { started_at: string }).started_at).getTime() - new Date((a as { started_at: string }).started_at).getTime())
    .slice(0, 8);

  return NextResponse.json({
    customer,
    stats: {
      orgCount: orgCount ?? 0,
      activeSyncCount: activeSyncs.length,
      totalSyncCount: (syncConfigs ?? []).length,
      activeMigrationCount: activeMigrations.length,
      totalMigrationCount: (migrationJobs ?? []).length,
      recordsProcessed,
      successRate,
      openTickets: openTickets ?? 0,
    },
    recentActivity: allActivity,
    activeSyncs,
    activeMigrations,
  });
}
