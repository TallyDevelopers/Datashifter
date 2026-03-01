import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/tickets/[ticketId]/close
 * Allows a customer to close their own resolved/open ticket.
 */
export async function POST(
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

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, customer_id, status")
    .eq("id", ticketId)
    .single();

  if (!ticket || ticket.customer_id !== customer.id) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (ticket.status === "closed") {
    return NextResponse.json({ error: "Ticket is already closed" }, { status: 400 });
  }

  await supabase.from("support_tickets").update({ status: "closed" }).eq("id", ticketId);
  return NextResponse.json({ success: true });
}
