import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/logs/[logId]/retry
 * Bulk-retries all unresolved errors for a sync log.
 * In the current implementation this marks them as queued for retry
 * and updates retry_count. The actual re-execution happens in the sync engine (Phase 9).
 * For now it returns a "queued" response so the UI can show feedback.
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

  // Verify ownership via sync_config
  const { data: log } = await supabase
    .from("sync_logs")
    .select("id, sync_config:sync_configs!inner(customer_id)")
    .eq("id", logId)
    .single();

  const syncConfig = (log?.sync_config as unknown as { customer_id: string } | null);
  if (!log || !syncConfig || syncConfig.customer_id !== customer.id) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  const { data: errors, error: fetchError } = await supabase
    .from("sync_record_errors")
    .select("id, retry_count")
    .eq("sync_log_id", logId)
    .eq("resolved", false);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!errors || errors.length === 0) {
    return NextResponse.json({ message: "No unresolved errors to retry", queued: 0 });
  }

  // Increment retry counts and record the retry timestamp
  const now = new Date().toISOString();
  await supabase
    .from("sync_record_errors")
    .update({ retry_count: (errors[0]?.retry_count ?? 0) + 1, retried_at: now })
    .eq("sync_log_id", logId)
    .eq("resolved", false);

  return NextResponse.json({ queued: errors.length, message: `${errors.length} record${errors.length !== 1 ? "s" : ""} queued for retry` });
}
