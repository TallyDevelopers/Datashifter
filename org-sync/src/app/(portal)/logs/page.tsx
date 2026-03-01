"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ScrollText, CheckCircle2, XCircle, Clock, AlertCircle,
  Loader2, ChevronRight, ArrowRight, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type LogStatus = "running" | "success" | "partial" | "failed";

interface SyncLogRow {
  id: string;
  status: LogStatus;
  records_processed: number;
  records_succeeded: number;
  records_failed: number;
  started_at: string;
  completed_at: string | null;
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

function StatusBadge({ status }: { status: LogStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.failed;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cfg.className}>
      <Icon className={`mr-1 h-3 w-3 ${status === "running" ? "animate-spin" : ""}`} />
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
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<SyncLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 25;

  const fetchLogs = useCallback(async (off = 0) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logs?limit=${LIMIT}&offset=${off}`);
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

  useEffect(() => { fetchLogs(0); }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {total > 0 && <span>{total} total log{total !== 1 ? "s" : ""}</span>}
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLogs(0)} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
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
            <h3 className="mt-4 text-lg font-semibold">No sync logs yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Once you activate a sync configuration, execution logs will appear here with detailed status and error information.
            </p>
            <Button className="mt-6 gradient-bg border-0 text-white hover:opacity-90" asChild>
              <Link href="/syncs">Go to Sync Configs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sync</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Processed</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="group cursor-pointer hover:bg-muted/50">
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
                      <Link
                        href={`/logs/${log.id}`}
                        className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </TableCell>
                  </TableRow>
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
                <Button variant="outline" size="sm" onClick={() => fetchLogs(offset - LIMIT)} disabled={offset === 0}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => fetchLogs(offset + LIMIT)} disabled={offset + LIMIT >= total}>
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
