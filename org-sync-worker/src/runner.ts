import { createClient } from "@supabase/supabase-js";
import { queryRecords, upsertRecords } from "./salesforce.js";
import { createSyncLog, finalizeSyncLog, writeRecordErrors } from "./logger.js";
import type { SyncConfig, SyncFilter, SalesforceRecord, RunResult, RecordMapping } from "./types.js";

function db() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Determines the "since" date for querying — the last successful completed_at,
 * or 24 hours ago if no prior successful run exists.
 */
async function getLastRunDate(syncConfigId: string): Promise<Date> {
  const { data } = await db()
    .from("sync_logs")
    .select("completed_at")
    .eq("sync_config_id", syncConfigId)
    .eq("status", "success")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  if (data?.completed_at) return new Date(data.completed_at as string);
  // First run — go back 24 hours
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

/**
 * Evaluates a single filter condition against a record.
 */
function evaluateFilter(record: SalesforceRecord, filter: SyncFilter): boolean {
  const value = record[filter.field];
  const fv = filter.value;

  switch (filter.operator) {
    case "equals": return String(value) === fv;
    case "not_equals": return String(value) !== fv;
    case "contains": return String(value ?? "").includes(fv);
    case "not_contains": return !String(value ?? "").includes(fv);
    case "greater_than": return Number(value) > Number(fv);
    case "less_than": return Number(value) < Number(fv);
    case "is_null": return value === null || value === undefined;
    case "is_not_null": return value !== null && value !== undefined;
    default: return true;
  }
}

/**
 * Maps a source record's fields to a target record payload using field_mappings.
 * Strips null/undefined values for cleanliness.
 */
function mapRecord(
  sourceRecord: SalesforceRecord,
  fieldMappings: Array<{ sourceField: string; targetField: string }>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const mapping of fieldMappings) {
    const val = sourceRecord[mapping.sourceField];
    if (val !== undefined) {
      payload[mapping.targetField] = val;
    }
  }
  return payload;
}

/**
 * Loads existing record mappings for a batch of source IDs.
 * Returns a Map of sourceRecordId → targetRecordId.
 */
async function loadRecordMappings(
  syncConfigId: string,
  sourceOrgId: string,
  sourceRecordIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (sourceRecordIds.length === 0) return map;

  const { data } = await db()
    .from("sync_record_mappings")
    .select("source_record_id, target_record_id")
    .eq("sync_config_id", syncConfigId)
    .eq("source_org_id", sourceOrgId)
    .in("source_record_id", sourceRecordIds);

  for (const row of data ?? []) {
    const r = row as RecordMapping;
    map.set(r.source_record_id, r.target_record_id);
  }
  return map;
}

/**
 * Persists new source→target ID mappings after a successful insert.
 */
async function saveRecordMappings(
  syncConfigId: string,
  sourceOrgId: string,
  targetOrgId: string,
  pairs: Array<{ sourceId: string; targetId: string }>
): Promise<void> {
  if (pairs.length === 0) return;

  const rows = pairs.map((p) => ({
    sync_config_id: syncConfigId,
    source_org_id: sourceOrgId,
    source_record_id: p.sourceId,
    target_org_id: targetOrgId,
    target_record_id: p.targetId,
  }));

  await db()
    .from("sync_record_mappings")
    .upsert(rows, { onConflict: "sync_config_id,source_org_id,source_record_id" });
}

/**
 * Runs one full sync cycle for a single SyncConfig.
 * Returns a RunResult with counts and errors.
 */
