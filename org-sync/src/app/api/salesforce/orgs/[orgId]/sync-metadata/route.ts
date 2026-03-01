import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken, describeGlobal } from "@/lib/salesforce/metadata";

/**
 * POST /api/salesforce/orgs/[orgId]/sync-metadata
 *
 * Fetches all queryable+createable objects from the org via describeGlobal
 * and caches them in the org_objects table. Existing objects are upserted.
 * Fields are NOT fetched here — they are fetched lazily per object on demand.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify this org belongs to the authenticated customer
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
    .select("id")
    .eq("id", orgId)
    .eq("customer_id", customer.id)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Org not found" }, { status: 404 });
  }

  try {
    const { accessToken, instanceUrl } = await getValidAccessToken(orgId);
    const objects = await describeGlobal(accessToken, instanceUrl);

    // Upsert all objects — insert new, update existing on conflict
    const rows = objects.map((obj) => ({
      connected_org_id: orgId,
      api_name: obj.name,
      label: obj.label,
      is_custom: obj.custom,
      is_queryable: obj.queryable,
      last_synced_at: new Date().toISOString(),
    }));

    // Process in batches of 500 to avoid payload limits
    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("org_objects")
        .upsert(batch, { onConflict: "connected_org_id,api_name" });

      if (error) {
        throw new Error(`Failed to upsert objects batch: ${error.message}`);
      }
    }

    // Remove objects that no longer exist in the org
    const currentApiNames = objects.map((o) => o.name);
    await supabase
      .from("org_objects")
      .delete()
      .eq("connected_org_id", orgId)
      .not("api_name", "in", `(${currentApiNames.map((n) => `"${n}"`).join(",")})`);

    return NextResponse.json({
      success: true,
      objectCount: objects.length,
    });
  } catch (err) {
    console.error("sync-metadata error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to sync metadata" },
      { status: 500 }
    );
  }
}
