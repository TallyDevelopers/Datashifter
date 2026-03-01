"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Building2, ArrowLeftRight, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type PlanTier = "free" | "starter" | "professional" | "enterprise";

interface Customer { id: string; name: string; email: string; plan_tier: PlanTier; created_at: string; }
interface Org { id: string; label: string; instance_url: string; is_sandbox: boolean; status: string; connected_at: string; }
interface SyncConfig { id: string; name: string; source_object: string; target_object: string; is_active: boolean; }
interface Ticket { id: string; subject: string; status: string; priority: string; updated_at: string; }

const PLAN_CONFIG: Record<PlanTier, { label: string; className: string }> = {
  free: { label: "Free", className: "border-muted bg-muted text-muted-foreground" },
  starter: { label: "Starter", className: "border-blue-200 bg-blue-50 text-blue-700" },
  professional: { label: "Professional", className: "border-purple-200 bg-purple-50 text-purple-700" },
  enterprise: { label: "Enterprise", className: "border-amber-200 bg-amber-50 text-amber-700" },
};

export default function AdminCustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [syncs, setSyncs] = useState<SyncConfig[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>("free");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/customers/${customerId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCustomer(data.customer);
        setOrgs(data.orgs ?? []);
        setSyncs(data.syncs ?? []);
        setTickets(data.tickets ?? []);
        setSelectedPlan(data.customer.plan_tier);
      } catch { toast.error("Failed to load customer"); }
      finally { setLoading(false); }
    })();
  }, [customerId]);

  async function handlePlanUpdate() {
    setUpdatingPlan(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_tier: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCustomer((c) => c ? { ...c, plan_tier: selectedPlan } : c);
      toast.success(`Plan updated to ${selectedPlan}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingPlan(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!customer) return null;

  const planCfg = PLAN_CONFIG[customer.plan_tier];

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/customers"><ArrowLeft className="mr-1.5 h-4 w-4" />Back to Customers</Link>
      </Button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{customer.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline" className={planCfg.className}>{planCfg.label}</Badge>
            <span className="text-xs text-muted-foreground">Joined {new Date(customer.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Plan changer */}
        <Card className="w-72 shrink-0">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">Change Plan</p>
            <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as PlanTier)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="w-full gradient-bg border-0 text-white hover:opacity-90"
              size="sm"
              onClick={handlePlanUpdate}
              disabled={updatingPlan || selectedPlan === customer.plan_tier}
            >
              {updatingPlan && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Update Plan
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Connected Orgs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Connected Orgs ({orgs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {orgs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orgs connected yet.</p>
            ) : orgs.map((org) => (
              <div key={org.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{org.label}</p>
                  <p className="text-xs text-muted-foreground">{org.is_sandbox ? "Sandbox" : "Production"}</p>
                </div>
                <Badge variant="outline" className={org.status === "active" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}>
                  {org.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Sync Configs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" /> Sync Configs ({syncs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {syncs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sync configs yet.</p>
            ) : syncs.map((sync) => (
              <div key={sync.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{sync.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{sync.source_object} → {sync.target_object}</p>
                </div>
                <Badge variant="outline" className={sync.is_active ? "border-green-200 bg-green-50 text-green-700" : "border-muted bg-muted text-muted-foreground"}>
                  {sync.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Support Tickets */}
      {tickets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <LifeBuoy className="h-4 w-4" /> Recent Tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {tickets.map((ticket) => (
              <Link key={ticket.id} href={`/admin/tickets/${ticket.id}`}>
                <div className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted/50 cursor-pointer">
                  <p className="text-sm font-medium truncate">{ticket.subject}</p>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge variant="outline" className="text-xs capitalize">{ticket.status.replace("_", " ")}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(ticket.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
