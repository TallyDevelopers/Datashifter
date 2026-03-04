import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("admin_users").select("id").eq("supabase_user_id", user.id).single();
  return data ? user : null;
}

/**
 * GET /api/admin/tickets/[ticketId] — full thread
 * PATCH /api/admin/tickets/[ticketId] — update status
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = createAdminClient();
  const { data: ticket } = await db
    .from("support_tickets")
    .select("id, subject, description, status, priority, created_at, updated_at, customer:customers(id, name, email)")
    .eq("id", ticketId)
    .single();

  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: messages } = await db
    .from("ticket_messages")
    .select("id, sender_type, sender_id, message, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ ticket, messages: messages ?? [] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { status } = body as { status: string };
  const validStatuses = ["open", "in_progress", "resolved", "closed"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db.from("support_tickets").update({ status }).eq("id", ticketId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
