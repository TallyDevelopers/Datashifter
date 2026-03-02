"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, XCircle, AlertCircle, Clock,
  Loader2, RotateCcw, ArrowRight, ExternalLink, RefreshCw,
  Sparkles, Lightbulb, Settings2, Wrench, ShieldAlert,
} from "lucide-react";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type LogStatus = "running" | "success" | "partial" | "failed";

interface SyncLog {
  id: string;
  status: LogStatus;
  records_processed: number;
  records_succeeded: number;
  records_failed: number;
  error_details: Record<string, unknown> | null;
  started_at: string;
  completed_at: string | null;
  sync_config: {
    id: string;
    name: string;
    source_object: string;
    target_object: string;
    source_org: { id: string; label: string; instance_url: string };
    target_org: { id: string; label: string; instance_url: string };
  };
}

interface RecordError {
  id: string;
  source_record_id: string;
  error_message: string;
  error_code: string | null;
  retry_count: number;
  retried_at: string | null;
  resolved: boolean;
  retry_status: "pending" | "retrying" | "resolved" | "abandoned";
}

const STATUS_CONFIG: Record<LogStatus, { label: string; icon: React.ElementType; className: string }> = {
  running: { label: "Running", icon: Loader2, className: "border-blue-200 bg-blue-50 text-blue-700" },
  success: { label: "Success", icon: CheckCircle2, className: "border-green-200 bg-green-50 text-green-700" },
  partial: { label: "Partial — Some records failed", icon: AlertCircle, className: "border-yellow-200 bg-yellow-50 text-yellow-700" },
  failed: { label: "Failed", icon: XCircle, className: "border-red-200 bg-red-50 text-red-700" },
};

