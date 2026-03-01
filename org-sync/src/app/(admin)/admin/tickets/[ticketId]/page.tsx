"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: string;
  created_at: string;
  customer: { id: string; name: string; email: string };
}

interface Message {
  id: string;
  sender_type: "customer" | "admin";
  message: string;
  created_at: string;
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "border-blue-200 bg-blue-50 text-blue-700" },
  in_progress: { label: "In Progress", className: "border-yellow-200 bg-yellow-50 text-yellow-700" },
  resolved: { label: "Resolved", className: "border-green-200 bg-green-50 text-green-700" },
  closed: { label: "Closed", className: "border-muted bg-muted text-muted-foreground" },
};

export default function AdminTicketDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = use(params);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchDetail() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTicket(data.ticket);
      setMessages(data.messages ?? []);
    } catch { toast.error("Failed to load ticket"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchDetail(); }, [ticketId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function handleSend() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((prev) => [...prev, data.message]);
      setReply("");
      // Reflect in_progress status from server response
      if (ticket?.status === "open") setTicket((t) => t ? { ...t, status: "in_progress" } : t);
      toast.success("Reply sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally { setSending(false); }
  }

  async function handleStatusChange(newStatus: string) {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTicket((t) => t ? { ...t, status: newStatus as TicketStatus } : t);
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally { setUpdatingStatus(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!ticket) return null;

  const statusCfg = STATUS_CONFIG[ticket.status];

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/tickets"><ArrowLeft className="mr-1.5 h-4 w-4" />Back to Tickets</Link>
      </Button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">{ticket.subject}</h1>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap text-sm">
            <Badge variant="outline" className={statusCfg.className}>{statusCfg.label}</Badge>
            <span className="text-muted-foreground">
              from <Link href={`/admin/customers/${ticket.customer?.id}`} className="font-medium text-foreground hover:underline">{ticket.customer?.name}</Link>
              {" "}({ticket.customer?.email})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={ticket.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Thread */}
      <div className="space-y-3">
        {messages.map((msg, i) => {
          const isAdmin = msg.sender_type === "admin";
          return (
            <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%]">
                <Card className={isAdmin ? "border-primary/20 bg-primary/5" : "border-border bg-card"}>
                  <CardHeader className="pb-1 pt-3 px-4">
                    <span className="text-xs font-semibold">
                      {isAdmin ? "You (Support)" : ticket.customer?.name}
                      {i === 0 && <span className="ml-2 text-[10px] font-normal text-muted-foreground">Opening message</span>}
                    </span>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Textarea
            placeholder="Write your reply to the customer..."
            rows={4}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend(); }}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">⌘+Enter to send</p>
            <Button
              className="gradient-bg border-0 text-white hover:opacity-90"
              size="sm"
              onClick={handleSend}
              disabled={sending || !reply.trim()}
            >
              {sending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
              Send Reply
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
