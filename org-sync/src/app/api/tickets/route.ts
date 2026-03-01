import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/tickets
 * Returns all support tickets for the authenticated customer.
 *
 * POST /api/tickets
 * Creates a new support ticket and an initial message.
 */
export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const { data: tickets, error } = await supabase
    .from("support_tickets")
    .select(`
      id, subject, status, priority, created_at, updated_at,
      message_count:ticket_messages(count)
    `)
    .eq("customer_id", customer.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tickets: tickets ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const body = await request.json();
  const { subject, description, priority = "normal" } = body as {
    subject: string;
    description: string;
    priority?: string;
  };

  if (!subject?.trim()) return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: "Description is required" }, { status: 400 });

  const validPriorities = ["low", "normal", "high", "urgent"];
  if (!validPriorities.includes(priority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .insert({ customer_id: customer.id, subject: subject.trim(), description: description.trim(), priority })
    .select("id")
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: ticketError?.message ?? "Failed to create ticket" }, { status: 500 });
  }

  // Insert the opening message as the first thread entry
  await supabase.from("ticket_messages").insert({
    ticket_id: ticket.id,
    sender_type: "customer",
    sender_id: user.id,
    message: description.trim(),
  });

  return NextResponse.json({ ticket }, { status: 201 });
}
