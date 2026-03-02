"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Send, RefreshCw, CheckCircle2, XCircle, AlertTriangle, User, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  customer: { id: string; name: string; email: string } | null;
}

interface Message {
  id: string;
  sender_type: "customer" | "admin";
  message: string;
  created_at: string;
}

const STATUS_OPTIONS = ["open", "in_progress", "resolved", "closed"];
const STATUS_COLORS: Record<string, string> = {
  open:        "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-yellow-50 text-yellow-700 border-yellow-200",
  resolved:    "bg-green-50 text-green-700 border-green-200",
  closed:      "bg-slate-50 text-slate-600 border-slate-200",
};

function formatTime(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function AdminTicketDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = use(params);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchTicket() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTicket(data.ticket);
      setMessages(data.messages ?? []);
    } catch {
      toast.error("Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTicket(); }, [ticketId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function handleSendReply() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((prev) => [...prev, data.message]);
      setReply("");
      // Update ticket status to in_progress if it was open
      if (ticket?.status === "open") {
        setTicket((prev) => prev ? { ...prev, status: "in_progress" } : prev);
      }
      toast.success("Reply sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!ticket || ticket.status === newStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      setTicket((prev) => prev ? { ...prev, status: newStatus } : prev);
      toast.success(`Ticket marked as ${newStatus.replace("_", " ")}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!ticket) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <Breadcrumbs items={[{ label: "Support Queue", href: "/admin/tickets" }, { label: ticket.subject }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/tickets"><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{ticket.subject}</h1>
            <p className="text-sm text-muted-foreground">
              {ticket.customer?.name} · {ticket.customer?.email}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTicket}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />Refresh
        </Button>
      </div>

      {/* Status bar */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4 flex-wrap">
          <Badge variant="outline" className={cn("text-xs capitalize", STATUS_COLORS[ticket.status])}>
            {ticket.status.replace("_", " ")}
          </Badge>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground capitalize">Priority: {ticket.priority}</span>
          <span className="ml-auto flex items-center gap-1.5 flex-wrap">
            {STATUS_OPTIONS.filter((s) => s !== ticket.status).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={updatingStatus}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline capitalize transition-colors"
              >
                Mark {s.replace("_", " ")}
              </button>
            ))}
          </span>
        </CardContent>
      </Card>

      {/* Thread */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-sm font-semibold">Conversation</CardTitle>
          <CardDescription className="text-xs">{ticket.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto max-h-[420px] p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2.5",
                  msg.sender_type === "admin" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  msg.sender_type === "admin"
                    ? "bg-red-600 text-white"
                    : "bg-muted text-muted-foreground"
                )}>
                  {msg.sender_type === "admin" ? <ShieldCheck className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                </div>
                <div className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5",
                  msg.sender_type === "admin"
                    ? "bg-red-600 text-white rounded-tr-sm"
                    : "bg-muted rounded-tl-sm"
                )}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                  <p className={cn("mt-1 text-[10px]", msg.sender_type === "admin" ? "text-red-200" : "text-muted-foreground")}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </CardContent>

        {/* Reply box */}
        {ticket.status !== "closed" && (
          <div className="border-t p-4 space-y-2">
            <Textarea
              placeholder="Type your reply…"
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSendReply();
              }}
              className="resize-none text-sm"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">⌘↵ to send</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("resolved")}
                  disabled={updatingStatus || ticket.status === "resolved"}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-green-600" />
                  Resolve
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendReply}
                  disabled={sending || !reply.trim()}
                  className="gradient-bg border-0 text-white hover:opacity-90"
                >
                  {sending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                  Send Reply
                </Button>
              </div>
            </div>
          </div>
        )}
        {ticket.status === "closed" && (
          <div className="border-t p-4 text-center">
            <p className="text-xs text-muted-foreground">This ticket is closed.</p>
            <button onClick={() => handleStatusChange("open")} className="text-xs text-primary hover:underline mt-1">
              Re-open ticket
            </button>
          </div>
        )}
      </Card>

      {/* Customer link */}
      {ticket.customer && (
        <div className="text-xs text-muted-foreground">
          Customer:{" "}
          <Link href={`/admin/customers/${ticket.customer.id}`} className="text-primary hover:underline font-medium">
            {ticket.customer.name}
          </Link>
        </div>
      )}
    </div>
  );
}
