"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2, ArrowLeftRight, Activity, CheckCircle2, XCircle,
  Clock, ArrowRight, Plus, RefreshCw, Loader2, AlertCircle,
  LifeBuoy, Zap, Sparkles, X, TrendingDown, BarChart3, GitBranch,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ActivityStatus = "running" | "success" | "partial" | "failed";

interface ActivityItem {
  id: string;
  activity_type: "sync" | "migration";
  status: ActivityStatus;
  records_processed: number;
  records_succeeded: number;
  records_failed: number;
  started_at: string;
  completed_at: string | null;
  sync_config?: {
    id: string;
    name: string;
    source_object: string;
    target_object: string;
    source_org: { label: string };
    target_org: { label: string };
  };
  job?: {
    id: string;
    name: string;
    source_org: { label: string };
    target_org: { label: string };
  };
  triggered_by?: "schedule" | "manual";
}

interface ActiveSync {
  id: string;
  name: string;
  source_object: string;
  target_object: string;
  source_org: { label: string };
  target_org: { label: string };
}

interface ActiveMigration {
  id: string;
  name: string;
  interval_minutes: number;
  source_org: { label: string };
  target_org: { label: string };
}

interface DashboardData {
  customer: { name: string; plan_tier: string };
  stats: {
    orgCount: number;
    activeSyncCount: number;
    totalSyncCount: number;
    activeMigrationCount: number;
    totalMigrationCount: number;
    recordsProcessed: number;
    successRate: number | null;
    openTickets: number;
  };
  recentActivity: ActivityItem[];
  activeSyncs: ActiveSync[];
  activeMigrations: ActiveMigration[];
}

// ─── Mini sparkline: last-7-days success vs fail bars ─────────────────────────
function ActivitySparkline({ logs }: { logs: ActivityItem[] }) {
  // Group by day (last 7 days)
  const days: { label: string; succeeded: number; failed: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const label = i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" });
    const dayLogs = logs.filter((l) => new Date(l.started_at).toDateString() === key);
    days.push({
      label,
      succeeded: dayLogs.reduce((s, l) => s + l.records_succeeded, 0),
      failed: dayLogs.reduce((s, l) => s + l.records_failed, 0),
    });
  }
  const maxVal = Math.max(...days.map((d) => d.succeeded + d.failed), 1);

  return (
    <div className="flex items-end gap-1 h-12">
      {days.map((day, i) => {
        const total = day.succeeded + day.failed;
        const successPct = total > 0 ? (day.succeeded / total) * 100 : 0;
        const barH = Math.max(2, Math.round((total / maxVal) * 44));
        const isToday = i === 6;
        return (
          <div key={day.label} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div
              className="w-full rounded-sm overflow-hidden flex flex-col justify-end"
              style={{ height: `${barH}px` }}
              title={`${day.label}: ${day.succeeded} ok, ${day.failed} failed`}
            >
              {total > 0 ? (
                <>
                  {day.failed > 0 && (
                    <div
                      className="w-full bg-red-400"
                      style={{ height: `${Math.round(100 - successPct)}%`, minHeight: 2 }}
                    />
                  )}
                  <div
                    className={`w-full ${isToday ? "gradient-bg" : "bg-primary/40"}`}
                    style={{ height: `${Math.round(successPct)}%`, minHeight: day.succeeded > 0 ? 2 : 0 }}
                  />
                </>
              ) : (
                <div className="w-full bg-muted rounded-sm" style={{ height: 4 }} />
              )}
            </div>
            <span className="text-[9px] text-muted-foreground">{day.label.slice(0, 3)}</span>
          </div>
        );
      })}
    </div>
  );
}

const STATUS_CONFIG: Record<ActivityStatus, { label: string; icon: React.ElementType; className: string }> = {
  running: { label: "Running", icon: Loader2, className: "border-blue-200 bg-blue-50 text-blue-700" },
  success: { label: "Success", icon: CheckCircle2, className: "border-green-200 bg-green-50 text-green-700" },
  partial: { label: "Partial", icon: AlertCircle, className: "border-yellow-200 bg-yellow-50 text-yellow-700" },
  failed: { label: "Failed", icon: XCircle, className: "border-red-200 bg-red-50 text-red-700" },
};

function StatusBadge({ status }: { status: ActivityStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.failed;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cfg.className}>
      <Icon className={`mr-1 h-3 w-3 ${status === "running" ? "animate-spin" : ""}`} />
      {cfg.label}
    </Badge>
  );
}

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface AnomalyResult {
  has_anomalies: boolean;
  anomalies: { sync_name: string; severity: "info" | "warning" | "critical"; message: string; suggestion: string }[];
  overall_health: "healthy" | "degraded" | "critical";
  health_summary: string;
}

