"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, User, Lock, Trash2, CheckCircle2, Eye, EyeOff, AlertTriangle, Zap, ArrowRight, Building2, ArrowLeftRight, Activity } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";

// ─── Profile Section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setName(data.user?.user_metadata?.full_name ?? "");
      setEmail(data.user?.email ?? "");
      setLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <Card>
      <CardContent className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4 text-primary" />
          Profile
        </CardTitle>
        <CardDescription>Update your display name. Your email address cannot be changed.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-muted-foreground">Email address</Label>
            <Input
              id="email"
              value={email}
              disabled
              className="bg-muted text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">Contact support to change your email.</p>
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={saving}
            className={saved ? "bg-green-600 hover:bg-green-600 text-white border-0" : "gradient-bg border-0 text-white hover:opacity-90"}
          >
            {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> : null}
            {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Password Section ─────────────────────────────────────────────────────────

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);

  const strength = next.length === 0 ? 0
    : next.length >= 12 && /[A-Z]/.test(next) && /[0-9]/.test(next) && /[^A-Za-z0-9]/.test(next) ? 4
    : next.length >= 10 && /[A-Z]/.test(next) ? 3
    : next.length >= 8 ? 2
    : 1;

  const strengthLabel = ["", "Too weak", "Acceptable", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-red-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"][strength];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { toast.error("Passwords do not match"); return; }
    if (next.length < 8) { toast.error("Password must be at least 8 characters"); return; }

    setSaving(true);
    try {
      // Re-authenticate first by signing in with current password
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Could not get user email");

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
      if (signInErr) throw new Error("Current password is incorrect");

      const { error: updateErr } = await supabase.auth.updateUser({ password: next });
      if (updateErr) throw new Error(updateErr.message);

      toast.success("Password updated successfully");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4 text-primary" />
          Change Password
        </CardTitle>
        <CardDescription>Use a strong, unique password you don&apos;t use elsewhere.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <Label htmlFor="current">Current password</Label>
            <div className="relative">
              <Input
                id="current"
                type={showCurrent ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                autoComplete="current-password"
                className="pr-10"
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNext ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="pr-10"
              />
              <button type="button" onClick={() => setShowNext(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {next.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((l) => (
                    <div key={l} className={`h-1 flex-1 rounded-full transition-colors ${l <= strength ? strengthColor : "bg-muted"}`} />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">{strengthLabel}</p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type={showNext ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
            {confirm.length > 0 && next !== confirm && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={saving || (confirm.length > 0 && next !== confirm)}
            className="gradient-bg border-0 text-white hover:opacity-90"
          >
            {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {saving ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Danger Zone ──────────────────────────────────────────────────────────────

function DangerZone() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/settings/delete-account", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Sign out and redirect
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/?deleted=1";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Deleting your account will:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-xs">
                  <li>Disconnect all connected Salesforce orgs</li>
                  <li>Stop and delete all sync configurations</li>
                  <li>Permanently erase all sync logs and record mappings</li>
                  <li>Close any open support tickets</li>
                  <li>Cancel your subscription immediately (no refund)</li>
                </ul>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white"
              onClick={() => setOpen(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete my account
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); setConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete account permanently?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                All your syncs, logs, connected orgs, and data will be wiped immediately. There is no recovery.
              </span>
              <span className="block">
                Type <strong className="text-foreground">DELETE</strong> to confirm:
              </span>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="mt-2 border-destructive/40 focus-visible:ring-destructive/40"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={confirmText !== "DELETE" || deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Plan & Usage Section ─────────────────────────────────────────────────────

interface UsageData {
  plan_tier: string;
  org_count: number;
  sync_count: number;
  records_30d: number;
}

const PLAN_LIMITS: Record<string, { orgs: number; syncs: number; records: number; retention: string; label: string; color: string }> = {
  free:         { orgs: 1,   syncs: 1,  records: 500,    retention: "14 days", label: "Free",       color: "text-slate-600" },
  starter:      { orgs: 2,   syncs: 3,  records: 10000,  retention: "30 days", label: "Starter",    color: "text-blue-600" },
  professional: { orgs: 5,   syncs: -1, records: 100000, retention: "90 days", label: "Growth",     color: "text-primary" },
  enterprise:   { orgs: -1,  syncs: -1, records: -1,     retention: "1 year",  label: "Enterprise", color: "text-purple-600" },
};

function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  if (max === -1) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{used.toLocaleString()} <span className="text-muted-foreground">/ Unlimited</span></span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-1/3 gradient-bg opacity-40 rounded-full" />
        </div>
      </div>
    );
  }
  const pct = Math.min(100, Math.round((used / max) * 100));
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-primary";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{used.toLocaleString()} <span className="text-muted-foreground">/ {max.toLocaleString()}</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PlanSection() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data) => {
        setUsage({
          plan_tier: data.customer?.plan_tier ?? "starter",
          org_count: data.stats?.orgCount ?? 0,
          sync_count: data.stats?.totalSyncCount ?? 0,
          records_30d: data.stats?.recordsProcessed ?? 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const tier = usage?.plan_tier ?? "starter";
  const limits = PLAN_LIMITS[tier] ?? PLAN_LIMITS.starter;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-primary" />
          Plan & Usage
        </CardTitle>
        <CardDescription>Your current plan and resource usage this month.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Current plan badge */}
        <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-bg shadow-sm shadow-primary/20">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">{limits.label} Plan</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 text-xs">Active</Badge>
            <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
              <Link href="/pricing">
                Upgrade
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Usage bars */}
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : usage ? (
          <div className="space-y-4">
            <UsageBar used={usage.org_count} max={limits.orgs} label="Connected Orgs" />
            <UsageBar used={usage.sync_count} max={limits.syncs} label="Sync Configurations" />
            <UsageBar used={usage.records_30d} max={limits.records} label="Records Synced (last 30 days)" />
          </div>
        ) : null}

        {/* Retention notice */}
        <div className="flex items-center justify-between rounded-lg bg-muted/40 border px-3 py-2 text-xs">
          <span className="text-muted-foreground">Sync log history</span>
          <span className="font-semibold text-foreground">{limits.retention}</span>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2 pt-1 border-t">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground" asChild>
            <Link href="/orgs"><Building2 className="h-3.5 w-3.5" />Connected Orgs</Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground" asChild>
            <Link href="/syncs"><ArrowLeftRight className="h-3.5 w-3.5" />Sync Configs</Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground" asChild>
            <Link href="/logs"><Activity className="h-3.5 w-3.5" />Sync Logs</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <PlanSection />
      <ProfileSection />
      <PasswordSection />
      <DangerZone />
    </div>
  );
}
