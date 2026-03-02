"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, Send, XCircle, CheckCircle2, RefreshCw,
} from "lucide-react";
import { Breadcrumbs } from "@/components/portal/breadcrumbs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "normal" | "high" | "urgent";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  sender_type: "customer" | "admin";
  sender_id: string;
  message: string;
  created_at: string;
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "border-blue-200 bg-blue-50 text-blue-700" },
  in_progress: { label: "In Progress", className: "border-yellow-200 bg-yellow-50 text-yellow-700" },
  resolved: { label: "Resolved", className: "border-green-200 bg-green-50 text-green-700" },
  closed: { label: "Closed", className: "border-muted bg-muted text-muted-foreground" },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "border-muted bg-muted/50 text-muted-foreground" },
  normal: { label: "Normal", className: "border-slate-200 bg-slate-50 text-slate-600" },
  high: { label: "High", className: "border-orange-200 bg-orange-50 text-orange-700" },
  urgent: { label: "Urgent", className: "border-red-200 bg-red-50 text-red-700" },
};

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchDetail() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
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

  useEffect(() => { fetchDetail(); }, [ticketId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((prev) => [...prev, data.message]);
      setReply("");
      // Refresh ticket to pick up re-opened status if it was resolved
      const ticketRes = await fetch(`/api/tickets/${ticketId}`);
      const ticketData = await ticketRes.json();
      if (ticketRes.ok) setTicket(ticketData.ticket);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleClose() {
    setClosing(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/close`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Ticket closed");
      router.push("/support");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to close ticket");
    } finally {
      setClosing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ticket) return null;

  const statusCfg = STATUS_CONFIG[ticket.status];
  const priorityCfg = PRIORITY_CONFIG[ticket.priority];
  const isClosed = ticket.status === "closed";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Breadcrumbs
        items={[
          { label: "Support", href: "/support" },
          { label: ticket.subject },
        ]}
      />
      {/* Back nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/support">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Tickets
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={fetchDetail}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Ticket header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">{ticket.subject}</h2>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={statusCfg.className}>{statusCfg.label}</Badge>
            <Badge variant="outline" className={`${priorityCfg.className} text-xs`}>
              {priorityCfg.label} priority
            </Badge>
            <span className="text-xs text-muted-foreground">
              Opened {new Date(ticket.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        {!isClosed && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-muted-foreground" disabled={closing}>
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Close Ticket
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Close this ticket?</AlertDialogTitle>
                <AlertDialogDescription>
                  Closing the ticket marks it as resolved from your side. You can re-open it by sending a new reply at any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClose} className="gradient-bg border-0 text-white hover:opacity-90">
                  Close Ticket
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Message thread */}
      <div className="space-y-3">
        {messages.map((msg, i) => {
          const isAdmin = msg.sender_type === "admin";
          const isFirst = i === 0;
          return (
            <div key={msg.id} className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] ${isAdmin ? "order-1" : "order-2"}`}>
                <Card
                  className={
                    isAdmin
                      ? "border-border bg-card"
                      : "border-primary/20 bg-primary/5"
                  }
                >
                  <CardHeader className="pb-1 pt-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">
                        {isAdmin ? "OrgSync Support" : "You"}
                      </span>
                      {isFirst && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          Opening message
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {new Date(msg.created_at).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Closed notice */}
      {isClosed ? (
        <Card className="border-muted">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              This ticket is closed. Send a new message below to re-open it.
            </span>
          </CardContent>
        </Card>
      ) : null}

      {/* Reply box */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Textarea
            placeholder="Write your reply..."
            rows={4}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
            }}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Press {typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘" : "Ctrl"}+Enter to send
            </p>
            <Button
              className="gradient-bg border-0 text-white hover:opacity-90"
              size="sm"
              onClick={handleSend}
              disabled={sending || !reply.trim()}
            >
              {sending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              Send Reply
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
