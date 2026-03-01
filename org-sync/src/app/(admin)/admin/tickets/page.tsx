"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Loader2, ChevronRight, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface AdminTicket {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: string;
  created_at: string;
  updated_at: string;
  customer: { id: string; name: string; email: string };
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "border-blue-200 bg-blue-50 text-blue-700" },
  in_progress: { label: "In Progress", className: "border-yellow-200 bg-yellow-50 text-yellow-700" },
  resolved: { label: "Resolved", className: "border-green-200 bg-green-50 text-green-700" },
  closed: { label: "Closed", className: "border-muted bg-muted text-muted-foreground" },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted-foreground",
  normal: "text-foreground",
  high: "text-orange-600 font-semibold",
  urgent: "text-red-600 font-semibold",
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [total, setTotal] = useState(0);

  const fetchTickets = useCallback(async (q = "", s = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (q) params.set("search", q);
      if (s) params.set("status", s);
      const res = await fetch(`/api/admin/tickets?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTickets(data.tickets ?? []);
      setTotal(data.total ?? 0);
    } catch { toast.error("Failed to load tickets"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    const t = setTimeout(() => fetchTickets(search, statusFilter), 300);
    return () => clearTimeout(t);
  }, [search, statusFilter, fetchTickets]);

  const statusOptions = ["", "open", "in_progress", "resolved", "closed"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support Tickets</h1>
        <p className="text-sm text-muted-foreground mt-1">{total} total ticket{total !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by subject..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          {statusOptions.map((s) => (
            <Button
              key={s || "all"}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className={statusFilter === s ? "gradient-bg border-0 text-white" : ""}
            >
              {s ? s.replace("_", " ") : "All"}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <LifeBuoy className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 font-medium">No tickets found</p>
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => {
                const statusCfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
                return (
                  <TableRow key={ticket.id} className="group cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium text-sm max-w-xs truncate">{ticket.subject}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{ticket.customer?.name}</p>
                        <p className="text-xs text-muted-foreground">{ticket.customer?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={statusCfg.className}>{statusCfg.label}</Badge></TableCell>
                    <TableCell className={`text-sm capitalize ${PRIORITY_COLORS[ticket.priority] ?? ""}`}>{ticket.priority}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(ticket.updated_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Link href={`/admin/tickets/${ticket.id}`} className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
