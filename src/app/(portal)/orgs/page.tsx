"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Pencil,
  Database,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface ConnectedOrg {
  id: string;
  org_id: string;
  instance_url: string;
  label: string;
  is_sandbox: boolean;
  status: "active" | "disconnected" | "error";
  connected_at: string;
  object_count?: number;
}

function StatusBadge({ status }: { status: ConnectedOrg["status"] }) {
  if (status === "active") {
    return (
      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Active
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
        <AlertCircle className="mr-1 h-3 w-3" />
        Error
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-700">
      <AlertCircle className="mr-1 h-3 w-3" />
      Disconnected
    </Badge>
  );
}

function OrgCard({
  org,
  onDisconnect,
  onRename,
  onReconnect,
  onSyncMetadata,
  syncingMetadata,
}: {
  org: ConnectedOrg;
  onDisconnect: (org: ConnectedOrg) => void;
  onRename: (org: ConnectedOrg) => void;
  onReconnect: (org: ConnectedOrg) => void;
  onSyncMetadata: (org: ConnectedOrg) => void;
  syncingMetadata: boolean;
}) {
  const connectedDate = new Date(org.connected_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className="group transition-all duration-200 hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl gradient-bg shadow-md shadow-primary/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base">{org.label}</h3>
                {org.is_sandbox && (
                  <Badge variant="secondary" className="text-xs">Sandbox</Badge>
                )}
                <StatusBadge status={org.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground font-mono">
                {org.org_id}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <a
                  href={org.instance_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  {org.instance_url.replace("https://", "")}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span>&middot;</span>
                <span>Connected {connectedDate}</span>
                {org.object_count !== undefined && org.object_count > 0 && (
                  <>
                    <span>&middot;</span>
                    <Link
                      href={`/orgs/${org.id}/objects`}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <Database className="h-3 w-3" />
                      {org.object_count} objects
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            {org.status === "active" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => onSyncMetadata(org)}
                disabled={syncingMetadata}
                title="Sync object and field metadata from this org"
              >
                {syncingMetadata ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Database className="h-3 w-3" />
                )}
                {org.object_count ? "Refresh Metadata" : "Sync Metadata"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onRename(org)}
              title="Rename"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {org.status !== "active" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary"
                onClick={() => onReconnect(org)}
                title="Reconnect"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDisconnect(org)}
              title="Disconnect"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OrgsPageContent() {
  const searchParams = useSearchParams();
  const [orgs, setOrgs] = useState<ConnectedOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectOpen, setConnectOpen] = useState(false);
  const [disconnectOrg, setDisconnectOrg] = useState<ConnectedOrg | null>(null);
  const [renameOrg, setRenameOrg] = useState<ConnectedOrg | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncingOrgId, setSyncingOrgId] = useState<string | null>(null);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/salesforce/orgs");
      const data = await res.json();
      const orgsData: ConnectedOrg[] = data.orgs ?? [];

      // Fetch object counts for each org in parallel
      const withCounts = await Promise.all(
        orgsData.map(async (org) => {
          try {
            const objRes = await fetch(`/api/salesforce/orgs/${org.id}/objects`);
            const objData = await objRes.json();
            return { ...org, object_count: objData.objects?.length ?? 0 };
          } catch {
            return { ...org, object_count: 0 };
          }
        })
      );

      setOrgs(withCounts);
    } catch {
      toast.error("Failed to load connected orgs");
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleSyncMetadata(org: ConnectedOrg) {
    setSyncingOrgId(org.id);
    try {
      const res = await fetch(`/api/salesforce/orgs/${org.id}/sync-metadata`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Synced ${data.objectCount} objects from "${org.label}"`);
      setOrgs((prev) =>
        prev.map((o) =>
          o.id === org.id ? { ...o, object_count: data.objectCount } : o
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Metadata sync failed");
    } finally {
      setSyncingOrgId(null);
    }
  }

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  // Handle redirect feedback from OAuth callback
  useEffect(() => {
    const connected = searchParams.get("connected");
    const reconnected = searchParams.get("reconnected");
    const error = searchParams.get("error");

    if (connected) {
      toast.success("Salesforce org connected successfully!");
      fetchOrgs();
    } else if (reconnected) {
      toast.success("Org reconnected and tokens refreshed.");
      fetchOrgs();
    } else if (error) {
      const messages: Record<string, string> = {
        config_missing: "Server configuration error. Contact support.",
        missing_params: "Invalid OAuth response from Salesforce.",
        invalid_state: "Security check failed. Please try again.",
        state_expired: "Connection attempt timed out. Please try again.",
        user_mismatch: "Authentication error. Please log in again.",
        customer_not_found: "Account error. Please contact support.",
        connection_failed: "Failed to connect org. Please try again.",
      };
      toast.error(messages[error] ?? `Connection failed: ${error}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDisconnect() {
    if (!disconnectOrg) return;
    setDisconnecting(true);
    try {
      const res = await fetch(`/api/salesforce/orgs/${disconnectOrg.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success(`"${disconnectOrg.label}" disconnected.`);
      setOrgs((prev) => prev.filter((o) => o.id !== disconnectOrg.id));
    } catch {
      toast.error("Failed to disconnect org. Please try again.");
    } finally {
      setDisconnecting(false);
      setDisconnectOrg(null);
    }
  }

  async function handleRename() {
    if (!renameOrg || !renameValue.trim()) return;
    setRenaming(true);
    try {
      const res = await fetch(`/api/salesforce/orgs/${renameOrg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: renameValue.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Org renamed successfully.");
      setOrgs((prev) =>
        prev.map((o) =>
          o.id === renameOrg.id ? { ...o, label: renameValue.trim() } : o
        )
      );
      setRenameOrg(null);
    } catch {
      toast.error("Failed to rename org.");
    } finally {
      setRenaming(false);
    }
  }

  function handleReconnect(org: ConnectedOrg) {
    const env = org.is_sandbox ? "sandbox" : "production";
    window.location.href = `/api/salesforce/connect?env=${env}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button
          className="gradient-bg border-0 text-white hover:opacity-90"
          onClick={() => setConnectOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Connect Org
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : orgs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-8 w-8 text-primary/50" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No connected orgs</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Connect your first Salesforce org with one click. No Connected App
              setup required on your end — just log in and authorize.
            </p>
            <Button
              className="mt-6 gradient-bg border-0 text-white hover:opacity-90"
              onClick={() => setConnectOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Connect Your First Org
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orgs.map((org) => (
            <OrgCard
              key={org.id}
              org={org}
              onDisconnect={setDisconnectOrg}
              onRename={(org) => {
                setRenameOrg(org);
                setRenameValue(org.label);
              }}
              onReconnect={handleReconnect}
              onSyncMetadata={handleSyncMetadata}
              syncingMetadata={syncingOrgId === org.id}
            />
          ))}
        </div>
      )}

      {/* Connect Org Dialog */}
      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect a Salesforce Org</DialogTitle>
            <DialogDescription>
              You&apos;ll be redirected to Salesforce to log in and authorize
              access. No setup required on your end.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-3">
            <a href="/api/salesforce/connect?env=production" className="block">
              <div className="group flex items-center gap-4 rounded-xl border p-4 transition-all hover:border-primary hover:bg-primary/5 cursor-pointer">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-bg">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Production Org</p>
                  <p className="text-sm text-muted-foreground">
                    login.salesforce.com
                  </p>
                </div>
                <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </div>
            </a>
            <a href="/api/salesforce/connect?env=sandbox" className="block">
              <div className="group flex items-center gap-4 rounded-xl border p-4 transition-all hover:border-primary hover:bg-primary/5 cursor-pointer">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Sandbox Org</p>
                  <p className="text-sm text-muted-foreground">
                    test.salesforce.com
                  </p>
                </div>
                <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </div>
            </a>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Your Salesforce credentials are never stored by OrgSync.
          </p>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation */}
      <AlertDialog
        open={!!disconnectOrg}
        onOpenChange={(open) => !open && setDisconnectOrg(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect &ldquo;{disconnectOrg?.label}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection and delete all sync configurations
              that use this org. Active syncs will stop immediately. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {disconnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameOrg} onOpenChange={(open) => !open && setRenameOrg(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Org</DialogTitle>
            <DialogDescription>
              Give this org a friendly name to identify it in sync configurations.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-2">
            <Label htmlFor="rename-input">Label</Label>
            <Input
              id="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              placeholder="e.g., Production Org, ACME Sandbox"
              autoFocus
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRenameOrg(null)}>
              Cancel
            </Button>
            <Button
              className="gradient-bg border-0 text-white hover:opacity-90"
              onClick={handleRename}
              disabled={renaming || !renameValue.trim()}
            >
              {renaming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OrgsPage() {
  return (
    <Suspense>
      <OrgsPageContent />
    </Suspense>
  );
}
