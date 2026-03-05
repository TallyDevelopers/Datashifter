"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users, Search, X, ChevronRight, Loader2, RefreshCw,
  Building2, ArrowLeftRight, ShieldAlert, ShieldCheck,
  UserPlus, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  email: string;
  plan_tier: string;
  is_suspended: boolean;
  created_at: string;
  connected_orgs: { count: number }[];
  sync_configs: { count: number }[];
}

const PLAN_COLORS: Record<string, string> = {
  free:         "bg-slate-100 text-slate-600 border-slate-200",
  starter:      "bg-blue-50 text-blue-700 border-blue-200",
  professional: "bg-purple-50 text-purple-700 border-purple-200",
  enterprise:   "bg-amber-50 text-amber-700 border-amber-200",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free", starter: "Starter", professional: "Growth", enterprise: "Enterprise",
};

const PLAN_TIERS = [
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "professional", label: "Growth" },
  { value: "enterprise", label: "Enterprise" },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSuspended, setFilterSuspended] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPlan, setNewPlan] = useState("starter");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("limit", "100");
      const res = await fetch(`/api/admin/customers?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      let list: Customer[] = data.customers ?? [];
      if (filterSuspended) list = list.filter((c) => c.is_suspended);
      setCustomers(list);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [search, filterSuspended]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  async function handleToggleSuspend(customer: Customer) {
    setTogglingId(customer.id);
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_suspended: !customer.is_suspended }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCustomers((prev) =>
        prev.map((c) => c.id === customer.id ? { ...c, is_suspended: !c.is_suspended } : c)
      );
      toast.success(customer.is_suspended ? `${customer.name} reactivated` : `${customer.name} suspended`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error("Name, email, and password are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, plan_tier: newPlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Customer ${newName} created`);
      setCreateOpen(false);
      setNewName(""); setNewEmail(""); setNewPassword(""); setNewPlan("starter");
      fetchCustomers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create customer");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total.toLocaleString()} total accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchCustomers} disabled={loading}>
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" className="gradient-bg border-0 text-white hover:opacity-90" onClick={() => setCreateOpen(true)}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Create Customer
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-64 rounded-md border bg-background pl-8 pr-7 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button
          variant={filterSuspended ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterSuspended((v) => !v)}
          className={filterSuspended ? "bg-red-600 hover:bg-red-700 text-white border-0" : ""}
        >
          <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
          Suspended only
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 font-semibold">No customers found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search or create your first customer.</p>
            <Button size="sm" className="mt-4 gradient-bg border-0 text-white hover:opacity-90" onClick={() => setCreateOpen(true)}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Create Customer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Plan</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Orgs</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Syncs</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn("text-xs capitalize", PLAN_COLORS[c.plan_tier])}>
                      {PLAN_LABELS[c.plan_tier] ?? c.plan_tier}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-muted-foreground text-xs">
                      <Building2 className="h-3 w-3" />
                      {c.connected_orgs?.[0]?.count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-muted-foreground text-xs">
                      <ArrowLeftRight className="h-3 w-3" />
                      {c.sync_configs?.[0]?.count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleSuspend(c)}
                      disabled={togglingId === c.id}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all hover:opacity-80",
                        c.is_suspended
                          ? "text-red-700 border-red-200 bg-red-50 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                          : "text-green-700 border-green-200 bg-green-50 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                      )}
                    >
                      {togglingId === c.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : c.is_suspended
                          ? <ShieldAlert className="h-3 w-3" />
                          : <ShieldCheck className="h-3 w-3" />
                      }
                      {c.is_suspended ? "Suspended" : "Active"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-0.5 text-xs text-primary hover:underline font-medium">
                      Manage <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Customer Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Customer Account</DialogTitle>
            <DialogDescription>
              Creates a Supabase auth account and a customer record. The customer can log in immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Full Name</Label>
              <Input
                id="new-name"
                placeholder="Jane Smith"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="jane@company.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Temporary Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Share this with the customer — they can change it from account settings.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <div className="grid grid-cols-2 gap-2">
                {PLAN_TIERS.map((tier) => (
                  <button
                    key={tier.value}
                    onClick={() => setNewPlan(tier.value)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm font-medium transition-all text-left",
                      newPlan === tier.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button
              className="gradient-bg border-0 text-white hover:opacity-90"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating
                ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Creating…</>
                : <><CheckCircle2 className="mr-2 h-3.5 w-3.5" />Create Account</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
