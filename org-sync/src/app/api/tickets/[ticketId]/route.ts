import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/tickets/[ticketId]
 * Returns ticket detail and full message thread.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select("id, subject, description, status, priority, created_at, updated_at, customer_id")
    .eq("id", ticketId)
    .single();

  if (error || !ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  if (ticket.customer_id !== customer.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("id, sender_type, sender_id, message, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ ticket, messages: messages ?? [] });
}
