"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, GitBranch, ArrowRight, Clock, CheckCircle2, XCircle,
  AlertTriangle, Loader2, Play, Pause, Trash2, ChevronRight,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConnectedOrg {
  id: string;
  label: string;
  is_sandbox: boolean;
}

interface JobStep {
  id: string;
  step_order: number;
  label: string;
  source_object: string;
  target_object: string;
}

interface JobRun {
  id: string;
  status: "running" | "success" | "partial" | "failed";
  started_at: string;
  completed_at: string | null;
}

interface CpqJob {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  interval_minutes: number;
  last_run_at: string | null;
  created_at: string;
  source_org: ConnectedOrg;
  target_org: ConnectedOrg;
  cpq_job_objects: JobStep[];
  cpq_job_runs: JobRun[];
}

function statusBadge(run?: JobRun) {
  if (!run) return <Badge variant="outline" className="text-muted-foreground">Never run</Badge>;
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    running: { label: "Running", className: "bg-blue-50 text-blue-700 border-blue-200", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    success: { label: "Success", className: "bg-green-50 text-green-700 border-green-200", icon: <CheckCircle2 className="h-3 w-3" /> },
    partial: { label: "Partial", className: "bg-amber-50 text-amber-700 border-amber-200", icon: <AlertTriangle className="h-3 w-3" /> },
    failed: { label: "Failed", className: "bg-red-50 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3" /> },
  };
  const s = map[run.status] ?? map.failed;
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

export default function CpqPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<CpqJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cpq");
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadJobs(); }, []);

  const toggleActive = async (job: CpqJob) => {
    setTogglingId(job.id);
    await fetch(`/api/cpq/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !job.is_active }),
    });
    await loadJobs();
    setTogglingId(null);
  };

  const deleteJob = async (jobId: string) => {
    if (!confirm("Delete this integration job? This cannot be undone.")) return;
    setDeletingId(jobId);
    await fetch(`/api/cpq/${jobId}`, { method: "DELETE" });
    await loadJobs();
    setDeletingId(null);
  };

  const triggerRun = async (jobId: string) => {
    await fetch(`/api/cpq/${jobId}/run`, { method: "POST" });
    await loadJobs();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CPQ & RCA Integration Jobs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dependency-aware sync jobs for Salesforce CPQ, Revenue Cloud Advanced, and complex object graphs.
          </p>
        </div>
        <Button className="gradient-bg border-0 text-white hover:opacity-90" asChild>
          <Link href="/cpq/new">
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Link>
        </Button>
      </div>

      {/* What is this? banner for first-timers */}
      {jobs.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/3 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg mb-4">
            <GitBranch className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-lg font-semibold">No integration jobs yet</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            CPQ & RCA jobs let you sync related objects in the correct dependency order — so foreign keys are never broken.
            Perfect for syncing Product2 → Pricebook → PricebookEntry → Quotes → Quote Lines.
          </p>
          <Button className="gradient-bg border-0 text-white hover:opacity-90 mt-6" asChild>
            <Link href="/cpq/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Job
            </Link>
          </Button>
        </div>
      )}

      {/* Job cards */}
      <div className="space-y-4">
        {jobs.map((job) => {
          const lastRun = job.cpq_job_runs?.[0];
          const steps = [...(job.cpq_job_objects ?? [])].sort((a, b) => a.step_order - b.step_order);
          const totalMappings = 0; // we don't fetch this in list view

          return (
            <Card key={job.id} className="border-primary/5 hover:shadow-md hover:shadow-primary/5 transition-all">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <GitBranch className="h-5 w-5 text-primary" />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link href={`/cpq/${job.id}`} className="text-base font-semibold hover:text-primary transition-colors">
                        {job.name}
                      </Link>
                      <Badge variant={job.is_active ? "default" : "secondary"} className={cn(
                        "text-xs",
                        job.is_active ? "gradient-bg border-0 text-white" : ""
                      )}>
                        {job.is_active ? "Active" : "Paused"}
                      </Badge>
                      {statusBadge(lastRun)}
                    </div>

                    {job.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{job.description}</p>
                    )}

                    {/* Org flow */}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="rounded-md bg-muted px-2 py-0.5 font-medium">{job.source_org?.label}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="rounded-md bg-muted px-2 py-0.5 font-medium">{job.target_org?.label}</span>
                    </div>

                    {/* Object chain preview */}
                    {steps.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
                        {steps.map((s, i) => (
                          <span key={s.id} className="flex items-center gap-1">
                            <span className="text-xs bg-muted rounded px-1.5 py-0.5">{s.label || s.source_object}</span>
                            {i < steps.length - 1 && <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {intervalLabel(job.interval_minutes)}
                      </span>
                      {job.last_run_at && (
                        <span>Last run {new Date(job.last_run_at).toLocaleString()}</span>
                      )}
                      <span>{steps.length} step{steps.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => triggerRun(job.id)}
                      title="Run now"
                    >
                      <Play className="h-3.5 w-3.5 mr-1" />
                      Run
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={togglingId === job.id}
                      onClick={() => toggleActive(job)}
                    >
                      {togglingId === job.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : job.is_active ? (
                        <><Pause className="h-3.5 w-3.5 mr-1" />Pause</>
                      ) : (
                        <><Play className="h-3.5 w-3.5 mr-1" />Activate</>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => router.push(`/cpq/${job.id}`)}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={deletingId === job.id}
                      onClick={() => deleteJob(job.id)}
                    >
                      {deletingId === job.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
