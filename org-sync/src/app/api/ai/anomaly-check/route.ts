import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askClaude } from "@/lib/ai/client";

interface AnomalyResult {
  has_anomalies: boolean;
  anomalies: {
    sync_name: string;
    severity: "info" | "warning" | "critical";
    message: string;
    suggestion: string;
  }[];
  overall_health: "healthy" | "degraded" | "critical";
  health_summary: string;
}

const SYSTEM_PROMPT = `You are a Salesforce sync monitoring expert. Analyze sync statistics and identify anomalies or concerning patterns.

Return valid JSON matching this exact shape:
{
  "has_anomalies": true | false,
  "anomalies": [
    {
      "sync_name": "name of the sync config",
      "severity": "info" | "warning" | "critical",
      "message": "1 sentence describing what's wrong",
      "suggestion": "1 sentence actionable fix"
    }
  ],
  "overall_health": "healthy" | "degraded" | "critical",
  "health_summary": "1 sentence overall system health summary"
}

Look for:
- Syncs with 0 records processed when they usually process records (possible connection issue)
- Success rate drops of more than 10% compared to average
- Syncs that haven't run recently despite being active
- Very high failure rates (>20% of records failing)
- No syncs running at all when configs are active
If everything looks normal, return has_anomalies=false with an empty anomalies array.
Keep messages short and non-technical. Return only valid JSON.`;

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

  // Fetch recent sync stats — last 7 days
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: syncConfigs } = await supabase
    .from("sync_configs")
    .select("id, name, is_active, source_object, target_object")
    .eq("customer_id", customer.id);

  if (!syncConfigs?.length) {
    return NextResponse.json({
      has_anomalies: false,
      anomalies: [],
      overall_health: "healthy",
      health_summary: "No sync configurations found.",
    });
  }

  const syncIds = syncConfigs.map((s) => s.id);

  const { data: recentLogs } = await supabase
    .from("sync_logs")
    .select("sync_config_id, status, records_processed, records_succeeded, records_failed, started_at, completed_at")
    .in("sync_config_id", syncIds)
    .gte("started_at", since)
    .order("started_at", { ascending: false });

  // Build per-sync stats summary
  const statsBySyncId = new Map<string, {
    name: string; is_active: boolean; total_runs: number;
    total_processed: number; total_failed: number; last_run: string | null;
    success_rate: number;
  }>();

  for (const cfg of syncConfigs) {
    statsBySyncId.set(cfg.id, {
      name: cfg.name, is_active: cfg.is_active,
      total_runs: 0, total_processed: 0, total_failed: 0,
      last_run: null, success_rate: 100,
    });
  }

  for (const log of recentLogs ?? []) {
    const stats = statsBySyncId.get(log.sync_config_id);
    if (!stats) continue;
    stats.total_runs++;
    stats.total_processed += log.records_processed ?? 0;
    stats.total_failed += log.records_failed ?? 0;
    if (!stats.last_run || log.started_at > stats.last_run) stats.last_run = log.started_at;
  }

  for (const stats of statsBySyncId.values()) {
    if (stats.total_processed > 0) {
      stats.success_rate = Math.round(((stats.total_processed - stats.total_failed) / stats.total_processed) * 100);
    }
  }

  const statsArray = Array.from(statsBySyncId.values());

  const userContent = `
Sync statistics for the last 7 days:

${statsArray.map((s) => `Sync: "${s.name}"
  Active: ${s.is_active}
  Total runs: ${s.total_runs}
  Records processed: ${s.total_processed}
  Records failed: ${s.total_failed}
  Success rate: ${s.success_rate}%
  Last run: ${s.last_run ? new Date(s.last_run).toLocaleString() : "Never"}`).join("\n\n")}

Current time: ${new Date().toISOString()}

Identify any anomalies or health concerns. Return only valid JSON.`;

  try {
    const result = await askClaude<AnomalyResult>(SYSTEM_PROMPT, userContent);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[ai/anomaly-check]", err);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }
}
