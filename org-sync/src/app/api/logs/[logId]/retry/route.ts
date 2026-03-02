import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeRetry, getSyncConfigForRetry } from "@/lib/retry/engine";

/**
 * POST /api/logs/[logId]/retry
 * Bulk-retries all unresolved errors for a sync log.
 * Actually re-executes the Salesforce upsert for each failed record.
 */
export async function POST(
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

  // Verify log ownership and get the sync_config_id
  const { data: log } = await supabase
    .from("sync_logs")
    .select("id, sync_config_id, sync_config:sync_configs!inner(customer_id)")
    .eq("id", logId)
    .single();

  const syncConfig = log?.sync_config as unknown as { customer_id: string } | null;
  if (!log || !syncConfig || syncConfig.customer_id !== customer.id) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  // Fetch all unresolved errors for this log
  const { data: errors } = await supabase
    .from("sync_record_errors")
    .select("id")
    .eq("sync_log_id", logId)
    .eq("resolved", false);

  if (!errors || errors.length === 0) {
    return NextResponse.json({ message: "No unresolved errors to retry", attempted: 0 });
  }

  // Load the full sync config (with decryptable tokens)
  const config = await getSyncConfigForRetry(
    log.sync_config_id as string,
    customer.id
  );
  if (!config) return NextResponse.json({ error: "Sync config not found" }, { status: 404 });

  const errorIds = errors.map((e) => (e as { id: string }).id);
  const result = await executeRetry(config, errorIds);

  return NextResponse.json({
    message: `Retry complete — ${result.resolved} resolved, ${result.still_failing} still failing${result.abandoned > 0 ? `, ${result.abandoned} abandoned` : ""}`,
    ...result,
  });
}