function formatDuration(started: string, completed: string | null): string {
  if (!completed) return "Still running";
  const ms = new Date(completed).getTime() - new Date(started).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export default function LogDetailPage({
  params,
}: {
  params: Promise<{ logId: string }>;
}) {
  const { logId } = use(params);
  const [log, setLog] = useState<SyncLog | null>(null);
  const [errors, setErrors] = useState<RecordError[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingAll, setRetryingAll] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [aiExplaining, setAiExplaining] = useState(false);
  const [aiExplanations, setAiExplanations] = useState<{
    id: string;
    plain_english: string;
    suggested_fix: string;
    fix_type: "mapping" | "permissions" | "data" | "config" | "other";
  }[]>([]);

  async function fetchDetail() {
    setLoading(true);
    try {
      const res = await fetch(`/api/logs/${logId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLog(data.log);
      setErrors(data.errors ?? []);
    } catch {
      toast.error("Failed to load log details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDetail(); }, [logId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRetryAll() {
    setRetryingAll(true);
    try {
      const res = await fetch(`/api/logs/${logId}/retry`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Retry failed");
      const msg = data.resolved > 0
        ? `${data.resolved} record${data.resolved !== 1 ? "s" : ""} resolved${data.still_failing > 0 ? `, ${data.still_failing} still failing` : ""}${data.abandoned > 0 ? `, ${data.abandoned} abandoned` : ""}`
        : data.message ?? "Retry complete";
      data.resolved > 0 ? toast.success(msg) : toast.error(msg);
      // Refresh to get updated statuses
      await fetchDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetryingAll(false);
    }
  }

  async function explainErrors() {
    setAiExplaining(true);
    try {
      const res = await fetch("/api/ai/analyze-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errors: errors.slice(0, 10).map((e) => ({
            id: e.id,
            error_code: e.error_code,
            error_message: e.error_message,
            source_record_id: e.source_record_id,
          })),
          syncConfigContext: {
            sourceObject: log?.sync_config?.source_object,
            targetObject: log?.sync_config?.target_object,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiExplanations(data.explanations ?? []);
    } catch {
      toast.error("AI explanation failed");
    } finally {
      setAiExplaining(false);
    }
  }

  async function handleRetrySingle(error: RecordError) {
    setRetryingId(error.id);
    try {
      const res = await fetch(`/api/logs/${logId}/errors/${error.id}/retry`, { method: "POST" });
      const data = await res.json();
      if (res.status === 422) {
        toast.error(data.message ?? "Retry failed");
        await fetchDetail();
        return;
      }
      if (!res.ok) throw new Error(data.error);
      if (data.resolved > 0) {
        toast.success("Record synced successfully");
      } else {
        toast.error("Retry failed — record still failing");
      }
      await fetchDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetryingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!log) return null;

  const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.failed;
  const StatusIcon = cfg.icon;
  const unresolvedErrors = errors.filter((e) => !e.resolved && e.retry_status !== "abandoned");
  const successRate = log.records_processed > 0
    ? Math.round((log.records_succeeded / log.records_processed) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Sync Logs", href: "/logs" },
          { label: log.sync_config?.name ?? "Log Detail" },
        ]}
      />
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/logs">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Logs
          </Link>
        </Button>
        {log.sync_config?.id && (
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href={`/syncs/${log.sync_config.id}/edit`}>
              <Settings2 className="mr-1.5 h-4 w-4" />
              Edit Sync Config
            </Link>
          </Button>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">{log.sync_config?.name}</h2>
            <Badge variant="outline" className={cfg.className}>
              <StatusIcon className={`mr-1 h-3 w-3 ${log.status === "running" ? "animate-spin" : ""}`} />
              {cfg.label}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{log.sync_config?.source_org?.label}</span>
            <ArrowRight className="h-3 w-3" />
            <span>{log.sync_config?.target_org?.label}</span>
            <span>·</span>
            <span className="font-mono">{log.sync_config?.source_object}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="font-mono">{log.sync_config?.target_object}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDetail}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Processed", value: log.records_processed.toLocaleString(), icon: Clock, color: "text-foreground" },
          { label: "Succeeded", value: log.records_succeeded.toLocaleString(), icon: CheckCircle2, color: "text-green-600" },
          { label: "Failed", value: log.records_failed.toLocaleString(), icon: XCircle, color: log.records_failed > 0 ? "text-destructive" : "text-muted-foreground" },
          { label: "Success Rate", value: `${successRate}%`, icon: CheckCircle2, color: successRate === 100 ? "text-green-600" : successRate > 80 ? "text-yellow-600" : "text-destructive" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Started</p>
            <p className="font-medium mt-0.5">{new Date(log.started_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="font-medium mt-0.5">{log.completed_at ? new Date(log.completed_at).toLocaleString() : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="font-medium mt-0.5">{formatDuration(log.started_at, log.completed_at)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Errors section */}
      {errors.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Failed Records
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 text-xs">
                {unresolvedErrors.length} unresolved
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {errors.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={explainErrors}
                  disabled={aiExplaining}
                  className="border-primary/30 text-primary hover:bg-primary/5"
                >
                  {aiExplaining ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                  Explain with AI
                </Button>
              )}
              {unresolvedErrors.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetryAll}
                  disabled={retryingAll}
                  className="border-primary text-primary hover:bg-primary/5"
                >
                  {retryingAll ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Retry All ({unresolvedErrors.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record ID</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-center">Retries</TableHead>
                <TableHead>Last Retry</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.map((err) => (
                <TableRow key={err.id} className={err.resolved ? "opacity-50" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`${log.sync_config?.source_org?.instance_url}/${err.source_record_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        {err.source_record_id}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                      {err.resolved && (
                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 text-xs">Resolved</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-destructive max-w-sm break-words">{err.error_message}</p>
                    {(() => {
                      const exp = aiExplanations.find((e) => e.id === err.id);
                      if (!exp) return null;
                      const syncId = log.sync_config?.id;
                      const action = (() => {
                        if (!syncId) return null;
                        if (exp.fix_type === "mapping") return { label: "Fix field mapping", href: `/syncs/${syncId}/edit?step=6`, Icon: Wrench };
                        if (exp.fix_type === "permissions") return { label: "Check org connection", href: "/orgs", Icon: ShieldAlert };
                        return { label: "Edit sync config", href: `/syncs/${syncId}/edit`, Icon: ExternalLink };
                      })();
                      return (
                        <div className="mt-1.5 rounded-lg border border-primary/20 bg-primary/5 p-2 space-y-1.5 max-w-sm">
                          <div className="flex items-start gap-1.5">
                            <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                            <p className="text-xs text-foreground leading-relaxed">{exp.plain_english}</p>
                          </div>
                          <div className="flex items-start justify-between gap-2 border-t border-primary/10 pt-1.5">
                            <div className="flex items-start gap-1.5 min-w-0">
                              <Lightbulb className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                <strong className="text-foreground">Fix:</strong> {exp.suggested_fix}
                              </p>
                            </div>
                            {action && (
                              <Link
                                href={action.href}
                                className="inline-flex shrink-0 items-center gap-1 rounded-md gradient-bg px-2.5 py-1 text-[10px] font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
                              >
                                <action.Icon className="h-2.5 w-2.5" />
                                {action.label}
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {err.error_code && (
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{err.error_code}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-sm">
                    {err.retry_count > 0 ? (
                      <span className="font-medium">{err.retry_count}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {err.retried_at
                      ? new Date(err.retried_at).toLocaleString()
                      : <span className="text-muted-foreground">—</span>
                    }
                  </TableCell>
                  <TableCell>
                    {err.resolved ? (
                      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 text-xs">Resolved</Badge>
                    ) : err.retry_status === "abandoned" ? (
                      <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 text-xs">Abandoned</Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleRetrySingle(err)}
                        disabled={retryingId === err.id}
                      >
                        {retryingId === err.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3 mr-1" />
                        )}
                        Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {errors.length === 0 && log.status === "success" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <h3 className="mt-3 font-semibold">All records synced successfully</h3>
            <p className="mt-1 text-sm text-muted-foreground">No errors to display.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
