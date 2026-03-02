import { createClient } from "@supabase/supabase-js";
import { queryRecords, upsertRecords } from "./salesforce.js";
import { createSyncLog, finalizeSyncLog, writeRecordErrors } from "./logger.js";
import type { SyncConfig, SyncFilter, SalesforceRecord, RunResult, RecordMapping, OwnerConfig, OwnerUser } from "./types.js";

// ─── Round-robin counters (per sync config + direction, in-memory) ────────────
// Key: `${syncConfigId}:forward` or `${syncConfigId}:reverse`
const rrCounters = new Map<string, number>();

/**
 * Resolves the OwnerId that should be set on a record for this cycle index.
 * Returns null if no owner override should be applied (passthrough).
 */
function resolveOwnerId(
  config: OwnerConfig | null,
  direction: "forward" | "reverse",
  recordIndex: number
): string | null {
  if (!config) return null;

  const strategy = direction === "forward" ? config.strategy : (config.reverse_strategy ?? config.strategy);
  const users: OwnerUser[] = direction === "forward"
    ? config.target_users
    : (config.reverse_users ?? config.target_users);

  if (!users || users.length === 0) return null;
  if (strategy === "passthrough") return null;
  if (strategy === "fixed") return users[0].id;

  // round_robin — use recordIndex mod users.length
  return users[recordIndex % users.length].id;
}

function db() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Determines the "since" date for querying.
 *
 * On every run (including the very first one) we look back exactly one
 * intervalMs window.  This means:
 *
 *   - First-ever run for a new sync config → only records modified in the last
 *     2 minutes (or whatever the interval is).  No historical blast.
 *   - Subsequent runs → the completed_at of the last finished run, which is
 *     always approximately one interval ago.  We keep this so that if the
 *     worker restarts mid-cycle we don't skip records that landed between the
 *     last completed_at and now.
 *
 * We intentionally accept ANY terminal status (success, partial, failed) so
 * that a failed or partial run doesn't reset the window to the beginning.
 */
async function getLastRunDate(syncConfigId: string, intervalMs: number): Promise<Date> {
  const { data } = await db()
    .from("sync_logs")
    .select("completed_at")
    .eq("sync_config_id", syncConfigId)
    .in("status", ["success", "partial", "failed"])
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  if (data?.completed_at) return new Date(data.completed_at as string);

  // No prior run — use exactly one interval window so we only pick up records
  // that arrived since the last time the worker *would* have run.
  return new Date(Date.now() - intervalMs);
}

/**
 * Evaluates a single filter condition against a record.
 *
 * Operator strings must match exactly what the UI stores — see FILTER_OPERATORS
 * in the portal's syncs/new/page.tsx.  Both the symbol form ("=", "!=", ">", …)
 * and the legacy word form ("equals", "not_equals", …) are handled so that
 * existing configs keep working after an upgrade.
 */
