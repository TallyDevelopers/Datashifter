/**
 * Retry Engine — executes real Salesforce upserts for failed records.
 *
 * This is the actual retry logic. It:
 * 1. Fetches the failed record IDs from sync_record_errors
 * 2. Re-queries those specific records from the SOURCE Salesforce org by ID
 * 3. Re-attempts the upsert to the TARGET org
 * 4. Marks each error as resolved (or increments retry_count on failure)
 * 5. Creates a new sync_log row for the retry run so customers have full audit trail
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/salesforce/crypto";

const SF_API_VERSION = "v59.0";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConnectedOrg {
  id: string;
  instance_url: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string | null;
  label: string;
  is_sandbox: boolean;
}

interface FieldMapping {
  source_field: string;
  target_field: string;
}

interface SyncConfig {
  id: string;
  customer_id: string;
  source_object: string;
  target_object: string;
  field_mappings: FieldMapping[];
  max_retries: number;
  source_org: ConnectedOrg;
  target_org: ConnectedOrg;
}

interface FailedError {
  id: string;
  source_record_id: string;
  retry_count: number;
  direction: string;
  sync_config_id: string;
}

export interface RetryResult {
  attempted: number;
  resolved: number;
  still_failing: number;
  abandoned: number;
  log_id: string | null;
}

// ─── Salesforce helpers (duplicated here to avoid worker/app coupling) ────────

async function getAccessToken(org: ConnectedOrg): Promise<{ token: string; instanceUrl: string }> {
  const accessToken = decrypt(org.access_token);

  const isExpired = org.token_expires_at
    ? new Date(org.token_expires_at).getTime() - Date.now() < 5 * 60 * 1000
    : false;

  if (!isExpired) return { token: accessToken, instanceUrl: org.instance_url };

  const loginUrl = org.is_sandbox ? "https://test.salesforce.com" : "https://login.salesforce.com";
  const refreshToken = decrypt(org.refresh_token);

  const res = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.SALESFORCE_CLIENT_ID ?? "",
      client_secret: process.env.SALESFORCE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!res.ok) throw new Error(`Token refresh failed for org ${org.label}`);
  const data = await res.json() as { access_token: string; instance_url: string };
  return { token: data.access_token, instanceUrl: data.instance_url };
}

async function fetchRecordsByIds(
  org: ConnectedOrg,
  sobjectType: string,
  fields: string[],
  ids: string[]
): Promise<Array<Record<string, unknown>>> {
  const { token, instanceUrl } = await getAccessToken(org);
  const fieldList = Array.from(new Set(["Id", ...fields])).join(", ");
  const idList = ids.map((id) => `'${id}'`).join(", ");
  const soql = `SELECT ${fieldList} FROM ${sobjectType} WHERE Id IN (${idList})`;

  const res = await fetch(
    `${instanceUrl}/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(soql)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) throw new Error(`Salesforce query failed: ${await res.text()}`);
  const data = await res.json() as { records: Array<Record<string, unknown>> };
  return data.records ?? [];
}

async function upsertToTarget(
  org: ConnectedOrg,
  sobjectType: string,
  records: Array<{ sourceId: string; existingTargetId?: string; payload: Record<string, unknown> }>
): Promise<Array<{ sourceId: string; targetId: string | null; success: boolean; errorMessage?: string; errorCode?: string }>> {
  const { token, instanceUrl } = await getAccessToken(org);
  const results: Array<{ sourceId: string; targetId: string | null; success: boolean; errorMessage?: string; errorCode?: string }> = [];
  const BATCH = 25;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);

    const subrequests = batch.map((rec, idx) =>
      rec.existingTargetId
        ? { method: "PATCH", url: `/services/data/${SF_API_VERSION}/sobjects/${sobjectType}/${rec.existingTargetId}`, referenceId: `r${idx}`, body: rec.payload }
        : { method: "POST", url: `/services/data/${SF_API_VERSION}/sobjects/${sobjectType}`, referenceId: `r${idx}`, body: rec.payload }
    );

    const res = await fetch(`${instanceUrl}/services/data/${SF_API_VERSION}/composite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ allOrNone: false, compositeRequest: subrequests }),
    });

    if (!res.ok) {
      const err = await res.text();
      for (const rec of batch) results.push({ sourceId: rec.sourceId, targetId: null, success: false, errorMessage: err, errorCode: "COMPOSITE_FAILED" });
      continue;
    }

    const composite = await res.json() as { compositeResponse: Array<{ body: unknown; httpStatusCode: number }> };
    for (let j = 0; j < batch.length; j++) {
      const sub = composite.compositeResponse[j];
      const rec = batch[j];
      if ([200, 201, 204].includes(sub.httpStatusCode)) {
        const body = sub.body as { id?: string } | null;
        results.push({ sourceId: rec.sourceId, targetId: rec.existingTargetId ?? body?.id ?? null, success: true });
      } else {
        const errs = sub.body as Array<{ message: string; errorCode: string }> | null;
        results.push({
          sourceId: rec.sourceId,
          targetId: null,
          success: false,
          errorMessage: Array.isArray(errs) && errs[0] ? errs[0].message : JSON.stringify(sub.body),
          errorCode: Array.isArray(errs) && errs[0] ? errs[0].errorCode : "UNKNOWN",
        });
      }
    }
  }

  return results;
}

// ─── Main retry function ──────────────────────────────────────────────────────

/**
 * Executes a real retry for a list of failed record error IDs.
 * Re-fetches the records from Salesforce and re-attempts the upsert.
 */
