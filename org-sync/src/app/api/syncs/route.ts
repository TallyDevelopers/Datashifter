import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const { data: syncs, error } = await supabase
    .from("sync_configs")
    .select(`
      id, name, direction, is_active, created_at,
      trigger_on_create, trigger_on_update, trigger_on_delete,
      source_object, target_object,
      source_org:connected_orgs!source_org_id(id, label, is_sandbox),
      target_org:connected_orgs!target_org_id(id, label, is_sandbox)
    `)
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ syncs });
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
  const {
    name, source_org_id, source_object, target_org_id, target_object,
    direction, trigger_on_create, trigger_on_update, trigger_on_delete,
    filters, field_mappings,
  } = body;

  if (!name || !source_org_id || !source_object || !target_org_id || !target_object) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (source_org_id === target_org_id && source_object === target_object) {
    return NextResponse.json({ error: "Source and target cannot be the same object in the same org" }, { status: 400 });
  }

  // Verify both orgs belong to this customer
  const { data: orgs } = await supabase
    .from("connected_orgs")
    .select("id")
    .eq("customer_id", customer.id)
    .in("id", [source_org_id, target_org_id]);

  if (!orgs || orgs.length < (source_org_id === target_org_id ? 1 : 2)) {
    return NextResponse.json({ error: "One or more orgs not found" }, { status: 404 });
  }

  const { data: sync, error } = await supabase
    .from("sync_configs")
    .insert({
      customer_id: customer.id,
      name: name.trim(),
      source_org_id,
      source_object,
      target_org_id,
      target_object,
      direction: direction ?? "one_way",
      trigger_on_create: trigger_on_create ?? true,
      trigger_on_update: trigger_on_update ?? false,
      trigger_on_delete: trigger_on_delete ?? false,
      filters: filters ?? [],
      field_mappings: field_mappings ?? [],
      is_active: false,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sync }, { status: 201 });
}
