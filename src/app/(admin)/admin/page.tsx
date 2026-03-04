"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, Building2, ArrowLeftRight, LifeBuoy, Activity,
  CheckCircle2, TrendingUp, AlertTriangle, Loader2, RefreshCw,
  ArrowRight, UserPlus, ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminStats {
  customers: {
    total: number;
    new7d: number;
    suspended: number;
    byPlan: Record<string, number>;
  };
  orgs: { total: number };
  syncs: { active: number };
  tickets: { open: number };
  records: {
    processed30d: number;
    succeeded30d: number;
    failed30d: number;
    successRate: number | null;
  };
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

function StatCard({
  label, value, sub, icon: Icon, iconBg, iconColor, href, highlight,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
  href?: string; highlight?: boolean;
}) {
  const inner = (
    <Card className={cn("transition-all duration-200", href && "hover:shadow-md hover:-translate-y-0.5 cursor-pointer", highlight && "border-red-200 bg-red-50/50")}>
      <CardContent className="p-5">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold tracking-tight">{typeof value === "number" ? value.toLocaleString() : value}</p>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (res.ok) setStats(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStats(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return null;

  const planBreakdown = Object.entries(stats.customers.byPlan).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Live snapshot of OrgSync across all customers.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Suspended warning */}
      {stats.customers.suspended > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span><strong>{stats.customers.suspended}</strong> suspended account{stats.customers.suspended !== 1 ? "s" : ""}.</span>
          <Link href="/admin/customers?filter=suspended" className="ml-auto flex items-center gap-1 text-red-700 hover:underline font-medium text-xs">
            View <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Customers" value={stats.customers.total}
          sub={`+${stats.customers.new7d} this week`}
          icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" href="/admin/customers"
        />
        <StatCard
          label="Connected Orgs" value={stats.orgs.total}
          sub="Across all customers"
          icon={Building2} iconBg="bg-purple-50" iconColor="text-purple-600"
        />
        <StatCard
          label="Active Syncs" value={stats.syncs.active}
          sub="Currently running"
          icon={ArrowLeftRight} iconBg="bg-green-50" iconColor="text-green-600"
        />
        <StatCard
          label="Open Tickets" value={stats.tickets.open}
          sub="Awaiting response"
          icon={LifeBuoy}
          iconBg={stats.tickets.open > 0 ? "bg-orange-50" : "bg-green-50"}
          iconColor={stats.tickets.open > 0 ? "text-orange-600" : "text-green-600"}
          href="/admin/tickets"
          highlight={stats.tickets.open > 5}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Records (30d) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Records Synced — Last 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-lg font-bold">{stats.records.processed30d.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Processed</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-lg font-bold text-green-700">{stats.records.succeeded30d.toLocaleString()}</p>
                <p className="text-xs text-green-600">Succeeded</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <p className="text-lg font-bold text-red-700">{stats.records.failed30d.toLocaleString()}</p>
                <p className="text-xs text-red-600">Failed</p>
              </div>
            </div>
            {stats.records.successRate !== null && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", stats.records.successRate >= 95 ? "bg-green-500" : stats.records.successRate >= 80 ? "bg-yellow-500" : "bg-red-500")}
                    style={{ width: `${stats.records.successRate}%` }}
                  />
                </div>
                <span className="text-sm font-semibold tabular-nums">{stats.records.successRate}%</span>
                <span className="text-xs text-muted-foreground">success rate</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Customers by Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {planBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No customers yet.</p>
            ) : (
              planBreakdown.map(([tier, count]) => {
                const pct = stats.customers.total > 0 ? Math.round((count / stats.customers.total) * 100) : 0;
                return (
                  <div key={tier} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-xs capitalize", PLAN_COLORS[tier])}>
                          {PLAN_LABELS[tier] ?? tier}
                        </Badge>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary/50 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
            <div className="pt-2 border-t">
              <Link href="/admin/customers" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                Manage customers <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/customers"><Users className="mr-1.5 h-3.5 w-3.5" />All Customers</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/tickets"><LifeBuoy className="mr-1.5 h-3.5 w-3.5" />Support Queue</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/customers?filter=suspended"><AlertTriangle className="mr-1.5 h-3.5 w-3.5" />Suspended</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/customers?sort=newest"><UserPlus className="mr-1.5 h-3.5 w-3.5" />New Signups</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
