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
 * POST /api/admin/tickets/[ticketId]/messages
 * Admin sends a reply to a ticket thread. Automatically sets status to in_progress.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { message } = body as { message: string };
  if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const db = createAdminClient();

  const { data: newMessage, error } = await db
    .from("ticket_messages")
    .insert({ ticket_id: ticketId, sender_type: "admin", sender_id: admin.id, message: message.trim() })
    .select("id, sender_type, sender_id, message, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Move ticket to in_progress when admin first replies (if still open)
  await db
    .from("support_tickets")
    .update({ status: "in_progress" })
    .eq("id", ticketId)
    .eq("status", "open");

  return NextResponse.json({ message: newMessage }, { status: 201 });
}