export async function runSyncConfig(config: SyncConfig): Promise<RunResult> {
  const result: RunResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };
  const logId = await createSyncLog(config.id);

  try {
    console.log(`[runner] Starting sync: "${config.name}" (${config.id})`);

    const sinceDate = await getLastRunDate(config.id);
    console.log(`[runner] Querying records modified since ${sinceDate.toISOString()}`);

    // Extract the source fields we need from the field mappings
    const sourceFields = config.field_mappings
      .map((m) => m.source_field)
      .filter((f) => f && f.trim() !== "");

    if (sourceFields.length === 0) {
      console.log(`[runner] No field mappings defined — skipping sync "${config.name}". Add field mappings in the portal to activate this sync.`);
      await finalizeSyncLog(logId, result);
      return result;
    }

    // Query source org for changed records
    const sourceRecords = await queryRecords(
      config.source_org,
      config.source_object,
      sourceFields,
      sinceDate
    );

    console.log(`[runner] Found ${sourceRecords.length} records in source org`);

    if (sourceRecords.length === 0) {
      await finalizeSyncLog(logId, result);
      return result;
    }

    // Apply filters
    const filtered = config.filters.length > 0
      ? sourceRecords.filter((rec) => config.filters.every((f) => evaluateFilter(rec, f)))
      : sourceRecords;

    console.log(`[runner] ${filtered.length} records passed filters (${sourceRecords.length - filtered.length} filtered out)`);

    result.processed = filtered.length;

    if (filtered.length === 0) {
      await finalizeSyncLog(logId, result);
      return result;
    }

    // Load existing mappings to know which records to update vs insert
    const sourceIds = filtered.map((r) => r.Id as string).filter(Boolean);
    const existingMappings = await loadRecordMappings(config.id, config.source_org_id, sourceIds);

    // Build upsert payloads
    const upsertBatch = filtered.map((rec) => ({
      sourceRecordId: rec.Id as string,
      existingTargetId: existingMappings.get(rec.Id as string),
      payload: mapRecord(rec, config.field_mappings.map((m) => ({ sourceField: m.source_field, targetField: m.target_field }))),
    }));

    // Push to target org
    const upsertResults = await upsertRecords(
      config.target_org,
      config.target_object,
      upsertBatch
    );

    // Process results
    const newMappings: Array<{ sourceId: string; targetId: string }> = [];

    for (const res of upsertResults) {
      if (res.success && res.targetRecordId) {
        result.succeeded++;
        // Save new mappings (skips ones that already existed — upsert handles it)
        if (!existingMappings.has(res.sourceRecordId)) {
          newMappings.push({ sourceId: res.sourceRecordId, targetId: res.targetRecordId });
        }
      } else {
        result.failed++;
        result.errors.push({
          sourceRecordId: res.sourceRecordId,
          errorMessage: res.errorMessage ?? "Unknown error",
          errorCode: res.errorCode ?? "UNKNOWN",
        });
      }
    }

    // Persist new record mappings
    await saveRecordMappings(config.id, config.source_org_id, config.target_org_id, newMappings);
    console.log(`[runner] Sync complete — ${result.succeeded} succeeded, ${result.failed} failed`);

    // Handle bidirectional: swap source/target and run again
    if (config.direction === "bidirectional") {
      console.log(`[runner] Running reverse direction for bidirectional sync "${config.name}"`);
      const reverseSourceRecords = await queryRecords(
        config.target_org,
        config.target_object,
        config.field_mappings.map((m) => m.target_field).filter(Boolean),
        sinceDate
      );

      const reverseFiltered = reverseSourceRecords.filter((rec) =>
        config.filters.every((f) => evaluateFilter(rec, f))
      );

      result.processed += reverseFiltered.length;

      const reverseIds = reverseFiltered.map((r) => r.Id as string).filter(Boolean);
      const reverseMappings = await loadRecordMappings(config.id, config.target_org_id, reverseIds);

      const reverseBatch = reverseFiltered.map((rec) => ({
        sourceRecordId: rec.Id as string,
        existingTargetId: reverseMappings.get(rec.Id as string),
        payload: mapRecord(rec, config.field_mappings.map((m) => ({ sourceField: m.target_field, targetField: m.source_field }))),
      }));

      const reverseResults = await upsertRecords(config.source_org, config.source_object, reverseBatch);
      const reverseNewMappings: Array<{ sourceId: string; targetId: string }> = [];

      for (const res of reverseResults) {
        if (res.success && res.targetRecordId) {
          result.succeeded++;
          if (!reverseMappings.has(res.sourceRecordId)) {
            reverseNewMappings.push({ sourceId: res.sourceRecordId, targetId: res.targetRecordId });
          }
        } else {
          result.failed++;
          result.errors.push({
            sourceRecordId: res.sourceRecordId,
            errorMessage: res.errorMessage ?? "Unknown error",
            errorCode: res.errorCode ?? "UNKNOWN",
          });
        }
      }

      await saveRecordMappings(config.id, config.target_org_id, config.source_org_id, reverseNewMappings);
    }

    await writeRecordErrors(logId, result.errors);
    await finalizeSyncLog(logId, result);
    return result;

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[runner] Fatal error in sync "${config.name}": ${message}`);
    result.errors.push({ sourceRecordId: "N/A", errorMessage: message, errorCode: "FATAL" });
    await finalizeSyncLog(logId, result, { fatalError: message });
    return result;
  }
}

/**
 * Fetches all active sync configs with their source and target org details.
 */
export async function fetchActiveSyncConfigs(): Promise<SyncConfig[]> {
  const { data, error } = await db()
    .from("sync_configs")
    .select(`
      *,
      source_org:connected_orgs!source_org_id(*),
      target_org:connected_orgs!target_org_id(*)
    `)
    .eq("is_active", true);

  if (error) throw new Error(`Failed to fetch sync configs: ${error.message}`);
  return (data ?? []) as unknown as SyncConfig[];
}
