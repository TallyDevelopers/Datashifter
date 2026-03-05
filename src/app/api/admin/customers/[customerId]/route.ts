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
    .select("id, name, email, plan_tier, is_suspended, created_at, admin_notes")
    .eq("id", customerId)
    .single();

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: orgs }, { data: syncs }, { data: tickets }, { data: migrations }] = await Promise.all([
    db.from("connected_orgs").select("id, label, instance_url, is_sandbox, status, connected_at").eq("customer_id", customerId),
    db.from("sync_configs").select("id, name, source_object, target_object, is_active, created_at").eq("customer_id", customerId),
    db.from("support_tickets").select("id, subject, status, priority, created_at, updated_at").eq("customer_id", customerId).order("updated_at", { ascending: false }).limit(10),
    db.from("cpq_jobs").select("id, name, status, created_at, updated_at").eq("customer_id", customerId).order("updated_at", { ascending: false }).limit(20),
  ]);

  return NextResponse.json({ customer, orgs: orgs ?? [], syncs: syncs ?? [], tickets: tickets ?? [], migrations: migrations ?? [] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { plan_tier, is_suspended, admin_notes } = body as {
    plan_tier?: string; is_suspended?: boolean; admin_notes?: string;
  };
  const db = createAdminClient();

  const updates: Record<string, unknown> = {};

  if (plan_tier !== undefined) {
    const validTiers = ["free", "starter", "professional", "enterprise"];
    if (!validTiers.includes(plan_tier)) {
      return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
    }
    updates.plan_tier = plan_tier;

    // Sync log_retention_days from plan_features
    const { data: pf } = await db
      .from("plan_features")
      .select("log_retention_days")
      .eq("plan_tier", plan_tier)
      .single();
    if (pf?.log_retention_days) {
      updates.log_retention_days = pf.log_retention_days;
    }
  }

  if (is_suspended !== undefined) {
    updates.is_suspended = is_suspended;
  }

  if (admin_notes !== undefined) {
    updates.admin_notes = admin_notes;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await db.from("customers").update(updates).eq("id", customerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, updates });
}
