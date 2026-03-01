"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Loader2, ChevronRight, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type PlanTier = "free" | "starter" | "professional" | "enterprise";

interface Customer {
  id: string;
  name: string;
  email: string;
  plan_tier: PlanTier;
  created_at: string;
  connected_orgs: { count: number }[];
  sync_configs: { count: number }[];
}

const PLAN_CONFIG: Record<PlanTier, { label: string; className: string }> = {
  free: { label: "Free", className: "border-muted bg-muted text-muted-foreground" },
  starter: { label: "Starter", className: "border-blue-200 bg-blue-50 text-blue-700" },
  professional: { label: "Professional", className: "border-purple-200 bg-purple-50 text-purple-700" },
  enterprise: { label: "Enterprise", className: "border-amber-200 bg-amber-50 text-amber-700" },
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  const fetchCustomers = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (q) params.set("search", q);
      const res = await fetch(`/api/admin/customers?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCustomers(data.customers ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchCustomers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-sm text-muted-foreground mt-1">{total} total customer{total !== 1 ? "s" : ""}</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 font-medium">No customers found</p>
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-center">Orgs</TableHead>
                <TableHead className="text-center">Syncs</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => {
                const planCfg = PLAN_CONFIG[c.plan_tier] ?? PLAN_CONFIG.free;
                return (
                  <TableRow key={c.id} className="group cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={planCfg.className}>{planCfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-sm">{c.connected_orgs?.[0]?.count ?? 0}</TableCell>
                    <TableCell className="text-center tabular-nums text-sm">{c.sync_configs?.[0]?.count ?? 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
