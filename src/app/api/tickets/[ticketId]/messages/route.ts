import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/tickets/[ticketId]/messages
 * Adds a reply message to a ticket thread. Re-opens the ticket if it was closed/resolved.
 */
export async function POST(
  request: NextRequest,
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

  // Ownership check
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, customer_id, status")
    .eq("id", ticketId)
    .single();

  if (!ticket || ticket.customer_id !== customer.id) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const body = await request.json();
  const { message } = body as { message: string };
  if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const { data: newMessage, error } = await supabase
    .from("ticket_messages")
    .insert({ ticket_id: ticketId, sender_type: "customer", sender_id: user.id, message: message.trim() })
    .select("id, sender_type, sender_id, message, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Re-open ticket if it was resolved/closed so the team sees the new reply
  if (ticket.status === "resolved" || ticket.status === "closed") {
    await supabase.from("support_tickets").update({ status: "open" }).eq("id", ticketId);
  }

  return NextResponse.json({ message: newMessage }, { status: 201 });
}
