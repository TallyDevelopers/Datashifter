/**
 * CPQ/RCA Integration Job Runner
 *
 * Executes integration jobs sequentially — one object step at a time, in dependency order.
 * If a step fails critically, all subsequent steps are skipped to prevent broken foreign keys.
 */

import { createClient } from "@supabase/supabase-js";
import {
  getValidAccessToken,
  queryRecords,
  upsertByExternalId,
  EXTERNAL_ID_FIELD,
} from "./salesforce.js";
import type {
  ConnectedOrg,
  FieldMapping,
  SyncFilter,
  OwnerConfig,
  RecordTypeConfig,
  SalesforceRecord,
} from "./types.js";

function db() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CpqJobStep {
  id: string;
  step_order: number;
  label: string | null;
  source_object: string;
  target_object: string;
  field_mappings: FieldMapping[];
  filters: SyncFilter[];
  record_type_config: RecordTypeConfig | null;
  owner_config: OwnerConfig | null;
}

interface CpqJob {
  id: string;
  customer_id: string;
  name: string;
  source_org_id: string;
  target_org_id: string;
  interval_minutes: number;
  is_active: boolean;
  last_run_at: string | null;
  source_org: ConnectedOrg;
  target_org: ConnectedOrg;
  cpq_job_objects: CpqJobStep[];
}

// ─── Main exports ──────────────────────────────────────────────────────────────

export async function fetchActiveCpqJobs(): Promise<CpqJob[]> {
  const supabase = db();
  const { data, error } = await supabase
    .from("cpq_jobs")
    .select(`
      id, customer_id, name, source_org_id, target_org_id,
      interval_minutes, is_active, last_run_at,
      source_org:connected_orgs!source_org_id(*),
      target_org:connected_orgs!target_org_id(*),
      cpq_job_objects(id, step_order, label, source_object, target_object, field_mappings, filters, record_type_config, owner_config)
    `)
    .eq("is_active", true);

  if (error) {
    console.error("[cpq-runner] Failed to fetch CPQ jobs:", error.message);
    return [];
  }
  return (data as unknown as CpqJob[]) ?? [];
}

