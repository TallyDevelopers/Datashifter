"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight, Plus, Trash2, Power, Loader2,
  ChevronRight, ArrowRight, CheckCircle2, PauseCircle,
  Sparkles, Send, Search, X, Clock, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ConnectedOrgRef {
  id: string;
  label: string;
  is_sandbox: boolean;
}

interface LastRun {
  id: string;
  status: "running" | "success" | "partial" | "failed";
  records_succeeded: number;
  records_failed: number;
  records_processed: number;
  started_at: string;
  completed_at: string | null;
}

interface SyncConfig {
  id: string;
  name: string;
  direction: "one_way" | "bidirectional";
  is_active: boolean;
  created_at: string;
  trigger_on_create: boolean;
  trigger_on_update: boolean;
  trigger_on_delete: boolean;
  source_object: string;
  target_object: string;
  source_org: ConnectedOrgRef;
  target_org: ConnectedOrgRef;
  sync_logs?: LastRun[];
  ai_summary?: string | null;
}

const STATUS_COLORS = {
  success: "text-green-600",
  partial: "text-yellow-600",
  failed: "text-red-600",
  running: "text-blue-600",
};

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function LastRunBadge({ logs }: { logs?: LastRun[] }) {
  const last = logs?.[0];
  if (!last) return <span className="text-xs text-muted-foreground">Never run</span>;

  const statusColor = STATUS_COLORS[last.status] ?? "text-muted-foreground";
  const label =
    last.status === "success" ? `${last.records_succeeded} synced` :
    last.status === "partial" ? `${last.records_succeeded} ok, ${last.records_failed} failed` :
    last.status === "failed" ? `${last.records_failed} failed` :
    "Running…";

  return (
    <div className="flex items-center gap-1.5">
      <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground">{formatRelative(last.started_at)}</span>
      <span className="text-muted-foreground text-xs">·</span>
      <span className={cn("text-xs font-medium", statusColor)}>{label}</span>
    </div>
  );
}

function TriggerBadges({ sync }: { sync: SyncConfig }) {
  const triggers = [
    sync.trigger_on_create && "Create",
    sync.trigger_on_update && "Update",
    sync.trigger_on_delete && "Delete",
  ].filter(Boolean) as string[];
  return (
    <div className="flex gap-1 flex-wrap">
      {triggers.map((t) => (
        <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
      ))}
    </div>
  );
}

function plainEnglishSummary(sync: SyncConfig): string {
  const srcOrg = sync.source_org?.label ?? "source org";
  const tgtOrg = sync.target_org?.label ?? "target org";
  const srcObj = sync.source_object;
  const tgtObj = sync.target_object;

  const events: string[] = [];
  if (sync.trigger_on_create) events.push("created");
  if (sync.trigger_on_update) events.push("updated");
  if (sync.trigger_on_delete) events.push("deleted");

  const eventStr = events.length === 0
    ? "changed"
    : events.length === 1
    ? events[0]
    : events.slice(0, -1).join(", ") + " or " + events[events.length - 1];

  if (sync.direction === "bidirectional") {
    return `Whenever a ${srcObj} record is ${eventStr} in either "${srcOrg}" or "${tgtOrg}", the change is mirrored to the other org as a ${tgtObj} record.`;
  }

  return `Whenever a ${srcObj} record is ${eventStr} in "${srcOrg}", it is synced to "${tgtOrg}" as a ${tgtObj} record.`;
}

