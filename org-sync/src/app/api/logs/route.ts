import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/logs
 * Returns all sync logs for the authenticated customer across all sync configs.
 * Supports ?syncId= to filter by a specific sync config.
 * Supports ?limit= (default 50) and ?offset= for pagination.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const searchParams = request.nextUrl.searchParams;
  const syncId = searchParams.get("syncId");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  // Get sync config IDs belonging to this customer
  let syncQuery = supabase
    .from("sync_configs")
    .select("id")
    .eq("customer_id", customer.id);
  if (syncId) syncQuery = syncQuery.eq("id", syncId);
  const { data: customerSyncs } = await syncQuery;
  const syncIds = (customerSyncs ?? []).map((s) => s.id);

  if (syncIds.length === 0) return NextResponse.json({ logs: [], total: 0 });

  const { data: logs, error, count } = await supabase
    .from("sync_logs")
    .select(`
      id, status, records_processed, records_succeeded, records_failed,
      started_at, completed_at,
      sync_config:sync_configs(id, name, source_object, target_object,
        source_org:connected_orgs!source_org_id(label),
        target_org:connected_orgs!target_org_id(label)
      )
    `, { count: "exact" })
    .in("sync_config_id", syncIds)
    .order("started_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs, total: count ?? 0 });
}
