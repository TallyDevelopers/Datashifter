import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken, ensureExternalIdField } from "@/lib/salesforce/metadata";

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
    .select(`
      id, is_active, field_mappings, direction,
      source_object, target_object,
      source_org_id, target_org_id
    `)
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

  // ── Only run the field check when ACTIVATING (not deactivating) ─────────────
  if (!sync.is_active) {
    // Determine which orgs + objects need the external ID field
    // For one-way: target org + target object only
    // For bidirectional: both orgs, both objects (each is the "target" in one direction)
    const fieldsToEnsure: Array<{ orgId: string; sobjectType: string; label: string }> = [
      { orgId: sync.target_org_id, sobjectType: sync.target_object, label: "target" },
    ];

    if (sync.direction === "bidirectional") {
      fieldsToEnsure.push({
        orgId: sync.source_org_id,
        sobjectType: sync.source_object,
        label: "source (bidirectional)",
      });
    }

    for (const { orgId, sobjectType, label } of fieldsToEnsure) {
      try {
        const { accessToken, instanceUrl } = await getValidAccessToken(orgId);
        const result = await ensureExternalIdField(accessToken, instanceUrl, sobjectType);

        if (result.status === "error") {
          return NextResponse.json(
            {
              error: result.permissionError
                ? `OrgSync needs to create a tracking field (OrgSync_Source_Id__c) on ${sobjectType} in your ${label} org to enable accurate sync. ${result.message}`
                : `Could not set up tracking field on ${sobjectType} in ${label} org: ${result.message}`,
              code: "EXTERNAL_ID_FIELD_FAILED",
              permissionError: result.permissionError,
            },
            { status: 400 }
          );
        }

        console.log(`[activate] External ID field on ${sobjectType} (${label}): ${result.status}`);
      } catch (err) {
        // Non-fatal — log but don't block activation if field check itself errors
        // (e.g. org temporarily unreachable). Worker will handle gracefully.
        console.warn(`[activate] Could not verify external ID field for ${sobjectType} (${label}): ${err}`);
      }
    }
  }

  // Toggle active state
  const newState = !sync.is_active;
  const { error } = await supabase
    .from("sync_configs")
    .update({ is_active: newState })
    .eq("id", syncId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ is_active: newState });
}
