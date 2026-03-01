"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ScrollText, CheckCircle2, XCircle, AlertCircle,
  Loader2, ChevronRight, ArrowRight, RefreshCw, ChevronDown,
  RotateCcw, Filter, Sparkles, Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type LogStatus = "running" | "success" | "partial" | "failed";

interface RecordError {
  id: string;
  source_record_id: string;
  error_message: string;
  error_code: string;
  retry_count: number;
  resolved: boolean;
}

interface SyncLogRow {
  id: string;
  status: LogStatus;
  records_processed: number;
  records_succeeded: number;
  records_failed: number;
  started_at: string;
  completed_at: string | null;
  sync_record_errors: RecordError[];
  sync_config: {
    id: string;
    name: string;
    source_object: string;
    target_object: string;
    source_org: { label: string };
    target_org: { label: string };
  };
}

const STATUS_CONFIG: Record<LogStatus, { label: string; icon: React.ElementType; className: string }> = {
  running: { label: "Running", icon: Loader2, className: "border-blue-200 bg-blue-50 text-blue-700" },
  success: { label: "Success", icon: CheckCircle2, className: "border-green-200 bg-green-50 text-green-700" },
  partial: { label: "Partial", icon: AlertCircle, className: "border-yellow-200 bg-yellow-50 text-yellow-700" },
  failed: { label: "Failed", icon: XCircle, className: "border-red-200 bg-red-50 text-red-700" },
};

const FILTER_TABS = [
  { value: "", label: "All" },
  { value: "success", label: "Success" },
  { value: "partial", label: "Partial" },
  { value: "failed", label: "Failed" },
  { value: "running", label: "Running" },
];

function StatusBadge({ status }: { status: LogStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.failed;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cn("gap-1", cfg.className)}>
      <Icon className={cn("h-3 w-3", status === "running" && "animate-spin")} />
      {cfg.label}
    </Badge>
  );
}

