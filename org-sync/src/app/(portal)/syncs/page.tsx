"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight, Plus, Trash2, Power, Loader2,
  ChevronRight, ArrowRight, CheckCircle2, PauseCircle,
  Sparkles, Send, Search, X, Clock, TrendingUp, AlertTriangle,
  MessageCircle, ChevronDown, Bot,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [maxSyncConfigs, setMaxSyncConfigs] = useState<number>(999);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);

  // Map of syncId → array of objects missing the tracking field
  const [missingFields, setMissingFields] = useState<Record<string, Array<{ orgId: string; orgLabel: string; object: string }>>>({});
  const [creatingField, setCreatingField] = useState<string | null>(null); // key: `${syncId}:${orgId}:${object}`

  // Keys of fields that have been successfully created this session — we skip
  // re-showing the banner for these even if Salesforce describe is still cached.
  // Stored in sessionStorage so a hard refresh resets it (field should be visible by then).
  function getCreatedKeys(): Set<string> {
    try {
      const raw = sessionStorage.getItem("orgsync_created_fields");
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  }
  function addCreatedKey(key: string) {
    try {
      const s = getCreatedKeys();
      s.add(key);
      sessionStorage.setItem("orgsync_created_fields", JSON.stringify([...s]));
    } catch { /* ignore */ }
  }

  const fetchSyncs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/syncs");
      const data = await res.json();
      const loaded: SyncConfig[] = data.syncs ?? [];
      setSyncs(loaded);

      // After loading, check tracking fields for all active syncs
      const active = loaded.filter((s) => s.is_active);
      if (active.length > 0) {
        const created = getCreatedKeys();
        const checks = await Promise.allSettled(
          active.map((s) =>
            fetch(`/api/syncs/${s.id}/tracking-field`)
              .then((r) => r.json())
              .then((d) => ({ syncId: s.id, fields: d.fields ?? [] }))
          )
        );
        const newMissing: Record<string, Array<{ orgId: string; orgLabel: string; object: string }>> = {};
        for (const check of checks) {
          if (check.status === "fulfilled") {
            const missing = (check.value.fields as Array<{ orgId: string; orgLabel: string; object: string; exists: boolean }>)
              .filter((f) => !f.exists && !created.has(`${check.value.syncId}:${f.orgId}:${f.object}`));
            if (missing.length > 0) newMissing[check.value.syncId] = missing;
          }
        }
        setMissingFields(newMissing);
      }
    } catch {
      toast.error("Failed to load sync configurations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSyncs(); }, [fetchSyncs]);

  async function handleCreateField(syncId: string, orgId: string, sobjectType: string) {
    const key = `${syncId}:${orgId}:${sobjectType}`;
    setCreatingField(key);
    try {
      const res = await fetch(`/api/syncs/${syncId}/tracking-field`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, sobjectType }),
      });
      const data = await res.json();
      if (data.status === "error") {
        toast.error(data.message ?? "Failed to create tracking field");
        return;
      }

      // Persist that this field was created so page refreshes don't re-show the banner
      // while Salesforce metadata cache is still propagating (typically < 60s)
      addCreatedKey(key);

      // Clear the banner immediately
      setMissingFields((prev) => {
        const updated = { ...prev };
        updated[syncId] = (updated[syncId] ?? []).filter(
          (f) => !(f.orgId === orgId && f.object === sobjectType)
        );
        if (updated[syncId].length === 0) delete updated[syncId];
        return updated;
      });
      toast.success(`Tracking field created on ${sobjectType} — syncs will now update records correctly`);
    } catch {
      toast.error("Failed to create tracking field");
    } finally {
      setCreatingField(null);
    }
  }

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
      toast.success(data.is_active ? `"${sync.name}" is now active` : `"${sync.name}" paused`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle sync");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleChatSend(overrideMessage?: string) {
    const message = (overrideMessage ?? chatInput).trim();
    if (!message || chatLoading) return;
    setChatInput("");

    const userMsg: ChatMessage = { role: "user", content: message };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatLoading(true);

    // Scroll to bottom
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const res = await fetch("/api/ai/sync-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: chatMessages.slice(-10), // send prior turns for context
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChatMessages([...newHistory, { role: "assistant", content: data.reply }]);
    } catch {
      setChatMessages([...newHistory, {
        role: "assistant",
        content: "Sorry, I ran into an issue. Please try again.",
      }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        chatInputRef.current?.focus();
      }, 50);
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
            onClick={() => { setChatOpen(true); setTimeout(() => chatInputRef.current?.focus(), 100); }}
          >
            <MessageCircle className="h-4 w-4" />
            Ask AI
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

                    {/* Tracking field warning — shown when field is missing */}
                    {(missingFields[sync.id] ?? []).map((missing) => (
                      <div
                        key={`${missing.orgId}:${missing.object}`}
                        className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-amber-800">
                            Tracking field missing on <span className="font-mono">{missing.object}</span> in {missing.orgLabel}
                          </p>
                          <p className="mt-0.5 text-amber-700 leading-relaxed">
                            OrgSync uses a custom field <span className="font-mono">OrgSync_Source_Id__c</span> to know which records to update vs create. Without it, every sync run may create duplicate records instead of updating existing ones.
                          </p>
                        </div>
                        <button
                          onClick={() => handleCreateField(sync.id, missing.orgId, missing.object)}
                          disabled={creatingField === `${sync.id}:${missing.orgId}:${missing.object}`}
                          className="shrink-0 flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
                        >
                          {creatingField === `${sync.id}:${missing.orgId}:${missing.object}` ? (
                            <><Loader2 className="h-3 w-3 animate-spin" />Creating…</>
                          ) : (
                            <>Create Field</>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Actions — always visible */}
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1.5">
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
                      {togglingId === sync.id && !sync.is_active ? "Setting up…" : sync.is_active ? "Pause" : "Activate"}
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── AI Sync Assistant Chat Panel ─────────────────────────────── */}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b rounded-t-2xl bg-primary/5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">Sync Assistant</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Knows your syncs, orgs &amp; logs</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {chatMessages.length > 0 && (
                <button
                  onClick={() => setChatMessages([])}
                  className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setChatOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-[360px] min-h-[200px]">
            {chatMessages.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center py-2">Ask anything about your syncs</p>
                {[
                  "Are any of my syncs likely to create duplicates?",
                  "What happens with my Account sync — is it bidirectional?",
                  "Why might my last sync have partial failures?",
                  "Are there any issues with my current field mappings?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleChatSend(q)}
                    className="w-full text-left rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary hover:bg-primary/10 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    )}
                  >
                    {msg.content.split("\n").map((line, j) => (
                      <span key={j}>
                        {line}
                        {j < msg.content.split("\n").length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Input
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleChatSend()}
                placeholder="Ask about your syncs…"
                className="flex-1 h-9 text-sm border-0 bg-muted/50 focus-visible:ring-1"
                disabled={chatLoading}
              />
              <Button
                size="icon"
                className="h-9 w-9 gradient-bg border-0 text-white hover:opacity-90 shrink-0"
                onClick={() => handleChatSend()}
                disabled={chatLoading || !chatInput.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

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
