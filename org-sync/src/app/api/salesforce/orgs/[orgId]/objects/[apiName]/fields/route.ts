import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken, describeSObject } from "@/lib/salesforce/metadata";

/**
 * GET /api/salesforce/orgs/[orgId]/objects/[apiName]/fields
 *
 * Returns fields for a specific object. Checks the cache first.
 * If not cached (or ?refresh=true), fetches from Salesforce and caches.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; apiName: string }> }
) {
  const { orgId, apiName } = await params;
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "true";

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

  // Verify org ownership
  const { data: org } = await supabase
    .from("connected_orgs")
    .select("id")
    .eq("id", orgId)
    .eq("customer_id", customer.id)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Org not found" }, { status: 404 });
  }

  // Find the object record
  const { data: objRecord } = await supabase
    .from("org_objects")
    .select("id")
    .eq("connected_org_id", orgId)
    .eq("api_name", apiName)
    .single();

  if (!objRecord) {
    return NextResponse.json({ error: "Object not found in cache. Run metadata sync first." }, { status: 404 });
  }

  // Check if fields are already cached and not stale (24h)
  if (!forceRefresh) {
    const { data: cachedFields } = await supabase
      .from("org_fields")
      .select("id, api_name, label, field_type, is_required, is_createable, is_updateable, reference_to")
      .eq("org_object_id", objRecord.id)
      .order("label", { ascending: true });

    if (cachedFields && cachedFields.length > 0) {
      return NextResponse.json({ fields: cachedFields, fromCache: true });
    }
  }

  // Fetch fresh from Salesforce
  try {
    const { accessToken, instanceUrl } = await getValidAccessToken(orgId);
    const detail = await describeSObject(accessToken, instanceUrl, apiName);

    // Upsert fields into cache
    const fieldRows = detail.fields.map((f) => ({
      org_object_id: objRecord.id,
      api_name: f.name,
      label: f.label,
      field_type: f.type,
      is_required: !f.nillable && !f.defaultedOnCreate,
      is_createable: f.createable,
      is_updateable: f.updateable,
      reference_to: f.referenceTo.length > 0 ? f.referenceTo : null,
    }));

    await supabase
      .from("org_fields")
      .upsert(fieldRows, { onConflict: "org_object_id,api_name" });

    // Remove fields that no longer exist
    const currentFieldNames = detail.fields.map((f) => f.name);
    if (currentFieldNames.length > 0) {
      await supabase
        .from("org_fields")
        .delete()
        .eq("org_object_id", objRecord.id)
        .not("api_name", "in", `(${currentFieldNames.map((n) => `"${n}"`).join(",")})`);
    }

    // Update object last_synced_at
    await supabase
      .from("org_objects")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", objRecord.id);

    return NextResponse.json({ fields: fieldRows, fromCache: false });
  } catch (err) {
    console.error("fields fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch fields" },
      { status: 500 }
    );
  }
}
