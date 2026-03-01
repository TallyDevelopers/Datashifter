import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/logs/[logId]/errors/[errorId]/retry
 * Retries a single record error. Updates retry_count and retried_at.
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

  // Ownership check
  const { data: log } = await supabase
    .from("sync_logs")
    .select("id, sync_config:sync_configs!inner(customer_id)")
    .eq("id", logId)
    .single();

  const syncConfig = (log?.sync_config as unknown as { customer_id: string } | null);
  if (!log || !syncConfig || syncConfig.customer_id !== customer.id) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  const { data: errorRecord } = await supabase
    .from("sync_record_errors")
    .select("id, retry_count, resolved")
    .eq("id", errorId)
    .eq("sync_log_id", logId)
    .single();

  if (!errorRecord) return NextResponse.json({ error: "Error record not found" }, { status: 404 });
  if (errorRecord.resolved) return NextResponse.json({ error: "This record has already been resolved" }, { status: 400 });

  await supabase
    .from("sync_record_errors")
    .update({
      retry_count: (errorRecord.retry_count ?? 0) + 1,
      retried_at: new Date().toISOString(),
    })
    .eq("id", errorId);

  return NextResponse.json({ queued: 1, message: "Record queued for retry" });
}
