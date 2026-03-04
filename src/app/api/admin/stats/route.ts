import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("admin_users").select("id, role").eq("supabase_user_id", user.id).single();
  return data ? user : null;
}

/**
 * GET /api/admin/stats
 * Platform-wide overview numbers for the admin dashboard.
 */
export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalCustomers },
    { count: newCustomers7d },
    { count: suspendedCustomers },
    { count: totalOrgs },
    { count: activeSyncs },
    { count: openTickets },
    { data: planBreakdown },
    { data: recentLogs },
  ] = await Promise.all([
    db.from("customers").select("*", { count: "exact", head: true }),
    db.from("customers").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    db.from("customers").select("*", { count: "exact", head: true }).eq("is_suspended", true),
    db.from("connected_orgs").select("*", { count: "exact", head: true }),
    db.from("sync_configs").select("*", { count: "exact", head: true }).eq("is_active", true),
    db.from("support_tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
    db.from("customers").select("plan_tier"),
    db.from("sync_logs")
      .select("records_processed, records_succeeded, records_failed, status")
      .gte("started_at", thirtyDaysAgo)
      .neq("status", "running"),
  ]);

  // Aggregate records
  let recordsProcessed = 0;
  let recordsSucceeded = 0;
  let recordsFailed = 0;
  for (const row of recentLogs ?? []) {
    recordsProcessed += row.records_processed ?? 0;
    recordsSucceeded += row.records_succeeded ?? 0;
    recordsFailed    += row.records_failed ?? 0;
  }
  const successRate = recordsProcessed > 0
    ? Math.round((recordsSucceeded / recordsProcessed) * 100)
    : null;

  // Plan breakdown counts
  const planCounts: Record<string, number> = {};
  for (const row of planBreakdown ?? []) {
    planCounts[row.plan_tier] = (planCounts[row.plan_tier] ?? 0) + 1;
  }

  return NextResponse.json({
    customers: {
      total: totalCustomers ?? 0,
      new7d: newCustomers7d ?? 0,
      suspended: suspendedCustomers ?? 0,
      byPlan: planCounts,
    },
    orgs: { total: totalOrgs ?? 0 },
    syncs: { active: activeSyncs ?? 0 },
    tickets: { open: openTickets ?? 0 },
    records: {
      processed30d: recordsProcessed,
      succeeded30d: recordsSucceeded,
      failed30d: recordsFailed,
      successRate,
    },
  });
}
