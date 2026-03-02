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

const SYSTEM_PROMPT = `You are a Salesforce sync monitoring expert. Analyze sync statistics and identify genuine anomalies — but be conservative and context-aware.

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

IMPORTANT RULES — read these carefully before flagging anything:

1. Low record volume is NOT an anomaly. Salesforce orgs with few records, test/sandbox orgs, or orgs that simply haven't had activity will show zero or very low processed counts. This is completely normal. Do NOT flag it.

2. Only flag "0 records processed" as an anomaly if the sync has historically processed significant volumes (100+ records per week) AND has recently dropped to zero. If total_processed is low across the whole period, assume it's a quiet org or test environment.

3. Only flag failure rates if total_processed is at least 50 records AND the failure rate exceeds 25%. A failure rate on 3 records out of 5 is not statistically meaningful.

4. Only flag "sync hasn't run" if the sync is active AND last_run is more than 30 minutes ago (the sync interval is 2 minutes, so missing a few runs is normal during maintenance).

5. Never flag stats that have an obvious innocent explanation (new account, test org, quiet period, weekend, no source data changed).

6. When in doubt, return has_anomalies=false. It is much better to stay silent than to produce false alarms that confuse customers.

7. overall_health should be "healthy" unless there is a clear, high-confidence problem with significant volume.

Keep messages short, plain English, non-technical. Return only valid JSON.`;

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

  // Hard minimum: if the account is brand new, test-only, or genuinely quiet,
  // don't run the AI check — there's nothing meaningful to analyze yet.
  const totalProcessedAllTime = statsArray.reduce((s, x) => s + x.total_processed, 0);
  const totalFailedAllTime = statsArray.reduce((s, x) => s + x.total_failed, 0);
  const totalRunsAllTime = statsArray.reduce((s, x) => s + x.total_runs, 0);

  // Skip if: fewer than 50 total records processed, OR fewer than 10 runs total
  // These numbers are too small to draw any reliable conclusions from.
  const hasEnoughData = totalProcessedAllTime >= 50 || (totalRunsAllTime >= 10 && totalFailedAllTime > 5);

  if (!hasEnoughData) {
    return NextResponse.json({
      has_anomalies: false,
      anomalies: [],
      overall_health: "healthy",
      health_summary: "Not enough sync history yet to detect patterns. Everything looks fine.",
    });
  }

  const userContent = `
Sync statistics for the last 7 days:
Account context: ${totalProcessedAllTime} total records processed across all syncs this week. ${totalRunsAllTime} total sync runs.

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
