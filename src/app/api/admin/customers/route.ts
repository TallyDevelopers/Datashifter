import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("admin_users").select("id, role").eq("supabase_user_id", user.id).single();
  return data ? user : null;
}

/**
 * GET /api/admin/customers
 * Returns paginated list of all customers with org and sync counts.
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = createAdminClient();
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  let query = db
    .from("customers")
    .select(`
      id, name, email, plan_tier, is_suspended, created_at,
      connected_orgs(count),
      sync_configs(count)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: customers, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customers: customers ?? [], total: count ?? 0 });
}

/**
 * POST /api/admin/customers
 * Create a new customer account (Supabase auth user + customers row).
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, email, password, plan_tier = "starter" } = body as {
    name?: string; email?: string; password?: string; plan_tier?: string;
  };

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "name, email, and password are required" }, { status: 400 });
  }

  const validTiers = ["free", "starter", "professional", "enterprise"];
  if (!validTiers.includes(plan_tier)) {
    return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
  }

  const db = createAdminClient();

  // Create Supabase auth user
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email: email.trim(),
    password: password.trim(),
    email_confirm: true,
    user_metadata: { full_name: name.trim() },
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  // Get log retention from plan_features
  const { data: pf } = await db
    .from("plan_features")
    .select("log_retention_days")
    .eq("plan_tier", plan_tier)
    .single();

  // Create customers row
  const { data: customer, error: custError } = await db
    .from("customers")
    .insert({
      supabase_user_id: authData.user.id,
      name: name.trim(),
      email: email.trim(),
      plan_tier,
      log_retention_days: pf?.log_retention_days ?? 30,
    })
    .select("id, name, email, plan_tier, created_at")
    .single();

  if (custError) {
    // Rollback auth user if customer insert fails
    await db.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: custError.message }, { status: 500 });
  }

  return NextResponse.json({ customer }, { status: 201 });
}
