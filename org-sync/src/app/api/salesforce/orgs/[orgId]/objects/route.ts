import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/salesforce/orgs/[orgId]/objects
 *
 * Returns all cached objects for an org.
 * Supports ?search= query param for filtering by label or api_name.
 * Supports ?custom=true to filter custom objects only.
 */
export async function GET(
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

  const { data: org } = await supabase
    .from("connected_orgs")
    .select("id, label")
    .eq("id", orgId)
    .eq("customer_id", customer.id)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Org not found" }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const customOnly = searchParams.get("custom") === "true";

  let query = supabase
    .from("org_objects")
    .select("id, api_name, label, is_custom, is_queryable, last_synced_at")
    .eq("connected_org_id", orgId)
    .order("label", { ascending: true });

  if (customOnly) {
    query = query.eq("is_custom", true);
  }

  if (search) {
    query = query.or(`label.ilike.%${search}%,api_name.ilike.%${search}%`);
  }

  const { data: objects, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ objects, orgLabel: org.label });
}