export default function SyncsPage() {
  const router = useRouter();
  const [syncs, setSyncs] = useState<SyncConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteSync, setDeleteSync] = useState<SyncConfig | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [nlOpen, setNlOpen] = useState(false);
  const [nlPrompt, setNlPrompt] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlResult, setNlResult] = useState<{
    understood: boolean;
    summary: string;
    clarification_needed: string | null;
    config: Record<string, unknown> | null;
  } | null>(null);
  const [maxSyncConfigs, setMaxSyncConfigs] = useState<number>(999);

  const fetchSyncs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/syncs");
      const data = await res.json();
      setSyncs(data.syncs ?? []);
    } catch {
      toast.error("Failed to load sync configurations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSyncs(); }, [fetchSyncs]);

  // Load plan limits
  useEffect(() => {
    fetch("/api/plan-features")
      .then((r) => r.json())
      .then((pf) => { if (pf?.max_sync_configs) setMaxSyncConfigs(pf.max_sync_configs); })
      .catch(() => {});
  }, []);

  async function handleToggle(sync: SyncConfig) {
    setTogglingId(sync.id);
    try {
      const res = await fetch(`/api/syncs/${sync.id}/activate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSyncs((prev) => prev.map((s) => s.id === sync.id ? { ...s, is_active: data.is_active } : s));
      toast.success(data.is_active ? `"${sync.name}" activated` : `"${sync.name}" paused`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle sync");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleNLSubmit() {
    if (!nlPrompt.trim()) return;
    setNlLoading(true);
    setNlResult(null);
    try {
      const orgsRes = await fetch("/api/salesforce/orgs");
      const orgsData = await orgsRes.json();
      const res = await fetch("/api/ai/natural-language-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: nlPrompt, availableOrgs: orgsData.orgs ?? [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNlResult(data);
      if (data.understood && data.config) {
        sessionStorage.setItem("nl_prefill", JSON.stringify(data.config));
        toast.success("AI understood your request — opening the sync builder pre-filled");
        setNlOpen(false);
        router.push("/syncs/new?prefill=1");
      }
    } catch {
      toast.error("AI failed to parse your request");
    } finally {
      setNlLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteSync) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/syncs/${deleteSync.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSyncs((prev) => prev.filter((s) => s.id !== deleteSync.id));
      toast.success(`"${deleteSync.name}" deleted`);
      setDeleteSync(null);
    } catch {
      toast.error("Failed to delete sync");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = search.trim()
    ? syncs.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.source_object.toLowerCase().includes(search.toLowerCase()) ||
        s.target_object.toLowerCase().includes(search.toLowerCase()) ||
        s.source_org?.label.toLowerCase().includes(search.toLowerCase()) ||
        s.target_org?.label.toLowerCase().includes(search.toLowerCase())
      )
    : syncs;

  const activeCount = syncs.filter((s) => s.is_active).length;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => { setNlOpen(true); setNlResult(null); setNlPrompt(""); }}
          >
            <Sparkles className="h-4 w-4" />
            Describe with AI
          </Button>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search syncs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-48 rounded-md border bg-background pl-8 pr-7 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {syncs.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{activeCount} active</span>
            </div>
          )}
          {syncs.length >= maxSyncConfigs ? (
            <div className="relative group">
              <Button className="gradient-bg border-0 text-white opacity-50 cursor-not-allowed" disabled>
                <Plus className="mr-2 h-4 w-4" />
                New Sync Config
              </Button>
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:flex whitespace-nowrap rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md flex-col gap-1 z-10">
                <span className="font-semibold">Sync limit reached ({syncs.length}/{maxSyncConfigs})</span>
                <a href="/pricing" target="_blank" className="text-primary underline">Upgrade your plan</a>
              </div>
            </div>
          ) : (
            <Button className="gradient-bg border-0 text-white hover:opacity-90" asChild>
              <Link href="/syncs/new">
                <Plus className="mr-2 h-4 w-4" />
                New Sync Config
              </Link>
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : syncs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <ArrowLeftRight className="h-8 w-8 text-primary/50" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No sync configurations</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Create your first sync to start mapping and syncing data between your connected Salesforce orgs.
            </p>
            <Button className="mt-6 gradient-bg border-0 text-white hover:opacity-90" asChild>
              <Link href="/syncs/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Sync
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-3 font-semibold">No results for &ldquo;{search}&rdquo;</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try a different name, org, or object.</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setSearch("")}>Clear search</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((sync) => (
            <Card key={sync.id} className="transition-all duration-200 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{sync.name}</h3>
                      {sync.is_active ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 border">
                          <CheckCircle2 className="mr-1 h-3 w-3" />Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <PauseCircle className="mr-1 h-3 w-3" />Inactive
                        </Badge>
                      )}
                      {sync.direction === "bidirectional" && (
                        <Badge variant="secondary" className="text-xs">Bidirectional</Badge>
                      )}
                    </div>

                    {/* Plain-English description — AI-generated when available */}
                    <p className="mt-1.5 text-sm text-muted-foreground leading-snug flex items-start gap-1.5">
                      {sync.ai_summary ? (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-primary/60 shrink-0 mt-0.5" />
                          <span>{sync.ai_summary}</span>
                        </>
                      ) : (
                        plainEnglishSummary(sync)
                      )}
                    </p>

                    {/* Org flow */}
                    <div className="mt-2.5 flex items-center gap-2 text-sm flex-wrap">
                      <div className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1">
                        <span className="font-medium text-xs text-muted-foreground">FROM</span>
                        <span className="font-semibold text-xs">{sync.source_org?.label}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono text-xs">{sync.source_object}</span>
                        {sync.source_org?.is_sandbox && <Badge variant="secondary" className="text-[10px] px-1 py-0">SB</Badge>}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <ArrowRight className="h-4 w-4 text-primary" />
                        {sync.direction === "bidirectional" && (
                          <ArrowRight className="h-4 w-4 text-primary rotate-180" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1">
                        <span className="font-medium text-xs text-muted-foreground">TO</span>
                        <span className="font-semibold text-xs">{sync.target_org?.label}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono text-xs">{sync.target_object}</span>
                        {sync.target_org?.is_sandbox && <Badge variant="secondary" className="text-[10px] px-1 py-0">SB</Badge>}
                      </div>
                    </div>

                    {/* Triggers + last run */}
                    <div className="mt-2.5 flex items-center gap-3 flex-wrap">
                      <TriggerBadges sync={sync} />
                      <span className="text-muted-foreground/40 text-xs">·</span>
                      <LastRunBadge logs={sync.sync_logs} />
                    </div>
                  </div>

                  {/* Actions — always visible */}
                  <div className="flex shrink-0 flex-col sm:flex-row items-end sm:items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(sync)}
                      disabled={togglingId === sync.id}
                      className={cn(
                        "h-8 text-xs",
                        sync.is_active
                          ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                          : "border-green-300 text-green-700 hover:bg-green-50"
                      )}
                    >
                      {togglingId === sync.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Power className="mr-1 h-3 w-3" />
                      )}
                      {sync.is_active ? "Pause" : "Activate"}
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                      <Link href={`/syncs/${sync.id}/edit`}>Edit</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteSync(sync)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Natural Language Sync Dialog */}
      <Dialog open={nlOpen} onOpenChange={setNlOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Describe your sync
            </DialogTitle>
            <DialogDescription>
              Tell AI what you want to sync in plain English. It will build the configuration for you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">Examples:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• &ldquo;Sync Accounts to Contacts when a record is created, map Name to LastName&rdquo;</li>
                <li>• &ldquo;Bidirectional sync of Opportunities between both orgs on create and update&rdquo;</li>
                <li>• &ldquo;Copy Leads to Contacts when created, map Email to Email and Phone to Phone&rdquo;</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Describe what you want to sync..."
                value={nlPrompt}
                onChange={(e) => setNlPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !nlLoading && handleNLSubmit()}
                className="flex-1"
                autoFocus
              />
              <Button
                onClick={handleNLSubmit}
                disabled={nlLoading || !nlPrompt.trim()}
                className="gradient-bg border-0 text-white hover:opacity-90 shrink-0"
              >
                {nlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            {nlResult && !nlResult.understood && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
                <p className="text-sm font-medium text-yellow-800 mb-1">Need a bit more detail</p>
                <p className="text-sm text-yellow-700">{nlResult.clarification_needed ?? "Could you be more specific about the objects and fields?"}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteSync} onOpenChange={(open) => !open && setDeleteSync(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteSync?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this sync configuration, all sync logs, and all record mappings. Active syncs will stop immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