function evaluateFilter(record: SalesforceRecord, filter: SyncFilter): boolean {
  const value = record[filter.field];
  const fv    = filter.value ?? "";
  const sv    = value === null || value === undefined ? "" : String(value);

  switch (filter.operator) {
    // ── symbol operators (current UI) ──────────────────────────────────────
    case "=":            return sv === fv;
    case "!=":           return sv !== fv;
    case ">":            return Number(value) > Number(fv);
    case "<":            return Number(value) < Number(fv);
    case ">=":           return Number(value) >= Number(fv);
    case "<=":           return Number(value) <= Number(fv);
    case "contains":     return sv.toLowerCase().includes(fv.toLowerCase());
    case "starts with":  return sv.toLowerCase().startsWith(fv.toLowerCase());
    case "is empty":     return sv === "" || value === null || value === undefined;
    case "is not empty": return sv !== "" && value !== null && value !== undefined;

    // ── word operators (legacy / backward-compat) ──────────────────────────
    case "equals":       return sv === fv;
    case "not_equals":   return sv !== fv;
    case "contains_legacy": // intentional fall-through to "contains"
    case "not_contains": return !sv.toLowerCase().includes(fv.toLowerCase());
    case "greater_than": return Number(value) > Number(fv);
    case "less_than":    return Number(value) < Number(fv);
    case "is_null":      return value === null || value === undefined;
    case "is_not_null":  return value !== null && value !== undefined;

    // ── unknown operator → pass through (never silently drop records) ──────
    default:
      console.warn(`[runner] Unknown filter operator "${filter.operator}" — skipping filter, record passes`);
      return true;
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
 *
 * @param intervalMs - the scheduler's poll interval in ms.  Used as the
 *   lookback window on the very first run so we never blast historical records.
 */
export async function runSyncConfig(config: SyncConfig, intervalMs: number): Promise<RunResult> {
  const result: RunResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };
  const logId = await createSyncLog(config.id);

  try {
    console.log(`[runner] Starting sync: "${config.name}" (${config.id})`);

    const sinceDate = await getLastRunDate(config.id, intervalMs);
    console.log(`[runner] Querying records modified since ${sinceDate.toISOString()} (window: ${intervalMs / 1000}s)`);

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

    // Build upsert payloads — inject OwnerId from owner_config on inserts
    const upsertBatch = filtered.map((rec, idx) => {
      const existingTargetId = existingMappings.get(rec.Id as string);
      const payload = mapRecord(rec, config.field_mappings.map((m) => ({ sourceField: m.source_field, targetField: m.target_field })));

      // Only override OwnerId on new inserts (not updates — don't change existing record owners)
      if (!existingTargetId) {
        const ownerId = resolveOwnerId(config.owner_config, "forward", idx);
        if (ownerId) {
          payload["OwnerId"] = ownerId;
        }
      }

      return { sourceRecordId: rec.Id as string, existingTargetId, payload };
    });

    // Push to target org
    const upsertResults = await upsertRecords(
      config.target_org,
      config.target_object,
      upsertBatch
    );

    // Process results — track forward errors separately for direction tagging
    const newMappings: Array<{ sourceId: string; targetId: string }> = [];
    const forwardErrors: RunResult["errors"] = [];

    for (const res of upsertResults) {
      if (res.success && res.targetRecordId) {
        result.succeeded++;
        if (!existingMappings.has(res.sourceRecordId)) {
          newMappings.push({ sourceId: res.sourceRecordId, targetId: res.targetRecordId });
        }
      } else {
        result.failed++;
        const err = {
          sourceRecordId: res.sourceRecordId,
          errorMessage: res.errorMessage ?? "Unknown error",
          errorCode: res.errorCode ?? "UNKNOWN",
        };
        result.errors.push(err);
        forwardErrors.push(err);
      }
    }

    // Persist new record mappings
    await saveRecordMappings(config.id, config.source_org_id, config.target_org_id, newMappings);
    console.log(`[runner] Sync complete — ${result.succeeded} succeeded, ${result.failed} failed`);

    // Handle bidirectional: swap source/target and run again
    const reverseErrors: RunResult["errors"] = [];

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

      const reverseBatch = reverseFiltered.map((rec, idx) => {
        const existingTargetId = reverseMappings.get(rec.Id as string);
        const payload = mapRecord(rec, config.field_mappings.map((m) => ({ sourceField: m.target_field, targetField: m.source_field })));

        if (!existingTargetId) {
          const ownerId = resolveOwnerId(config.owner_config, "reverse", idx);
          if (ownerId) {
            payload["OwnerId"] = ownerId;
          }
        }

        return { sourceRecordId: rec.Id as string, existingTargetId, payload };
      });

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
          const err = {
            sourceRecordId: res.sourceRecordId,
            errorMessage: res.errorMessage ?? "Unknown error",
            errorCode: res.errorCode ?? "UNKNOWN",
          };
          result.errors.push(err);
          reverseErrors.push(err);
        }
      }

      await saveRecordMappings(config.id, config.target_org_id, config.source_org_id, reverseNewMappings);
    }

    // Write errors with direction tag so the retry engine knows which org to re-query
    await writeRecordErrors(logId, forwardErrors, config.id, "forward");
    if (reverseErrors.length > 0) {
      await writeRecordErrors(logId, reverseErrors, config.id, "reverse");
    }
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
 * Automatic retry runner — called at the end of each scheduler cycle.
 * Picks up all pending errors that haven't exceeded max_retries and re-attempts them.
 * This respects the retry_on_partial setting on each sync config.
 */
