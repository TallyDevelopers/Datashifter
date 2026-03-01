import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Verify the org belongs to this customer before deleting
  const { data: org } = await supabase
    .from("connected_orgs")
    .select("id")
    .eq("id", orgId)
    .eq("customer_id", customer.id)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Org not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("connected_orgs")
    .delete()
    .eq("id", orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const body = await request.json();
  const { label } = body;

  if (!label || typeof label !== "string") {
    return NextResponse.json({ error: "Invalid label" }, { status: 400 });
  }

  const { error } = await supabase
    .from("connected_orgs")
    .update({ label: label.trim() })
    .eq("id", orgId)
    .eq("customer_id", customer.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
