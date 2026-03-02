import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeRetry, getSyncConfigForRetry } from "@/lib/retry/engine";

/**
 * POST /api/logs/[logId]/errors/[errorId]/retry
 * Retries a single failed record — actually re-executes the Salesforce upsert.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ logId: string; errorId: string }> }
) {
  const { logId, errorId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // Verify ownership via sync_config
  const { data: log } = await supabase
    .from("sync_logs")
    .select("id, sync_config_id, sync_config:sync_configs!inner(customer_id)")
    .eq("id", logId)
    .single();

  const syncConfig = log?.sync_config as unknown as { customer_id: string } | null;
  if (!log || !syncConfig || syncConfig.customer_id !== customer.id) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  // Verify the error exists and belongs to this log
  const { data: errorRecord, error: errorFetchErr } = await supabase
    .from("sync_record_errors")
    .select("id, resolved, retry_count")
    .eq("id", errorId)
    .eq("sync_log_id", logId)
    .single();

  if (errorFetchErr || !errorRecord) {
    return NextResponse.json({ error: "Error record not found" }, { status: 404 });
  }
  if (errorRecord.resolved) {
    return NextResponse.json({ error: "This record has already been resolved" }, { status: 400 });
  }

  const config = await getSyncConfigForRetry(log.sync_config_id as string, customer.id);
  if (!config) return NextResponse.json({ error: "Sync config not found" }, { status: 404 });

  const result = await executeRetry(config, [errorId]);

  if (result.resolved > 0) {
    return NextResponse.json({ success: true, message: "Record successfully synced", ...result });
  }

  if (result.abandoned > 0) {
    return NextResponse.json({
      success: false,
      message: "Record abandoned — max retries reached. Fix the underlying issue before retrying again.",
      ...result,
    }, { status: 422 });
  }

  return NextResponse.json({
    success: false,
    message: "Retry failed — Salesforce rejected the record again. Check the error details.",
    ...result,
  }, { status: 422 });
}