export async function runAutomaticRetries(): Promise<void> {
  // Find all pending errors grouped by sync_config_id
  const { data: pendingErrors } = await db()
    .from("sync_record_errors")
    .select(`
      id,
      sync_config_id,
      retry_count,
      direction,
      sync_config:sync_configs!inner(
        id, max_retries, retry_on_partial, is_active,
        source_org:connected_orgs!source_org_id(id, label, status),
        target_org:connected_orgs!target_org_id(id, label, status)
      )
    `)
    .eq("resolved", false)
    .eq("retry_status", "pending")
    .limit(500);  // safety cap per cycle

  if (!pendingErrors || pendingErrors.length === 0) return;

  // Group by sync_config_id
  type ErrorRow = {
    id: string;
    sync_config_id: string;
    retry_count: number;
    sync_config: {
      id: string;
      max_retries: number;
      retry_on_partial: boolean;
      is_active: boolean;
      source_org: { status?: string; label: string };
      target_org: { status?: string; label: string };
    };
  };

  const byConfig = new Map<string, ErrorRow[]>();
  for (const e of pendingErrors as unknown as ErrorRow[]) {
    if (!e.sync_config_id) continue;
    const arr = byConfig.get(e.sync_config_id) ?? [];
    arr.push(e);
    byConfig.set(e.sync_config_id, arr);
  }

  for (const [syncConfigId, errors] of byConfig.entries()) {
    const syncConfig = errors[0]?.sync_config;
    if (!syncConfig) continue;

    // Skip if sync is no longer active
    if (!syncConfig.is_active) continue;

    // Skip if either org is in error state
    if (syncConfig.source_org.status === "error" || syncConfig.target_org.status === "error") {
      console.warn(`[retry] Skipping auto-retry for config ${syncConfigId} — org in error state`);
      continue;
    }

    // Filter out errors that have hit max_retries — mark those as abandoned
    const toRetry = errors.filter((e) => e.retry_count < syncConfig.max_retries);
    const toAbandon = errors.filter((e) => e.retry_count >= syncConfig.max_retries);

    if (toAbandon.length > 0) {
      await db()
        .from("sync_record_errors")
        .update({ retry_status: "abandoned", resolved: false })
        .in("id", toAbandon.map((e) => e.id));
      console.log(`[retry] Abandoned ${toAbandon.length} records for config "${syncConfigId}" — max retries reached`);
    }

    if (toRetry.length === 0) continue;

    // Fetch the full config including encrypted tokens
    const { data: fullConfig } = await db()
      .from("sync_configs")
      .select(`
        id, customer_id, source_object, target_object, field_mappings, max_retries,
        source_org:connected_orgs!source_org_id(*),
        target_org:connected_orgs!target_org_id(*)
      `)
      .eq("id", syncConfigId)
      .single();

    if (!fullConfig) continue;

    // Import and run the retry engine inline
    // We duplicate the core logic here to avoid circular deps with the Next.js app
    try {
      console.log(`[retry] Auto-retrying ${toRetry.length} records for "${(fullConfig as unknown as SyncConfig).name ?? syncConfigId}"`);
      await db()
        .from("sync_record_errors")
        .update({ retry_status: "retrying" })
        .in("id", toRetry.map((e) => e.id));

      // Re-use the worker's own upsert/query machinery via runSyncConfig
      // We mark errors as pending again — the next normal cycle will pick them up
      // Actually we call a direct retry here using the worker's functions
      const typedConfig = fullConfig as unknown as SyncConfig;
      await retryFailedRecords(typedConfig, toRetry.map((e) => ({ id: e.id, direction: e.direction as "forward" | "reverse" })));
    } catch (err) {
      console.error(`[retry] Auto-retry failed for config ${syncConfigId}: ${err instanceof Error ? err.message : String(err)}`);
      // Reset to pending so it will be tried again next cycle
      await db()
        .from("sync_record_errors")
        .update({ retry_status: "pending" })
        .in("id", toRetry.map((e) => e.id));
    }
  }
}

/**
 * Performs the actual record re-fetch + upsert for a list of failed errors.
 * Used by the automatic retry runner above (worker-side, no Next.js deps).
 */