export async function runCpqJob(job: CpqJob, intervalMs: number): Promise<{
  jobId: string;
  runsCompleted: number;
  stepsFailed: number;
}> {
  const supabase = db();
  const steps = [...(job.cpq_job_objects ?? [])].sort((a, b) => a.step_order - b.step_order);

  if (steps.length === 0) {
    console.log(`[cpq-runner] Job "${job.name}" has no steps — skipping.`);
    return { jobId: job.id, runsCompleted: 0, stepsFailed: 0 };
  }

  // Check for pending manual runs first, then create a scheduled one
  const { data: pendingRun } = await supabase
    .from("cpq_job_runs")
    .select("id")
    .eq("job_id", job.id)
    .eq("status", "running")
    .eq("triggered_by", "manual")
    .maybeSingle();

  let runId: string;

  if (pendingRun) {
    runId = pendingRun.id;
    console.log(`[cpq-runner] Resuming manual run ${runId} for job "${job.name}"`);
  } else {
    // Determine if interval has elapsed
    if (job.interval_minutes > 0 && job.last_run_at) {
      const elapsed = Date.now() - new Date(job.last_run_at).getTime();
      const needed = job.interval_minutes * 60 * 1000;
      if (elapsed < needed) {
        console.log(`[cpq-runner] Job "${job.name}" interval not elapsed — skipping.`);
        return { jobId: job.id, runsCompleted: 0, stepsFailed: 0 };
      }
    }

    const { data: newRun, error: runError } = await supabase
      .from("cpq_job_runs")
      .insert({ job_id: job.id, status: "running", triggered_by: "schedule" })
      .select("id")
      .single();

    if (runError || !newRun) {
      console.error(`[cpq-runner] Failed to create run for job "${job.name}":`, runError?.message);
      return { jobId: job.id, runsCompleted: 0, stepsFailed: 1 };
    }
    runId = newRun.id;
  }

  // Get valid tokens once for the whole job
  let sourceToken: { accessToken: string; instanceUrl: string };
  let targetToken: { accessToken: string; instanceUrl: string };
  try {
    [sourceToken, targetToken] = await Promise.all([
      getValidAccessToken(job.source_org),
      getValidAccessToken(job.target_org),
    ]);
  } catch (err) {
    console.error(`[cpq-runner] Token refresh failed for job "${job.name}":`, err);
    await supabase.from("cpq_job_runs").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", runId);
    return { jobId: job.id, runsCompleted: 0, stepsFailed: 1 };
  }

  // Determine lookback window
  const sinceDate = job.last_run_at
    ? new Date(job.last_run_at)
    : new Date(Date.now() - intervalMs);

  let overallStatus: "success" | "partial" | "failed" = "success";
  let stepsFailed = 0;
  let criticalFailed = false;

  // Execute steps sequentially
  for (const step of steps) {
    const stepLabel = step.label ?? step.source_object;

    if (criticalFailed) {
      // Skip this step — a prior step failed
      console.log(`[cpq-runner] Skipping step ${step.step_order} (${stepLabel}) — prior step failed.`);
      await supabase.from("cpq_job_run_steps").insert({
        run_id: runId,
        job_object_id: step.id,
        step_order: step.step_order,
        source_object: step.source_object,
        target_object: step.target_object,
        status: "skipped",
        skip_reason: "Previous step failed — skipped to prevent broken foreign keys.",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
      overallStatus = "partial";
      continue;
    }

    console.log(`[cpq-runner] Running step ${step.step_order}: ${stepLabel} (${step.source_object} → ${step.target_object})`);

    const { data: stepRow } = await supabase
      .from("cpq_job_run_steps")
      .insert({
        run_id: runId,
        job_object_id: step.id,
        step_order: step.step_order,
        source_object: step.source_object,
        target_object: step.target_object,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    const stepRowId = stepRow?.id;

    try {
      const result = await runCpqStep(
        step,
        job.source_org,
        job.target_org,
        sourceToken,
        targetToken,
        sinceDate
      );

      const stepStatus = result.failed === 0 ? "success" : result.succeeded === 0 ? "failed" : "partial";

      await supabase.from("cpq_job_run_steps").update({
        status: stepStatus,
        records_queried: result.queried,
        records_succeeded: result.succeeded,
        records_failed: result.failed,
        error_details: result.errors.length > 0 ? { errors: result.errors } : null,
        completed_at: new Date().toISOString(),
      }).eq("id", stepRowId);

      if (stepStatus === "failed") {
        criticalFailed = true;
        overallStatus = "partial";
        stepsFailed++;
        console.error(`[cpq-runner] Step ${step.step_order} failed — ${result.failed} records failed. Stopping chain.`);
      } else if (stepStatus === "partial") {
        overallStatus = "partial";
        console.warn(`[cpq-runner] Step ${step.step_order} partial — ${result.succeeded}/${result.queried} succeeded.`);
      } else {
        console.log(`[cpq-runner] Step ${step.step_order} complete — ${result.succeeded} records synced.`);
      }
    } catch (err) {
      console.error(`[cpq-runner] Step ${step.step_order} threw:`, err);
      criticalFailed = true;
      overallStatus = "partial";
      stepsFailed++;

      await supabase.from("cpq_job_run_steps").update({
        status: "failed",
        error_details: { message: String(err) },
        completed_at: new Date().toISOString(),
      }).eq("id", stepRowId);
    }
  }

  // Finalize run
  if (stepsFailed > 0 && stepsFailed === steps.length) overallStatus = "failed";

  await supabase.from("cpq_job_runs").update({
    status: overallStatus,
    completed_at: new Date().toISOString(),
  }).eq("id", runId);

  await supabase.from("cpq_jobs").update({
    last_run_at: new Date().toISOString(),
  }).eq("id", job.id);

  console.log(`[cpq-runner] Job "${job.name}" finished — ${overallStatus}. Steps failed: ${stepsFailed}/${steps.length}`);
  return { jobId: job.id, runsCompleted: 1, stepsFailed };
}

// ─── Single step execution ────────────────────────────────────────────────────

async function runCpqStep(
  step: CpqJobStep,
  sourceOrg: ConnectedOrg,
  targetOrg: ConnectedOrg,
  sourceToken: { accessToken: string; instanceUrl: string },
  targetToken: { accessToken: string; instanceUrl: string },
  sinceDate: Date
): Promise<{ queried: number; succeeded: number; failed: number; errors: Array<{ sourceRecordId: string; errorMessage: string; errorCode: string }> }> {
  const fieldMappings = step.field_mappings ?? [];
  if (fieldMappings.length === 0) {
    console.log(`[cpq-runner] Step "${step.source_object}" has no field mappings — skipping.`);
    return { queried: 0, succeeded: 0, failed: 0, errors: [] };
  }

  const sourceFields = fieldMappings.map((m) => m.source_field).filter(Boolean);

  // If record_type_config strategy is "mapped", we need RecordTypeId too
  const rtConfig = step.record_type_config;
  const needsRTId = rtConfig?.strategy === "mapped";
  if (needsRTId && !sourceFields.includes("RecordTypeId")) {
    sourceFields.push("RecordTypeId");
  }

  // Query source records modified since last run
  const records = await queryRecords(
    { ...sourceOrg, access_token: sourceToken.accessToken, instance_url: sourceToken.instanceUrl } as ConnectedOrg,
    step.source_object,
    sourceFields,
    sinceDate
  );

  if (records.length === 0) {
    return { queried: 0, succeeded: 0, failed: 0, errors: [] };
  }

  // Apply filters
  const filtered = records.filter((r) => passesFilters(r, step.filters ?? []));

  if (filtered.length === 0) {
    return { queried: records.length, succeeded: 0, failed: 0, errors: [] };
  }

  // Build upsert batches
  const batch: Array<{ sourceRecordId: string; payload: Record<string, unknown> }> = [];

  for (const record of filtered) {
    const sourceId = record.Id as string;
    if (!sourceId) continue;

    const payload: Record<string, unknown> = {};

    // Map fields
    for (const m of fieldMappings) {
      if (m.source_field && m.target_field && record[m.source_field] !== undefined) {
        payload[m.target_field] = record[m.source_field];
      }
    }

    // Handle record types
    if (rtConfig && rtConfig.strategy !== "none") {
      const resolved = resolveRecordTypeId(rtConfig, record, false);
      if (resolved.skip) continue;
      if (resolved.recordTypeId) payload["RecordTypeId"] = resolved.recordTypeId;
    }

    // Handle owner
    if (step.owner_config) {
      const ownerId = resolveOwner(step.owner_config, false);
      if (ownerId) payload["OwnerId"] = ownerId;
    }

    // Set external ID
    payload[EXTERNAL_ID_FIELD] = sourceId;

    batch.push({ sourceRecordId: sourceId, payload });
  }

  if (batch.length === 0) {
    return { queried: records.length, succeeded: 0, failed: 0, errors: [] };
  }

  // Upsert to target
  const upsertResults = await upsertByExternalId(
    { ...targetOrg, access_token: targetToken.accessToken, instance_url: targetToken.instanceUrl } as ConnectedOrg,
    step.target_object,
    batch
  );

  const succeeded = upsertResults.filter((r) => r.success).length;
  const failed = upsertResults.filter((r) => !r.success).length;
  const errors = upsertResults
    .filter((r) => !r.success)
    .map((r) => ({
      sourceRecordId: r.sourceRecordId,
      errorMessage: r.errorMessage ?? "Unknown error",
      errorCode: r.errorCode ?? "UNKNOWN",
    }));

  return {
    queried: records.length,
    succeeded,
    failed,
    errors,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function passesFilters(record: SalesforceRecord, filters: SyncFilter[]): boolean {
  for (const f of filters) {
    const val = record[f.field];
    const fval = f.value;
    const op = f.operator;

    if (op === "is empty" || op === "is_null") { if (val !== null && val !== undefined && val !== "") return false; continue; }
    if (op === "is not empty" || op === "is_not_null") { if (val === null || val === undefined || val === "") return false; continue; }

    const strVal = String(val ?? "");
    const strFval = String(fval ?? "");

    if (op === "=" || op === "equals") { if (strVal !== strFval) return false; }
    else if (op === "!=" || op === "not_equals") { if (strVal === strFval) return false; }
    else if (op === "contains") { if (!strVal.toLowerCase().includes(strFval.toLowerCase())) return false; }
    else if (op === "starts with") { if (!strVal.toLowerCase().startsWith(strFval.toLowerCase())) return false; }
    else if (op === ">") { if (!(parseFloat(strVal) > parseFloat(strFval))) return false; }
    else if (op === "<") { if (!(parseFloat(strVal) < parseFloat(strFval))) return false; }
    else if (op === ">=") { if (!(parseFloat(strVal) >= parseFloat(strFval))) return false; }
    else if (op === "<=") { if (!(parseFloat(strVal) <= parseFloat(strFval))) return false; }
  }
  return true;
}

function resolveRecordTypeId(
  config: RecordTypeConfig,
  record: SalesforceRecord,
  _isReverse: boolean
): { recordTypeId: string | null; skip: boolean } {
  if (config.strategy === "fixed") {
    return { recordTypeId: config.target_record_type_id, skip: false };
  }
  if (config.strategy === "mapped") {
    const sourceRTId = record["RecordTypeId"] as string | null;
    if (!sourceRTId) return { recordTypeId: null, skip: false };
    const mapping = config.mappings.find((m) => m.source_id === sourceRTId);
    if (!mapping) return { recordTypeId: null, skip: false };
    if (!mapping.target_id) return { recordTypeId: null, skip: true };
    return { recordTypeId: mapping.target_id, skip: false };
  }
  return { recordTypeId: null, skip: false };
}

let rrIndex = 0;
function resolveOwner(config: OwnerConfig, _isReverse: boolean): string | null {
  const users = config.target_users ?? [];
  if (!users.length) return null;
  if (config.strategy === "fixed") return users[0].id;
  if (config.strategy === "round_robin") {
    const id = users[rrIndex % users.length].id;
    rrIndex++;
    return id;
  }
  return null;
}
