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
 * GET /api/admin/customers/[customerId]
 * Full customer detail: orgs, sync configs, recent logs, open tickets.
 *
 * PATCH /api/admin/customers/[customerId]
 * Update plan_tier for a customer.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = createAdminClient();

  const { data: customer } = await db
    .from("customers")
    .select("id, name, email, plan_tier, created_at")
    .eq("id", customerId)
    .single();

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: orgs }, { data: syncs }, { data: tickets }] = await Promise.all([
    db.from("connected_orgs").select("id, label, instance_url, is_sandbox, status, connected_at").eq("customer_id", customerId),
    db.from("sync_configs").select("id, name, source_object, target_object, is_active, created_at").eq("customer_id", customerId),
    db.from("support_tickets").select("id, subject, status, priority, created_at, updated_at").eq("customer_id", customerId).order("updated_at", { ascending: false }).limit(10),
  ]);

  return NextResponse.json({ customer, orgs: orgs ?? [], syncs: syncs ?? [], tickets: tickets ?? [] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { plan_tier } = body as { plan_tier: string };
  const validTiers = ["free", "starter", "professional", "enterprise"];
  if (!validTiers.includes(plan_tier)) {
    return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db.from("customers").update({ plan_tier }).eq("id", customerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