async function retryFailedRecords(
  config: SyncConfig,
  errors: Array<{ id: string; direction: "forward" | "reverse" }>
): Promise<void> {
  // Fetch full error rows to get source_record_ids
  const { data: errorRows } = await db()
    .from("sync_record_errors")
    .select("id, source_record_id, retry_count, direction")
    .in("id", errors.map((e) => e.id));

  if (!errorRows || errorRows.length === 0) return;

  type ERow = { id: string; source_record_id: string; retry_count: number; direction: string };
  const typedRows = errorRows as ERow[];

  const forwardRows = typedRows.filter((e) => e.direction === "forward");
  const reverseRows = typedRows.filter((e) => e.direction === "reverse");

  async function processGroup(
    rows: ERow[],
    sourceOrg: ConnectedOrg,
    targetOrg: ConnectedOrg,
    sourceObject: string,
    targetObject: string,
    direction: "forward" | "reverse"
  ) {
    if (rows.length === 0) return;

    const sourceFields = direction === "forward"
      ? config.field_mappings.map((m) => m.source_field).filter(Boolean)
      : config.field_mappings.map((m) => m.target_field).filter(Boolean);

    const sourceIds = rows.map((r) => r.source_record_id);

    // Re-fetch from source org
    const sourceRecords = await queryRecords(sourceOrg, sourceObject, sourceFields, new Date(0));
    // Filter to only the IDs we care about
    const recordMap = new Map(sourceRecords.filter((r) => sourceIds.includes(r.Id as string)).map((r) => [r.Id as string, r]));

    const { data: existingMappings } = await db()
      .from("sync_record_mappings")
      .select("source_record_id, target_record_id")
      .eq("sync_config_id", config.id)
      .eq("source_org_id", sourceOrg.id)
      .in("source_record_id", sourceIds);

    const mappingMap = new Map<string, string>(
      (existingMappings ?? []).map((m) => [
        (m as { source_record_id: string; target_record_id: string }).source_record_id,
        (m as { source_record_id: string; target_record_id: string }).target_record_id,
      ])
    );

    const batch = rows
      .filter((r) => recordMap.has(r.source_record_id))
      .map((r) => {
        const rec = recordMap.get(r.source_record_id)!;
        const payload: Record<string, unknown> = {};
        const mappings = direction === "forward"
          ? config.field_mappings.map((m) => ({ from: m.source_field, to: m.target_field }))
          : config.field_mappings.map((m) => ({ from: m.target_field, to: m.source_field }));
        for (const m of mappings) {
          if (rec[m.from] !== undefined) payload[m.to] = rec[m.from];
        }
        return { sourceRecordId: r.source_record_id, existingTargetId: mappingMap.get(r.source_record_id), payload };
      });

    const upsertResults = await upsertRecords(targetOrg, targetObject, batch);
    const newMappings: Array<{ sourceId: string; targetId: string }> = [];

    for (const res of upsertResults) {
      const row = rows.find((r) => r.source_record_id === res.sourceRecordId);
      if (!row) continue;

      const newCount = (row.retry_count ?? 0) + 1;
      if (res.success) {
        await db()
          .from("sync_record_errors")
          .update({ resolved: true, retry_status: "resolved", retry_count: newCount, retried_at: new Date().toISOString() })
          .eq("id", row.id);
        if (res.targetRecordId && !mappingMap.has(res.sourceRecordId)) {
          newMappings.push({ sourceId: res.sourceRecordId, targetId: res.targetRecordId });
        }
      } else {
        const isAbandoned = newCount >= config.max_retries;
        await db()
          .from("sync_record_errors")
          .update({
            retry_count: newCount,
            retried_at: new Date().toISOString(),
            retry_status: isAbandoned ? "abandoned" : "pending",
            error_message: res.errorMessage ?? "Retry failed",
            error_code: res.errorCode ?? "UNKNOWN",
          })
          .eq("id", row.id);
        if (isAbandoned) {
          console.warn(`[retry] Record ${res.sourceRecordId} abandoned after ${newCount} retries`);
        }
      }
    }

    if (newMappings.length > 0) {
      await saveRecordMappings(config.id, sourceOrg.id, targetOrg.id, newMappings);
    }
  }

  await processGroup(forwardRows, config.source_org, config.target_org, config.source_object, config.target_object, "forward");
  await processGroup(reverseRows, config.target_org, config.source_org, config.target_object, config.source_object, "reverse");
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

  const all = (data ?? []) as unknown as SyncConfig[];

  // Skip configs whose source or target org is in an error state
  const healthy = all.filter((cfg) => {
    const srcStatus = (cfg.source_org as unknown as { status?: string }).status;
    const tgtStatus = (cfg.target_org as unknown as { status?: string }).status;
    if (srcStatus === "error") {
      console.warn(`[scheduler] Skipping "${cfg.name}" — source org "${cfg.source_org.label}" is in error state`);
      return false;
    }
    if (tgtStatus === "error") {
      console.warn(`[scheduler] Skipping "${cfg.name}" — target org "${cfg.target_org.label}" is in error state`);
      return false;
    }
    return true;
  });

  return healthy;
}
