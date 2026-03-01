import { createClient } from "@supabase/supabase-js";
import type { RunResult } from "./types.js";

function db() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Creates a new sync_log row and returns its ID.
 * Call this at the START of a sync run.
 */
export async function createSyncLog(syncConfigId: string): Promise<string> {
  const { data, error } = await db()
    .from("sync_logs")
    .insert({
      sync_config_id: syncConfigId,
      status: "running",
      records_processed: 0,
      records_succeeded: 0,
      records_failed: 0,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Failed to create sync log: ${error?.message}`);
  return data.id as string;
}

/**
 * Finalizes a sync_log row with results.
 * Call this at the END of a sync run.
 */
export async function finalizeSyncLog(
  logId: string,
  result: RunResult,
  errorDetails?: Record<string, unknown>
): Promise<void> {
  const status =
    result.failed === 0
      ? "success"
      : result.succeeded === 0
      ? "failed"
      : "partial";

  await db()
    .from("sync_logs")
    .update({
      status,
      records_processed: result.processed,
      records_succeeded: result.succeeded,
      records_failed: result.failed,
      error_details: errorDetails ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", logId);
}

/**
 * Writes individual record errors to sync_record_errors.
 */
export async function writeRecordErrors(
  logId: string,
  errors: RunResult["errors"]
): Promise<void> {
  if (errors.length === 0) return;

  await db().from("sync_record_errors").insert(
    errors.map((e) => ({
      sync_log_id: logId,
      source_record_id: e.sourceRecordId,
      error_message: e.errorMessage,
      error_code: e.errorCode,
    }))
  );
}
