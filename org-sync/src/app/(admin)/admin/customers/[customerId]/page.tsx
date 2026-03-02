"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Building2, ArrowLeftRight, LifeBuoy,
  ShieldAlert, ShieldCheck, CheckCircle2, RefreshCw, Calendar,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";
import { cn } from "@/lib/utils";

interface CustomerDetail {
  id: string;
  name: string;
  email: string;
  plan_tier: string;
  is_suspended: boolean;
  created_at: string;
}

interface ConnectedOrg {
  id: string; label: string; instance_url: string; is_sandbox: boolean; status: string; connected_at: string;
}
interface SyncConfig {
  id: string; name: string; source_object: string; target_object: string; is_active: boolean; created_at: string;
}
interface Ticket {
  id: string; subject: string; status: string; priority: string; created_at: string; updated_at: string;
}

const PLAN_TIERS = [
  { value: "free",         label: "Free" },
  { value: "starter",      label: "Starter" },
  { value: "professional", label: "Growth" },
  { value: "enterprise",   label: "Enterprise" },
];

const PLAN_COLORS: Record<string, string> = {
  free:         "bg-slate-100 text-slate-600 border-slate-200",
  starter:      "bg-blue-50 text-blue-700 border-blue-200",
  professional: "bg-purple-50 text-purple-700 border-purple-200",
  enterprise:   "bg-amber-50 text-amber-700 border-amber-200",
};

const TICKET_STATUS_COLORS: Record<string, string> = {
  open:        "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-yellow-50 text-yellow-700 border-yellow-200",
  resolved:    "bg-green-50 text-green-700 border-green-200",
  closed:      "bg-muted text-muted-foreground",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = use(params);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [orgs, setOrgs] = useState<ConnectedOrg[]>([]);
  const [syncs, setSyncs] = useState<SyncConfig[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspending, setSuspending] = useState(false);

  async function fetchDetail() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCustomer(data.customer);
      setSelectedPlan(data.customer.plan_tier);
      setOrgs(data.orgs ?? []);
      setSyncs(data.syncs ?? []);
      setTickets(data.tickets ?? []);
    } catch {
      toast.error("Failed to load customer");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDetail(); }, [customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePlanChange() {
    if (!customer || selectedPlan === customer.plan_tier) return;
    setSavingPlan(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_tier: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCustomer((prev) => prev ? { ...prev, plan_tier: selectedPlan } : prev);
      toast.success(`Plan updated to ${PLAN_TIERS.find((p) => p.value === selectedPlan)?.label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update plan");
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleToggleSuspend() {
    if (!customer) return;
    setSuspending(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_suspended: !customer.is_suspended }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCustomer((prev) => prev ? { ...prev, is_suspended: !prev.is_suspended } : prev);
      toast.success(customer.is_suspended ? "Account reactivated" : "Account suspended");
      setSuspendDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSuspending(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!customer) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumbs items={[{ label: "Customers", href: "/admin/customers" }, { label: customer.name }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/customers"><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{customer.name}</h1>
              {customer.is_suspended && (
                <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50 text-xs">
                  <ShieldAlert className="mr-1 h-3 w-3" />Suspended
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{customer.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDetail}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSuspendDialogOpen(true)}
            className={customer.is_suspended
              ? "border-green-300 text-green-700 hover:bg-green-50"
              : "border-red-300 text-red-700 hover:bg-red-50"
            }
          >
            {customer.is_suspended
              ? <><ShieldCheck className="mr-1.5 h-3.5 w-3.5" />Reactivate</>
              : <><ShieldAlert className="mr-1.5 h-3.5 w-3.5" />Suspend</>
            }
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left col */}
        <div className="space-y-4">
          {/* Account info */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Joined {formatDate(customer.created_at)}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("text-xs capitalize", PLAN_COLORS[customer.plan_tier])}>
                  {PLAN_TIERS.find((p) => p.value === customer.plan_tier)?.label ?? customer.plan_tier}
                </Badge>
                <span className="text-xs text-muted-foreground">current plan</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/40 p-2 text-center">
                  <p className="text-lg font-bold">{orgs.length}</p>
                  <p className="text-[10px] text-muted-foreground">Orgs</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2 text-center">
                  <p className="text-lg font-bold">{syncs.length}</p>
                  <p className="text-[10px] text-muted-foreground">Syncs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan management */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Change Plan</CardTitle>
              <CardDescription className="text-xs">Changing plan updates log retention and feature access immediately.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-1.5">
                {PLAN_TIERS.map((tier) => (
                  <button
                    key={tier.value}
                    onClick={() => setSelectedPlan(tier.value)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-medium transition-all text-left",
                      selectedPlan === tier.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {tier.label}
                    {customer.plan_tier === tier.value && (
                      <span className="ml-1 text-[10px] opacity-60">(current)</span>
                    )}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                className="w-full gradient-bg border-0 text-white hover:opacity-90"
                disabled={selectedPlan === customer.plan_tier || savingPlan}
                onClick={handlePlanChange}
              >
                {savingPlan ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                {savingPlan ? "Saving…" : "Save Plan Change"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right col */}
        <div className="lg:col-span-2 space-y-4">
          {/* Connected Orgs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Connected Orgs ({orgs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {orgs.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">No orgs connected.</p>
              ) : (
                <div className="divide-y">
                  {orgs.map((org) => (
                    <div key={org.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium">{org.label}</p>
                        <p className="text-xs text-muted-foreground">{org.instance_url}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {org.is_sandbox && <Badge variant="secondary" className="text-[10px]">SB</Badge>}
                        <Badge variant="outline" className={cn("text-xs capitalize",
                          org.status === "active" ? "text-green-700 border-green-200 bg-green-50" : "text-red-700 border-red-200 bg-red-50"
                        )}>
                          {org.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sync Configs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-primary" />
                Sync Configurations ({syncs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {syncs.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">No sync configs.</p>
              ) : (
                <div className="divide-y">
                  {syncs.map((sync) => (
                    <div key={sync.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium">{sync.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{sync.source_object} → {sync.target_object}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-xs",
                        sync.is_active ? "text-green-700 border-green-200 bg-green-50" : "text-muted-foreground"
                      )}>
                        {sync.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tickets */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-primary" />
                Support Tickets ({tickets.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {tickets.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">No tickets.</p>
              ) : (
                <div className="divide-y">
                  {tickets.map((ticket) => (
                    <Link key={ticket.id} href={`/admin/tickets/${ticket.id}`}>
                      <div className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                        <div>
                          <p className="text-sm font-medium">{ticket.subject}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(ticket.updated_at)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-xs capitalize", TICKET_STATUS_COLORS[ticket.status])}>
                            {ticket.status.replace("_", " ")}
                          </Badge>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Suspend dialog */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {customer.is_suspended ? "Reactivate" : "Suspend"} {customer.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {customer.is_suspended
                ? "This will restore access to the portal and re-enable all syncs."
                : "This will block portal access. Active syncs will continue running until the worker is aware of the suspension."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleSuspend}
              disabled={suspending}
              className={customer.is_suspended ? "" : "bg-red-600 hover:bg-red-700 text-white"}
            >
              {suspending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {customer.is_suspended ? "Yes, reactivate" : "Yes, suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
