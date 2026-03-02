"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  LifeBuoy, Search, X, Loader2, RefreshCw, ChevronRight, AlertTriangle, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  customer: { id: string; name: string; email: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  open:        "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-yellow-50 text-yellow-700 border-yellow-200",
  resolved:    "bg-green-50 text-green-700 border-green-200",
  closed:      "bg-slate-50 text-slate-600 border-slate-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  low:    "bg-slate-50 text-slate-600 border-slate-200",
  normal: "bg-blue-50 text-blue-600 border-blue-200",
  high:   "bg-orange-50 text-orange-700 border-orange-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_OPTIONS = ["all", "open", "in_progress", "resolved", "closed"];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("limit", "100");
      const res = await fetch(`/api/admin/tickets?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTickets(data.tickets ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total.toLocaleString()} ticket{total !== 1 ? "s" : ""}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTickets} disabled={loading}>
          <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-56 rounded-md border bg-background pl-8 pr-7 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-0.5">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all",
                statusFilter === s
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <LifeBuoy className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 font-semibold">No tickets</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {statusFilter === "open" ? "All caught up — no open tickets." : "No tickets match this filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Subject</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium truncate max-w-xs">{ticket.subject}</p>
                  </td>
                  <td className="px-4 py-3">
                    {ticket.customer ? (
                      <div>
                        <p className="text-sm font-medium">{ticket.customer.name}</p>
                        <p className="text-xs text-muted-foreground">{ticket.customer.email}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Unknown</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn("text-xs capitalize", STATUS_COLORS[ticket.status])}>
                      {ticket.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn("text-xs capitalize", PRIORITY_COLORS[ticket.priority])}>
                      {ticket.priority === "urgent" && <AlertTriangle className="mr-1 h-3 w-3" />}
                      {ticket.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(ticket.updated_at)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/tickets/${ticket.id}`} className="flex items-center gap-0.5 text-xs text-primary hover:underline font-medium">
                      Reply <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
