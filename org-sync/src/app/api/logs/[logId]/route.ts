import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/logs/[logId]
 * Returns full detail for a single sync log including all record errors.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  const { logId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const { data: log, error } = await supabase
    .from("sync_logs")
    .select(`
      id, status, records_processed, records_succeeded, records_failed,
      error_details, started_at, completed_at,
      sync_config:sync_configs!inner(
        id, name, source_object, target_object, customer_id,
        source_org:connected_orgs!source_org_id(id, label, instance_url),
        target_org:connected_orgs!target_org_id(id, label, instance_url)
      )
    `)
    .eq("id", logId)
    .single();

  if (error || !log) return NextResponse.json({ error: "Log not found" }, { status: 404 });

  // Ownership check
  const syncConfig = log.sync_config as unknown as { customer_id: string } | null;
  if (!syncConfig || syncConfig.customer_id !== customer.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: errors } = await supabase
    .from("sync_record_errors")
    .select("id, source_record_id, error_message, error_code, retry_count, retried_at, resolved")
    .eq("sync_log_id", logId)
    .order("resolved", { ascending: true })
    .order("retry_count", { ascending: false });

  return NextResponse.json({ log, errors: errors ?? [] });
}