const ANOMALY_CACHE_KEY = "ai_anomaly_cache_v2"; // bumped: more conservative thresholds
const ANOMALY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [anomaly, setAnomaly] = useState<AnomalyResult | null>(null);
  const [anomalyDismissed, setAnomalyDismissed] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Run anomaly check once on load, with 10-min localStorage cache
  useEffect(() => {
    try {
      const cached = localStorage.getItem(ANOMALY_CACHE_KEY);
      if (cached) {
        const { ts, result } = JSON.parse(cached);
        if (Date.now() - ts < ANOMALY_CACHE_TTL) {
          if (result.has_anomalies) setAnomaly(result);
          return;
        }
      }
    } catch { /* ignore */ }

    fetch("/api/ai/anomaly-check", { method: "POST" })
      .then((r) => r.json())
      .then((result: AnomalyResult) => {
        try {
          localStorage.setItem(ANOMALY_CACHE_KEY, JSON.stringify({ ts: Date.now(), result }));
        } catch { /* ignore */ }
        if (result.has_anomalies) setAnomaly(result);
      })
      .catch(() => { /* silent — anomaly check is best-effort */ });
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { stats, recentActivity, activeSyncs, activeMigrations } = data;
  const hasActivity = recentActivity.length > 0;
  const hasOrgs = stats.orgCount > 0;
  const hasSyncs = stats.totalSyncCount > 0;

  const statCards = [
    {
      label: "Connected Orgs",
      value: stats.orgCount,
      sub: hasOrgs ? "All connected" : "None yet",
      icon: Building2,
      href: "/orgs",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Live Syncs",
      value: stats.activeSyncCount,
      sub: stats.totalSyncCount > 0 ? `${stats.totalSyncCount} total configured` : "None configured",
      icon: ArrowLeftRight,
      href: "/syncs",
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      label: "Migrations",
      value: stats.activeMigrationCount,
      sub: stats.totalMigrationCount > 0 ? `${stats.totalMigrationCount} total configured` : "None configured",
      icon: GitBranch,
      href: "/migrations",
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
    },
    {
      label: "Records Moved",
      value: stats.recordsProcessed > 0 ? stats.recordsProcessed.toLocaleString() : "0",
      sub: "Last 30 days (syncs + migrations)",
      icon: Activity,
      href: "/logs",
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Success Rate",
      value: stats.successRate !== null ? `${stats.successRate}%` : "—",
      sub: stats.successRate !== null ? "Last 30 days" : "No data yet",
      icon: CheckCircle2,
      href: "/logs",
      iconBg: stats.successRate !== null && stats.successRate < 90 ? "bg-red-50" : "bg-green-50",
      iconColor: stats.successRate !== null && stats.successRate < 90 ? "text-red-600" : "text-green-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back{data.customer?.name ? `, ${data.customer.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening across your syncs.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDashboard} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* AI Anomaly Banner */}
      {anomaly && !anomalyDismissed && (
        <div className={cn(
          "rounded-xl border px-4 py-3 space-y-2",
          anomaly.overall_health === "critical" && "border-red-200 bg-red-50",
          anomaly.overall_health === "degraded" && "border-yellow-200 bg-yellow-50",
          anomaly.overall_health === "healthy" && "border-primary/20 bg-primary/5",
        )}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className={cn(
                  "text-sm font-semibold",
                  anomaly.overall_health === "critical" && "text-red-800",
                  anomaly.overall_health === "degraded" && "text-yellow-800",
                  anomaly.overall_health === "healthy" && "text-primary",
                )}>
                  AI Health Check
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{anomaly.health_summary}</p>
              </div>
            </div>
            <button onClick={() => setAnomalyDismissed(true)} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
              <X className="h-4 w-4" />
            </button>
          </div>
          {anomaly.anomalies.length > 0 && (
            <div className="space-y-1.5 pl-6">
              {anomaly.anomalies.map((a, i) => (
                <div key={i} className="flex items-start gap-2">
                  <TrendingDown className={cn(
                    "h-3.5 w-3.5 shrink-0 mt-0.5",
                    a.severity === "critical" && "text-red-600",
                    a.severity === "warning" && "text-yellow-600",
                    a.severity === "info" && "text-primary",
                  )} />
                  <div>
                    <p className="text-xs font-medium">{a.sync_name}: {a.message}</p>
                    <p className="text-xs text-muted-foreground">{a.suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Open ticket alert */}
      {stats.openTickets > 0 && (
        <Link href="/support">
          <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 hover:bg-yellow-100 transition-colors cursor-pointer">
            <LifeBuoy className="h-4 w-4 shrink-0" />
            <span>You have <strong>{stats.openTickets}</strong> open support ticket{stats.openTickets !== 1 ? "s" : ""} — click to view.</span>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0" />
          </div>
        </Link>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
              <CardContent className="p-6">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                  <p className="text-sm font-medium text-foreground">{stat.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{stat.sub}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            {hasActivity && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/logs">
                  View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!hasActivity ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                <RefreshCw className="h-10 w-10 text-muted-foreground/30" />
                <h3 className="mt-4 text-sm font-semibold">No activity yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {!hasOrgs
                    ? "Start by connecting a Salesforce org."
                    : !hasSyncs
                    ? "Create a Live Sync or Migration to start moving data."
                    : "Activate a sync or migration to begin."}
                </p>
                <Button size="sm" className="mt-4 gradient-bg border-0 text-white hover:opacity-90" asChild>
                  <Link href={!hasOrgs ? "/orgs" : "/syncs"}>
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    {!hasOrgs ? "Connect an Org" : "Get Started"}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {recentActivity.map((item) => {
                  const isMigration = item.activity_type === "migration";
                  const name = isMigration ? item.job?.name : item.sync_config?.name;
                  const sourceOrg = isMigration ? item.job?.source_org?.label : item.sync_config?.source_org?.label;
                  const targetOrg = isMigration ? item.job?.target_org?.label : item.sync_config?.target_org?.label;
                  const href = isMigration ? `/migrations/${item.job?.id}` : `/logs/${item.id}`;

                  return (
                    <Link key={item.id} href={href}>
                      <div className="flex items-center justify-between gap-4 py-3 hover:bg-muted/40 -mx-2 px-2 rounded transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3 min-w-0">
                          <StatusBadge status={item.status} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{name}</p>
                              <span className={cn(
                                "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide border",
                                isMigration
                                  ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                                  : "bg-purple-50 text-purple-600 border-purple-200"
                              )}>
                                {isMigration ? "Migration" : "Live Sync"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <span className="truncate">{sourceOrg}</span>
                              <ArrowRight className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{targetOrg}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm tabular-nums">
                            <span className="text-green-600">{item.records_succeeded}</span>
                            <span className="text-muted-foreground">/{item.records_processed}</span>
                            {item.records_failed > 0 && (
                              <span className="text-red-500 ml-1">({item.records_failed} failed)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatRelative(item.started_at)}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          {/* 7-day activity sparkline */}
          {hasActivity && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Last 7 Days
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ActivitySparkline logs={recentActivity} />
                <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-sm bg-primary/40" />
                    <span>Succeeded</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-sm bg-red-400" />
                    <span>Failed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active data movers — syncs + migrations */}
          {(activeSyncs.length > 0 || (activeMigrations ?? []).length > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Running Now
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {activeSyncs.slice(0, 3).map((sync) => (
                  <Link key={sync.id} href="/syncs">
                    <div className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="h-2 w-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{sync.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">
                          {sync.source_object} → {sync.target_object}
                        </p>
                      </div>
                      <span className="shrink-0 text-[9px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 rounded-full px-1.5 py-0.5">Sync</span>
                    </div>
                  </Link>
                ))}
                {(activeMigrations ?? []).slice(0, 3).map((migration) => (
                  <Link key={migration.id} href={`/migrations/${migration.id}`}>
                    <div className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 animate-pulse" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{migration.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {migration.source_org?.label} → {migration.target_org?.label}
                        </p>
                      </div>
                      <span className="shrink-0 text-[9px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-1.5 py-0.5">Migration</span>
                    </div>
                  </Link>
                ))}
                {(activeSyncs.length + (activeMigrations ?? []).length) > 6 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{activeSyncs.length + (activeMigrations ?? []).length - 6} more active
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                <Link href="/orgs">
                  <Building2 className="mr-2 h-4 w-4 text-primary" />
                  Connect a Salesforce Org
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                <Link href="/syncs/new">
                  <ArrowLeftRight className="mr-2 h-4 w-4 text-primary" />
                  New Live Sync
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                <Link href="/migrations/new">
                  <GitBranch className="mr-2 h-4 w-4 text-primary" />
                  New Migration
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                <Link href="/logs">
                  <Clock className="mr-2 h-4 w-4 text-primary" />
                  View Sync Logs
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                <Link href="/support">
                  <LifeBuoy className="mr-2 h-4 w-4 text-primary" />
                  Open Support Ticket
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
