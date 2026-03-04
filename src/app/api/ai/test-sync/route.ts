import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken, describeSObject } from "@/lib/salesforce/metadata";
import { askClaude } from "@/lib/ai/client";

const SF_API_VERSION = "v59.0";

interface FieldMapping {
  source_field: string;
  source_label?: string;
  target_field: string;
  target_label?: string;
}

interface Filter {
  field: string;
  operator: string;
  value: string;
}

interface TestSyncRequest {
  source_org_id: string;
  target_org_id: string;
  source_object: string;
  target_object: string;
  field_mappings: FieldMapping[];
  filters?: Filter[];
  direction?: "one_way" | "bidirectional";
}

interface CheckResult {
  status: "pass" | "warn" | "fail";
  category: string;
  message: string;
  detail?: string;
  // For Mappings checks — lets the UI offer "Remove this mapping" without parsing the message
  source_field?: string;
  target_field?: string;
}

interface PreflightReport {
  overall: "ready" | "warnings" | "blocked";
  summary: string;
  sample_record: Record<string, unknown> | null;
  mapped_payload: Record<string, unknown> | null;
  checks: CheckResult[];
  ai_verdict: string;
}

function evaluateFilters(record: Record<string, unknown>, filters: Filter[]): boolean {
  return filters.every((f) => {
    const val = record[f.field];
    switch (f.operator) {
      case "equals": return String(val) === f.value;
      case "not_equals": return String(val) !== f.value;
      case "contains": return String(val ?? "").includes(f.value);
      case "not_contains": return !String(val ?? "").includes(f.value);
      case "greater_than": return Number(val) > Number(f.value);
      case "less_than": return Number(val) < Number(f.value);
      case "is_null": return val === null || val === undefined;
      case "is_not_null": return val !== null && val !== undefined;
      default: return true;
    }
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const body: TestSyncRequest = await request.json();
  const { source_org_id, target_org_id, source_object, target_object, field_mappings, filters = [], direction } = body;

  if (!source_org_id || !target_org_id || !source_object || !target_object) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify orgs belong to this customer
  const { data: orgs } = await supabase
    .from("connected_orgs")
    .select("id")
    .eq("customer_id", customer.id)
    .in("id", [source_org_id, target_org_id]);

  if (!orgs || orgs.length < (source_org_id === target_org_id ? 1 : 2)) {
    return NextResponse.json({ error: "One or more orgs not found" }, { status: 404 });
  }

  const checks: CheckResult[] = [];
  let sampleRecord: Record<string, unknown> | null = null;
  let mappedPayload: Record<string, unknown> | null = null;

  try {
    // ── 1. Validate source org connection ──────────────────────────────────────
    let sourceToken: string, sourceInstance: string;
    try {
      const src = await getValidAccessToken(source_org_id);
      sourceToken = src.accessToken;
      sourceInstance = src.instanceUrl;
      checks.push({ status: "pass", category: "Connection", message: "Source org connected successfully" });
    } catch (e) {
      checks.push({ status: "fail", category: "Connection", message: "Source org connection failed", detail: String(e) });
      return NextResponse.json<PreflightReport>({
        overall: "blocked",
        summary: "Cannot reach source org. Check if the org is still connected.",
        sample_record: null,
        mapped_payload: null,
        checks,
        ai_verdict: "Blocked — fix the source org connection before proceeding.",
      });
    }

    // ── 2. Validate target org connection ──────────────────────────────────────
    let targetToken: string, targetInstance: string;
    try {
      const tgt = await getValidAccessToken(target_org_id);
      targetToken = tgt.accessToken;
      targetInstance = tgt.instanceUrl;
      checks.push({ status: "pass", category: "Connection", message: "Target org connected successfully" });
    } catch (e) {
      checks.push({ status: "fail", category: "Connection", message: "Target org connection failed", detail: String(e) });
      return NextResponse.json<PreflightReport>({
        overall: "blocked",
        summary: "Cannot reach target org. Check if the org is still connected.",
        sample_record: null,
        mapped_payload: null,
        checks,
        ai_verdict: "Blocked — fix the target org connection before proceeding.",
      });
    }

    // ── 3. Describe source object ──────────────────────────────────────────────
    let sourceDetail: Awaited<ReturnType<typeof describeSObject>>;
    try {
      sourceDetail = await describeSObject(sourceToken, sourceInstance, source_object);
      checks.push({ status: "pass", category: "Schema", message: `Source object "${source_object}" is accessible (${sourceDetail.fields.length} fields)` });
    } catch (e) {
      checks.push({ status: "fail", category: "Schema", message: `Cannot describe source object "${source_object}"`, detail: String(e) });
      return NextResponse.json<PreflightReport>({
        overall: "blocked",
        summary: `Source object "${source_object}" is not accessible. It may not exist or your profile lacks read access.`,
        sample_record: null,
        mapped_payload: null,
        checks,
        ai_verdict: "Blocked — source object inaccessible.",
      });
    }

    // ── 4. Describe target object ──────────────────────────────────────────────
    let targetDetail: Awaited<ReturnType<typeof describeSObject>>;
    try {
      targetDetail = await describeSObject(targetToken, targetInstance, target_object);
      checks.push({ status: "pass", category: "Schema", message: `Target object "${target_object}" is accessible (${targetDetail.fields.length} fields)` });
    } catch (e) {
      checks.push({ status: "fail", category: "Schema", message: `Cannot describe target object "${target_object}"`, detail: String(e) });
      return NextResponse.json<PreflightReport>({
        overall: "blocked",
        summary: `Target object "${target_object}" is not accessible. It may not exist or your profile lacks write access.`,
        sample_record: null,
        mapped_payload: null,
        checks,
        ai_verdict: "Blocked — target object inaccessible.",
      });
    }

    // ── 5. Check target object is createable ───────────────────────────────────
    // We use the describe to check if at least one field is createable as proxy
    const hasCreateableFields = targetDetail.fields.some((f) => f.createable);
    if (!hasCreateableFields) {
      checks.push({ status: "fail", category: "Permissions", message: `Target object "${target_object}" has no createable fields — insert will fail` });
    } else {
      checks.push({ status: "pass", category: "Permissions", message: `Target object "${target_object}" is writeable` });
    }

    // ── 6. Validate field mappings against schema ──────────────────────────────
    if (!field_mappings || field_mappings.length === 0) {
      checks.push({ status: "warn", category: "Mappings", message: "No field mappings defined — only Id will be tracked, no data will transfer" });
    } else {
      const sourceFieldMap = new Map(sourceDetail.fields.map((f) => [f.name, f]));
      const targetFieldMap = new Map(targetDetail.fields.map((f) => [f.name, f]));

      for (const m of field_mappings) {
        const sf = sourceFieldMap.get(m.source_field);
        const tf = targetFieldMap.get(m.target_field);
        const mappingMeta = { source_field: m.source_field, target_field: m.target_field };

        if (!sf) {
          checks.push({ status: "fail", category: "Mappings", message: `Source field "${m.source_field}" does not exist on ${source_object}`, ...mappingMeta });
          continue;
        }
        if (!tf) {
          checks.push({ status: "fail", category: "Mappings", message: `Target field "${m.target_field}" does not exist on ${target_object}`, ...mappingMeta });
          continue;
        }
        if (!tf.createable && !tf.updateable) {
          checks.push({ status: "fail", category: "Mappings", message: `Target field "${m.target_field}" is read-only and cannot be written`, ...mappingMeta });
          continue;
        }
        if (tf.type === "reference") {
          checks.push({
            status: "warn",
            category: "Mappings",
            message: `"${m.source_field}" → "${m.target_field}" is a lookup — source org IDs won't be valid in target org`,
            detail: "Sync the parent object first so record mappings exist, or use an External ID field.",
            ...mappingMeta,
          });
          continue;
        }
        // Type mismatch heuristics
        const numericTypes = ["currency", "double", "integer", "percent", "long"];
        const dateTypes = ["date", "datetime"];
        if (numericTypes.includes(sf.type) && !numericTypes.includes(tf.type) && tf.type !== "string" && tf.type !== "textarea") {
          checks.push({ status: "warn", category: "Mappings", message: `Type mismatch: "${m.source_field}" (${sf.type}) → "${m.target_field}" (${tf.type}) — data may be truncated`, ...mappingMeta });
        } else if (dateTypes.includes(sf.type) && !dateTypes.includes(tf.type)) {
          checks.push({ status: "warn", category: "Mappings", message: `Type mismatch: "${m.source_field}" (${sf.type}) → "${m.target_field}" (${tf.type}) — value may not parse correctly`, ...mappingMeta });
        } else {
          checks.push({ status: "pass", category: "Mappings", message: `"${m.source_field}" → "${m.target_field}" looks good (${sf.type} → ${tf.type})`, ...mappingMeta });
        }
      }

      // Check required target fields
      const mappedTargets = new Set(field_mappings.map((m) => m.target_field));
      const unmappedRequired = targetDetail.fields.filter(
        (f) => !f.nillable && f.createable && !f.defaultedOnCreate && !mappedTargets.has(f.name) && f.name !== "Id"
      );
      for (const f of unmappedRequired) {
        checks.push({
          status: "fail",
          category: "Mappings",
          message: `Required target field "${f.name}" (${f.label}) is not mapped — inserts will fail`,
        });
      }
    }

    // ── 7. Query one real sample record ───────────────────────────────────────
    const sourceFields = field_mappings.length > 0
      ? ["Id", "SystemModstamp", ...field_mappings.map((m) => m.source_field).filter(Boolean)]
      : ["Id", "SystemModstamp", "Name"];

    const deduped = [...new Set(sourceFields)];
    const soql = `SELECT ${deduped.join(", ")} FROM ${source_object} ORDER BY SystemModstamp DESC LIMIT 1`;

    try {
      const qRes = await fetch(
        `${sourceInstance}/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(soql)}`,
        { headers: { Authorization: `Bearer ${sourceToken}`, "Content-Type": "application/json" } }
      );
      if (!qRes.ok) {
        const errText = await qRes.text();
        checks.push({ status: "warn", category: "Sample Record", message: "Could not query a sample record", detail: errText });
      } else {
        const qData = await qRes.json();
        if (qData.totalSize === 0) {
          checks.push({ status: "warn", category: "Sample Record", message: `No records found in ${source_object} — sync will have nothing to process yet` });
        } else {
          sampleRecord = qData.records[0];
          checks.push({ status: "pass", category: "Sample Record", message: `Found ${qData.totalSize} record(s) in ${source_object} — using most recent for simulation` });

          // Check if filters would pass on this record
          if (filters.length > 0) {
            const passes = evaluateFilters(sampleRecord!, filters);
            if (!passes) {
              checks.push({ status: "warn", category: "Filters", message: "The most recent record would be filtered out — verify your filter conditions" });
            } else {
              checks.push({ status: "pass", category: "Filters", message: "Sample record passes all filter conditions" });
            }
          }

          // Build the mapped payload (dry-run, not written)
          if (field_mappings.length > 0) {
            mappedPayload = {};
            for (const m of field_mappings) {
              if (sampleRecord && m.source_field in sampleRecord) {
                mappedPayload[m.target_field] = sampleRecord[m.source_field];
              }
            }
            checks.push({ status: "pass", category: "Payload", message: `Simulated payload built with ${Object.keys(mappedPayload).length} field(s) — not written to target org` });
          }
        }
      }
    } catch (e) {
      checks.push({ status: "warn", category: "Sample Record", message: "Query failed unexpectedly", detail: String(e) });
    }

    // ── 8. AI verdict ─────────────────────────────────────────────────────────
    const failCount = checks.filter((c) => c.status === "fail").length;
    const warnCount = checks.filter((c) => c.status === "warn").length;

    const overall: PreflightReport["overall"] =
      failCount > 0 ? "blocked" : warnCount > 0 ? "warnings" : "ready";

    const aiContext = `
Sync: ${source_object} → ${target_object}
Direction: ${direction ?? "one_way"}
Field mappings: ${field_mappings.length}
Filters: ${filters.length}

Preflight checks:
${checks.map((c) => `[${c.status.toUpperCase()}] ${c.category}: ${c.message}${c.detail ? " — " + c.detail : ""}`).join("\n")}

Sample record fields: ${sampleRecord ? Object.keys(sampleRecord).join(", ") : "none"}
Mapped payload fields: ${mappedPayload ? Object.keys(mappedPayload).join(", ") : "none"}
`;

    let aiVerdict = overall === "ready"
      ? "All checks passed. This sync configuration looks ready to activate."
      : overall === "blocked"
      ? "This configuration has blocking issues that must be resolved before the sync can run."
      : "This configuration has warnings. The sync will likely run but may encounter issues with some records.";

    try {
      const verdict = await askClaude<{ verdict: string }>(
        `You are a Salesforce integration expert reviewing a dry-run preflight report. 
Write a 2-3 sentence verdict in plain English. Be direct, specific, and actionable. 
If there are issues, tell the user exactly what to fix. Do not use jargon.
Return JSON: { "verdict": "your verdict here" }`,
        aiContext
      );
      aiVerdict = verdict.verdict ?? aiVerdict;
    } catch {
      // keep the fallback verdict
    }

    const summaryParts: string[] = [];
    if (failCount > 0) summaryParts.push(`${failCount} blocking issue${failCount > 1 ? "s" : ""}`);
    if (warnCount > 0) summaryParts.push(`${warnCount} warning${warnCount > 1 ? "s" : ""}`);
    if (summaryParts.length === 0) summaryParts.push("all checks passed");

    return NextResponse.json<PreflightReport>({
      overall,
      summary: summaryParts.join(", "),
      sample_record: sampleRecord,
      mapped_payload: mappedPayload,
      checks,
      ai_verdict: aiVerdict,
    });

  } catch (err) {
    console.error("[ai/test-sync]", err);
    return NextResponse.json({ error: "Test run failed unexpectedly", detail: String(err) }, { status: 500 });
  }
}
