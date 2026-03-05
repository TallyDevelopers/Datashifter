"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, GitBranch, ArrowRight, Clock, CheckCircle2, XCircle,
  AlertTriangle, Loader2, Play, Pause, Trash2, Layers,
  ChevronDown, ChevronUp, SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RunStep {
  id: string;
  step_order: number;
  source_object: string;
  target_object: string;
  status: "pending" | "running" | "success" | "partial" | "failed" | "skipped";
  records_queried: number;
  records_succeeded: number;
  records_failed: number;
  error_details: unknown;
  skip_reason: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface JobRun {
  id: string;
  status: "running" | "success" | "partial" | "failed";
  triggered_by: "schedule" | "manual";
  started_at: string;
  completed_at: string | null;
  cpq_job_run_steps: RunStep[];
}

interface JobStep {
  id: string;
  step_order: number;
  label: string;
  source_object: string;
  target_object: string;
  field_mappings: unknown[];
  filters: unknown[];
}

interface CpqJobDetail {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  interval_minutes: number;
  last_run_at: string | null;
  created_at: string;
  source_org: { id: string; label: string; is_sandbox: boolean };
  target_org: { id: string; label: string; is_sandbox: boolean };
  cpq_job_objects: JobStep[];
  runs: JobRun[];
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    running: { label: "Running", className: "bg-blue-50 text-blue-700 border-blue-200", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    success: { label: "Success", className: "bg-green-50 text-green-700 border-green-200", icon: <CheckCircle2 className="h-3 w-3" /> },
    partial: { label: "Partial", className: "bg-amber-50 text-amber-700 border-amber-200", icon: <AlertTriangle className="h-3 w-3" /> },
    failed: { label: "Failed", className: "bg-red-50 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3" /> },
    pending: { label: "Pending", className: "bg-muted text-muted-foreground", icon: <Clock className="h-3 w-3" /> },
    skipped: { label: "Skipped", className: "bg-muted text-muted-foreground", icon: <SkipForward className="h-3 w-3" /> },
  };
  const s = map[status] ?? map.failed;
  return (
    <Badge variant="outline" className={cn("flex items-center gap-1", s.className)}>
      {s.icon}
      {s.label}
    </Badge>
  );
}

function intervalLabel(minutes: number) {
  if (minutes === 0) return "Manual only";
  if (minutes < 60) return `Every ${minutes}m`;
  if (minutes === 60) return "Every hour";
  if (minutes < 1440) return `Every ${minutes / 60}h`;
  return "Every 24h";
}

function duration(started: string | null, completed: string | null) {
  if (!started) return "";
  const s = new Date(started).getTime();
  const e = completed ? new Date(completed).getTime() : Date.now();
  const ms = e - s;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m`;
}

export default function CpqJobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<CpqJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadJob = async () => {
    const res = await fetch(`/api/migrations/${jobId}`);
    const data = await res.json();
    setJob(data.job ?? null);
    setLoading(false);
  };

  useEffect(() => { loadJob(); }, [jobId]);

  const triggerRun = async () => {
    setRunning(true);
    await fetch(`/api/migrations/${jobId}/run`, { method: "POST" });
    await loadJob();
    setRunning(false);
  };

  const toggleActive = async () => {
    if (!job) return;
    setToggling(true);
    await fetch(`/api/migrations/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !job.is_active }),
    });
    await loadJob();
    setToggling(false);
  };

  const deleteJob = async () => {
    if (!confirm("Delete this job? All run history will be lost.")) return;
    setDeleting(true);
    await fetch(`/api/migrations/${jobId}`, { method: "DELETE" });
    router.push("/migrations");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">Job not found.</p>
        <Link href="/migrations" className="text-primary text-sm underline mt-2 inline-block">Back to Migrations</Link>
      </div>
    );
  }

  const steps = [...(job.cpq_job_objects ?? [])].sort((a, b) => a.step_order - b.step_order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/migrations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Migrations
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{job.name}</h1>
              {job.description && <p className="text-sm text-muted-foreground mt-0.5">{job.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={triggerRun} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Run Now
            </Button>
            <Button size="sm" variant="outline" onClick={toggleActive} disabled={toggling}>
              {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : job.is_active ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {job.is_active ? "Pause" : "Activate"}
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={deleteJob} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Status", value: <Badge variant={job.is_active ? "default" : "secondary"} className={cn(job.is_active ? "gradient-bg border-0 text-white" : "")}>{job.is_active ? "Active" : "Paused"}</Badge> },
          { label: "Schedule", value: intervalLabel(job.interval_minutes) },
          { label: "Steps", value: `${steps.length} objects` },
          { label: "Last run", value: job.last_run_at ? new Date(job.last_run_at).toLocaleDateString() : "Never" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <div className="text-sm font-semibold mt-1">{value}</div>
          </div>
        ))}
      </div>

      {/* Org flow */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Org Flow</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">{job.source_org?.label}</div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">{job.target_org?.label}</div>
          </div>
        </CardContent>
      </Card>

      {/* Object chain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Execution Order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-bg text-xs font-bold text-white">
                {s.step_order}
              </div>
              <div className="flex-1 rounded-xl border bg-muted/30 px-4 py-2.5">
                <p className="text-sm font-medium">{s.label || s.source_object}</p>
                <p className="text-xs text-muted-foreground">{s.source_object} → {s.target_object} · {(s.field_mappings as unknown[]).length} fields mapped</p>
              </div>
              {i < steps.length - 1 && (
                <div className="flex h-5 w-7 items-center justify-center">
                  <div className="h-full w-px border-l-2 border-dashed border-primary/20" />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Run history */}
      <Card>
        <CardHeader>
          <CardTitle>Run History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {job.runs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No runs yet. Trigger one manually or activate the schedule.</p>
          ) : (
            job.runs.map((run) => {
              const isExpanded = expandedRuns.has(run.id);
              const runSteps = [...(run.cpq_job_run_steps ?? [])].sort((a, b) => a.step_order - b.step_order);
              return (
                <div key={run.id} className="rounded-xl border overflow-hidden">
                  <button
                    onClick={() => setExpandedRuns((prev) => {
                      const next = new Set(prev);
                      next.has(run.id) ? next.delete(run.id) : next.add(run.id);
                      return next;
                    })}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                  >
                    {statusBadge(run.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{new Date(run.started_at).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{run.triggered_by} · {duration(run.started_at, run.completed_at)}</p>
                    </div>
                    {runSteps.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {runSteps.filter((s) => s.status === "success").length}/{runSteps.length} steps OK
                      </p>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>

                  {isExpanded && runSteps.length > 0 && (
                    <div className="border-t px-4 py-3 space-y-2 bg-muted/10">
                      {runSteps.map((rs) => (
                        <div key={rs.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                            {rs.step_order}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{rs.source_object} → {rs.target_object}</p>
                            {rs.status === "skipped" && rs.skip_reason && (
                              <p className="text-[10px] text-muted-foreground">Skipped: {rs.skip_reason}</p>
                            )}
                            {(rs.status === "success" || rs.status === "partial") && (
                              <p className="text-[10px] text-muted-foreground">
                                {rs.records_succeeded} succeeded · {rs.records_failed} failed · {duration(rs.started_at, rs.completed_at)}
                              </p>
                            )}
                          </div>
                          {statusBadge(rs.status)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