function formatDuration(started: string, completed: string | null): string {
  if (!completed) return "—";
  const ms = new Date(completed).getTime() - new Date(started).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface AIErrorExplanation {
  id: string;
  plain_english: string;
  suggested_fix: string;
  fix_type: string;
}

function ErrorPanel({ log, onRetried }: { log: SyncLogRow; onRetried: () => void }) {
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);
  const [aiExplaining, setAiExplaining] = useState(false);
  const [aiExplanations, setAiExplanations] = useState<AIErrorExplanation[]>([]);
  const errors = log.sync_record_errors ?? [];

  async function retryOne(errorId: string) {
    setRetrying(errorId);
    try {
      const res = await fetch(`/api/logs/${log.id}/errors/${errorId}/retry`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Record queued for retry");
      onRetried();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetrying(null);
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
            sourceObject: log.sync_config?.source_object,
            targetObject: log.sync_config?.target_object,
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

  async function retryAll() {
    setRetryingAll(true);
    try {
      const res = await fetch(`/api/logs/${log.id}/retry`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Retrying ${data.queued ?? errors.length} failed record(s)`);
      onRetried();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetryingAll(false);
    }
  }

  if (errors.length === 0) return null;

  return (
    <div className="border-t bg-red-50/50">
      <div className="flex items-center justify-between px-4 py-2.5 gap-2 flex-wrap">
        <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
          {errors.length} Failed Record{errors.length !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/5"
            onClick={explainErrors}
            disabled={aiExplaining}
          >
            {aiExplaining ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1.5 h-3 w-3" />}
            Explain with AI
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
            onClick={retryAll}
            disabled={retryingAll}
          >
            {retryingAll ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <RotateCcw className="mr-1.5 h-3 w-3" />}
            Retry All
          </Button>
        </div>
      </div>
      <div className="divide-y divide-red-100 max-h-64 overflow-y-auto">
        {errors.map((err) => {
          const explanation = aiExplanations.find((e) => e.id === err.id);
          return (
            <div key={err.id} className="px-4 py-2.5 space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground shrink-0">{err.source_record_id}</span>
                    {err.error_code && (
                      <Badge variant="outline" className="text-[10px] border-red-200 text-red-600 py-0 h-4 shrink-0">
                        {err.error_code}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-red-800 mt-0.5 leading-relaxed">{err.error_message}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 text-xs text-red-600 hover:bg-red-100 hover:text-red-700"
                  onClick={() => retryOne(err.id)}
                  disabled={retrying === err.id}
                >
                  {retrying === err.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                </Button>
              </div>
              {explanation && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 space-y-1">
                  <div className="flex items-start gap-1.5">
                    <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground">{explanation.plain_english}</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Lightbulb className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground"><strong>Fix:</strong> {explanation.suggested_fix}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LogRow({ log, onRetried }: { log: SyncLogRow; onRetried: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasErrors = (log.sync_record_errors ?? []).length > 0;

  return (
    <>
      <TableRow
        className={cn("group", hasErrors && "cursor-pointer")}
        onClick={() => hasErrors && setExpanded((v) => !v)}
      >
        <TableCell>
          <div>
            <p className="font-medium text-sm">{log.sync_config?.name}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <span>{log.sync_config?.source_org?.label}</span>
              <ArrowRight className="h-3 w-3" />
              <span>{log.sync_config?.target_org?.label}</span>
              <span className="mx-1">·</span>
              <span className="font-mono">{log.sync_config?.source_object}</span>
            </div>
          </div>
        </TableCell>
        <TableCell><StatusBadge status={log.status} /></TableCell>
        <TableCell className="text-right tabular-nums text-sm">
          <span className="text-green-600">{log.records_succeeded}</span>
          <span className="text-muted-foreground">/{log.records_processed}</span>
        </TableCell>
        <TableCell className="text-right tabular-nums text-sm">
          {log.records_failed > 0 ? (
            <span className="font-medium text-destructive">{log.records_failed}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground tabular-nums">
          {formatDuration(log.started_at, log.completed_at)}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          <span title={new Date(log.started_at).toLocaleString()}>
            {formatRelative(log.started_at)}
          </span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {hasErrors && (
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                expanded && "rotate-180"
              )} />
            )}
            <Link
              href={`/logs/${log.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </TableCell>
      </TableRow>
      {expanded && hasErrors && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={7} className="p-0">
            <ErrorPanel log={log} onRetried={onRetried} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState<SyncLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const LIMIT = 25;

  const fetchLogs = useCallback(async (off = 0, status = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
      if (status) params.set("status", status);
      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
      setOffset(off);
    } catch {
      toast.error("Failed to load sync logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(0, statusFilter); }, [fetchLogs, statusFilter]);

  function handleFilterChange(value: string) {
    setStatusFilter(value);
    setOffset(0);
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <Filter className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleFilterChange(tab.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                statusFilter === tab.value
                  ? "gradient-bg text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {total > 0 && (
            <span className="text-sm text-muted-foreground">{total} log{total !== 1 ? "s" : ""}</span>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchLogs(offset, statusFilter)} disabled={loading}>
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <ScrollText className="h-8 w-8 text-primary/50" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">
              {statusFilter ? `No ${statusFilter} logs` : "No sync logs yet"}
            </h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {statusFilter
                ? "Try a different filter or refresh to see latest activity."
                : "Once you activate a sync configuration, execution logs will appear here."}
            </p>
            {!statusFilter && (
              <Button className="mt-6 gradient-bg border-0 text-white hover:opacity-90" asChild>
                <Link href="/syncs">Go to Sync Configs</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sync</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Succeeded</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    onRetried={() => fetchLogs(offset, statusFilter)}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>

          {total > LIMIT && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchLogs(offset - LIMIT, statusFilter)} disabled={offset === 0}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => fetchLogs(offset + LIMIT, statusFilter)} disabled={offset + LIMIT >= total}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
