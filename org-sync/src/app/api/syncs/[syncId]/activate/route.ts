import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/syncs/[syncId]/activate
 * Toggles the is_active state of a sync config.
 * Does NOT block on external ID field — that is the customer's choice via a
 * separate "Create tracking field" button on the sync card.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ syncId: string }> }
) {
  const { syncId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const { data: sync } = await supabase
    .from("sync_configs")
    .select("id, is_active, field_mappings")
    .eq("id", syncId)
    .eq("customer_id", customer.id)
    .single();
  if (!sync) return NextResponse.json({ error: "Sync not found" }, { status: 404 });

  // Require at least one field mapping before activating
  const mappings = sync.field_mappings as unknown[];
  if (!mappings || mappings.length === 0) {
    return NextResponse.json(
      { error: "Add at least one field mapping before activating this sync." },
      { status: 400 }
    );
  }

  const newState = !sync.is_active;
  const { error } = await supabase
    .from("sync_configs")
    .update({ is_active: newState })
    .eq("id", syncId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ is_active: newState });
}