export async function executeRetry(
  syncConfig: SyncConfig,
  errorIds: string[]
): Promise<RetryResult> {
  const db = createAdminClient();
  const result: RetryResult = { attempted: 0, resolved: 0, still_failing: 0, abandoned: 0, log_id: null };

  // 1. Fetch the error records
  // Note: direction column only exists after migration 004. Default to "forward" if missing.
  const { data: errors, error: fetchErr } = await db
    .from("sync_record_errors")
    .select("id, source_record_id, retry_count")
    .in("id", errorIds)
    .eq("resolved", false);

  if (fetchErr) throw new Error(`Failed to fetch error records: ${fetchErr.message}`);
  if (!errors || errors.length === 0) return result;

  const typedErrors = (errors as Array<{ id: string; source_record_id: string; retry_count: number }>).map((e) => ({
    ...e,
    direction: "forward", // default — migration 004 adds the direction column
    sync_config_id: syncConfig.id,
  })) as FailedError[];
  result.attempted = typedErrors.length;

  // 2. Create a retry log row for audit trail
  const { data: logRow } = await db
    .from("sync_logs")
    .insert({
      sync_config_id: syncConfig.id,
      status: "running",
      records_processed: typedErrors.length,
      records_succeeded: 0,
      records_failed: 0,
    })
    .select("id")
    .single();

  result.log_id = logRow?.id ?? null;

  // 3. Separate forward vs reverse direction errors
  const forwardErrors = typedErrors.filter((e) => e.direction === "forward");
  const reverseErrors = typedErrors.filter((e) => e.direction === "reverse");

  const newMappings: Array<{ sync_config_id: string; source_org_id: string; source_record_id: string; target_org_id: string; target_record_id: string }> = [];
  const retryLogErrors: Array<{ sync_log_id: string; source_record_id: string; error_message: string; error_code: string; retry_count: number }> = [];

  async function processDirection(
    dirErrors: FailedError[],
    sourceOrg: ConnectedOrg,
    targetOrg: ConnectedOrg,
    direction: "forward" | "reverse",
    sourceFields: string[],
    targetFields: string[],
    sobjectType: string,
    targetSobjectType: string
  ) {
    if (dirErrors.length === 0) return;

    const sourceIds = dirErrors.map((e) => e.source_record_id);

    // Re-query source org for these specific records
    let sourceRecords: Array<Record<string, unknown>> = [];
    try {
      sourceRecords = await fetchRecordsByIds(sourceOrg, sobjectType, sourceFields, sourceIds);
    } catch (err) {
      // Org unreachable — mark all as still failing
      if (logRow?.id) {
        for (const e of dirErrors) {
          retryLogErrors.push({
            sync_log_id: logRow.id,
            source_record_id: e.source_record_id,
            error_message: err instanceof Error ? err.message : "Source org unreachable",
            error_code: "ORG_UNREACHABLE",
            retry_count: (e.retry_count ?? 0) + 1,
          });
          result.still_failing++;
        }
      }
      return;
    }

    // Map source records by ID for quick lookup
    const recordMap = new Map<string, Record<string, unknown>>(
      sourceRecords.map((r) => [r.Id as string, r])
    );

    // Load existing target mappings
    const { data: existingMappings } = await db
      .from("sync_record_mappings")
      .select("source_record_id, target_record_id")
      .eq("sync_config_id", syncConfig.id)
      .eq("source_org_id", sourceOrg.id)
      .in("source_record_id", sourceIds);

    const mappingMap = new Map<string, string>(
      (existingMappings ?? []).map((m) => [
        (m as { source_record_id: string; target_record_id: string }).source_record_id,
        (m as { source_record_id: string; target_record_id: string }).target_record_id,
      ])
    );

    // Build upsert batch — only for records we could re-fetch
    const upsertBatch = dirErrors
      .filter((e) => recordMap.has(e.source_record_id))
      .map((e) => {
        const rec = recordMap.get(e.source_record_id)!;
        const payload: Record<string, unknown> = {};
        const mappings = direction === "forward"
          ? syncConfig.field_mappings.map((m) => ({ from: m.source_field, to: m.target_field }))
          : syncConfig.field_mappings.map((m) => ({ from: m.target_field, to: m.source_field }));

        for (const m of mappings) {
          if (rec[m.from] !== undefined) payload[m.to] = rec[m.from];
        }

        return { sourceId: e.source_record_id, existingTargetId: mappingMap.get(e.source_record_id), payload };
      });

    // Records not found in source (deleted?) — mark abandoned
    const notFoundIds = dirErrors
      .filter((e) => !recordMap.has(e.source_record_id))
      .map((e) => e.id);

    if (notFoundIds.length > 0) {
      await db
        .from("sync_record_errors")
        .update({ resolved: true, retry_count: 0 })
        .in("id", notFoundIds);
      result.abandoned += notFoundIds.length;
    }

    if (upsertBatch.length === 0) return;

    // Execute upsert
    const upsertResults = await upsertToTarget(targetOrg, targetSobjectType, upsertBatch);

    for (const r of upsertResults) {
      const errorRow = dirErrors.find((e) => e.source_record_id === r.sourceId);
      if (!errorRow) continue;

      if (r.success) {
        // Mark the original error record as resolved
        await db
          .from("sync_record_errors")
          .update({ resolved: true, retry_count: (errorRow.retry_count ?? 0) + 1, retried_at: new Date().toISOString() })
          .eq("id", errorRow.id);

        result.resolved++;

        // Save new mapping if it was a create
        if (r.targetId && !mappingMap.has(r.sourceId)) {
          newMappings.push({
            sync_config_id: syncConfig.id,
            source_org_id: sourceOrg.id,
            source_record_id: r.sourceId,
            target_org_id: targetOrg.id,
            target_record_id: r.targetId,
          });
        }
      } else {
        const newRetryCount = (errorRow.retry_count ?? 0) + 1;
        const isAbandoned = newRetryCount >= syncConfig.max_retries;

        await db
          .from("sync_record_errors")
          .update({
            retry_count: newRetryCount,
            retried_at: new Date().toISOString(),
            resolved: isAbandoned,
            error_message: r.errorMessage ?? errorRow.source_record_id,
            error_code: r.errorCode ?? "UNKNOWN",
          })
          .eq("id", errorRow.id);

        if (isAbandoned) {
          result.abandoned++;
        } else {
          result.still_failing++;
        }

        if (logRow?.id) {
          retryLogErrors.push({
            sync_log_id: logRow.id,
            source_record_id: r.sourceId,
            error_message: r.errorMessage ?? "Unknown error",
            error_code: r.errorCode ?? "UNKNOWN",
            retry_count: newRetryCount,
          });
        }
      }
    }
  }

  // Source fields for forward/reverse
  const forwardSourceFields = syncConfig.field_mappings.map((m) => m.source_field).filter(Boolean);
  const reverseSourceFields = syncConfig.field_mappings.map((m) => m.target_field).filter(Boolean);

  await processDirection(
    forwardErrors,
    syncConfig.source_org,
    syncConfig.target_org,
    "forward",
    forwardSourceFields,
    reverseSourceFields,
    syncConfig.source_object,
    syncConfig.target_object
  );

  await processDirection(
    reverseErrors,
    syncConfig.target_org,
    syncConfig.source_org,
    "reverse",
    reverseSourceFields,
    forwardSourceFields,
    syncConfig.target_object,
    syncConfig.source_object
  );

  // 4. Save new record mappings
  if (newMappings.length > 0) {
    await db
      .from("sync_record_mappings")
      .upsert(newMappings, { onConflict: "sync_config_id,source_org_id,source_record_id" });
  }

  // 5. Write retry log errors
  if (retryLogErrors.length > 0 && logRow?.id) {
    await db.from("sync_record_errors").insert(retryLogErrors);
  }

  // 6. Finalize the retry log
  if (logRow?.id) {
    await db
      .from("sync_logs")
      .update({
        status: result.still_failing + result.abandoned > 0 ? (result.resolved > 0 ? "partial" : "failed") : "success",
        records_processed: result.attempted,
        records_succeeded: result.resolved,
        records_failed: result.still_failing + result.abandoned,
        completed_at: new Date().toISOString(),
      })
      .eq("id", logRow.id);
  }

  // 7. Update the ORIGINAL log's counts and status to reflect resolved retries.
  //    This ensures the success rate on the dashboard stays accurate —
  //    records that were retried and resolved count as succeeded, not failed.
  if (result.resolved > 0 && errorIds.length > 0) {
    // Find the original log ID — all errorIds come from the same log
    const { data: originalLogCheck } = await db
      .from("sync_record_errors")
      .select("sync_log_id")
      .in("id", errorIds)
      .limit(1);

    const originalLogId = originalLogCheck?.[0]?.sync_log_id as string | null;

    if (originalLogId) {
      // Fetch the current log counts so we can adjust them
      const { data: originalLog } = await db
        .from("sync_logs")
        .select("records_succeeded, records_failed")
        .eq("id", originalLogId)
        .single();

      if (originalLog) {
        const newSucceeded = (originalLog.records_succeeded ?? 0) + result.resolved;
        const newFailed = Math.max(0, (originalLog.records_failed ?? 0) - result.resolved);

        // Count remaining unresolved errors to determine the correct status
        const { count: remainingUnresolved } = await db
          .from("sync_record_errors")
          .select("id", { count: "exact", head: true })
          .eq("sync_log_id", originalLogId)
          .eq("resolved", false);

        const newStatus = (remainingUnresolved ?? 0) === 0
          ? "success"
          : result.resolved > 0
          ? "partial"
          : "failed";

        await db
          .from("sync_logs")
          .update({
            records_succeeded: newSucceeded,
            records_failed: newFailed,
            status: newStatus,
          })
          .eq("id", originalLogId);
      }
    }
  }

  return result;
}

/**
 * Fetches the full sync config needed for retry execution.
 * Validates ownership against the given customer_id.
 */
export async function getSyncConfigForRetry(
  syncConfigId: string,
  customerId: string
): Promise<SyncConfig | null> {
  const db = createAdminClient();

  const { data } = await db
    .from("sync_configs")
    .select(`
      id, customer_id, source_object, target_object, field_mappings,
      source_org:connected_orgs!source_org_id(id, instance_url, access_token, refresh_token, token_expires_at, label, is_sandbox),
      target_org:connected_orgs!target_org_id(id, instance_url, access_token, refresh_token, token_expires_at, label, is_sandbox)
    `)
    .eq("id", syncConfigId)
    .eq("customer_id", customerId)
    .single();

  if (!data) return null;
  // max_retries added in migration 004 — default to 3 if column doesn't exist yet
  return { ...data, max_retries: (data as unknown as { max_retries?: number }).max_retries ?? 3 } as unknown as SyncConfig;
}
