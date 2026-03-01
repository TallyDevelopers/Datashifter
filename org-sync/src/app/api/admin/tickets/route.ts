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
 * GET /api/admin/tickets
 * Returns all support tickets across all customers with customer info.
 * Supports ?status= filter and ?search= on subject.
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = createAdminClient();
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const search = searchParams.get("search") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  let query = db
    .from("support_tickets")
    .select(`
      id, subject, status, priority, created_at, updated_at,
      customer:customers(id, name, email)
    `, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (search) query = query.ilike("subject", `%${search}%`);

  const { data: tickets, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tickets: tickets ?? [], total: count ?? 0 });
}
