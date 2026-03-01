import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getCustomerAndSync(syncId: string, userId: string) {
  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", userId)
    .single();
  if (!customer) return { error: "Customer not found", status: 404, supabase, customer: null, sync: null };

  const { data: sync } = await supabase
    .from("sync_configs")
    .select("id, customer_id")
    .eq("id", syncId)
    .eq("customer_id", customer.id)
    .single();
  if (!sync) return { error: "Sync config not found", status: 404, supabase, customer, sync: null };

  return { error: null, status: 200, supabase, customer, sync };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ syncId: string }> }
) {
  const { syncId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error, status } = await getCustomerAndSync(syncId, user.id);
  if (error) return NextResponse.json({ error }, { status });

  const { data: sync, error: fetchError } = await supabase
    .from("sync_configs")
    .select(`
      id, name, direction, is_active, created_at,
      trigger_on_create, trigger_on_update, trigger_on_delete,
      source_object, target_object, filters, field_mappings,
      source_org_id, target_org_id,
      source_org:connected_orgs!source_org_id(id, label, is_sandbox, instance_url),
      target_org:connected_orgs!target_org_id(id, label, is_sandbox, instance_url)
    `)
    .eq("id", syncId)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  return NextResponse.json({ sync });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ syncId: string }> }
) {
  const { syncId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error, status } = await getCustomerAndSync(syncId, user.id);
  if (error) return NextResponse.json({ error }, { status });

  const body = await request.json();
  const allowed = ["name", "direction", "trigger_on_create", "trigger_on_update", "trigger_on_delete", "filters", "field_mappings"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { error: updateError } = await supabase
    .from("sync_configs")
    .update(updates)
    .eq("id", syncId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ syncId: string }> }
) {
  const { syncId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error, status } = await getCustomerAndSync(syncId, user.id);
  if (error) return NextResponse.json({ error }, { status });

  const { error: deleteError } = await supabase
    .from("sync_configs")
    .delete()
    .eq("id", syncId);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
