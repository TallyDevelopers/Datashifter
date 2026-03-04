import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getValidAccessToken,
  ensureExternalIdField,
  EXTERNAL_ID_FIELD_API_NAME,
} from "@/lib/salesforce/metadata";

/**
 * GET /api/syncs/[syncId]/tracking-field
 * Checks whether OrgSync_Source_Id__c exists on the target (and source for
 * bidirectional) object(s) for this sync. Returns per-object status.
 *
 * Response:
 *   { fields: [{ orgId, orgLabel, object, exists: boolean }] }
 */
export async function GET(
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
      id, direction, source_object, target_object,
      source_org_id, target_org_id,
      source_org:connected_orgs!source_org_id(id, label),
      target_org:connected_orgs!target_org_id(id, label)
    `)
    .eq("id", syncId)
    .eq("customer_id", customer.id)
    .single();
  if (!sync) return NextResponse.json({ error: "Sync not found" }, { status: 404 });

  const toCheck: Array<{ orgId: string; orgLabel: string; object: string }> = [
    {
      orgId: sync.target_org_id,
      orgLabel: (sync.target_org as unknown as { label: string })?.label ?? "Target Org",
      object: sync.target_object,
    },
  ];

  if (sync.direction === "bidirectional") {
    toCheck.push({
      orgId: sync.source_org_id,
      orgLabel: (sync.source_org as unknown as { label: string })?.label ?? "Source Org",
      object: sync.source_object,
    });
  }

  const fields = await Promise.all(
    toCheck.map(async ({ orgId, orgLabel, object }) => {
      try {
        const { accessToken, instanceUrl } = await getValidAccessToken(orgId);
        // _ts busts any intermediate HTTP cache so a freshly-created field shows up immediately
        const res = await fetch(
          `${instanceUrl}/services/data/v59.0/sobjects/${object}/describe?_ts=${Date.now()}`,
          { headers: { Authorization: `Bearer ${accessToken}`, "Cache-Control": "no-cache" } }
        );
        if (!res.ok) return { orgId, orgLabel, object, exists: false, error: `Describe failed: ${res.status}` };
        const data = await res.json() as { fields: Array<{ name: string }> };
        const target = EXTERNAL_ID_FIELD_API_NAME.toLowerCase();
        const exists = data.fields.some((f) => f.name.toLowerCase() === target);
        return { orgId, orgLabel, object, exists };
      } catch (err) {
        return { orgId, orgLabel, object, exists: false, error: String(err) };
      }
    })
  );

  return NextResponse.json({ fields });
}

/**
 * POST /api/syncs/[syncId]/tracking-field
 * Creates OrgSync_Source_Id__c on one specific org + object.
 * Body: { orgId: string, sobjectType: string }
 *
 * Response:
 *   { status: "created" | "exists" | "error", message?: string, permissionError?: boolean }
 */
export async function POST(
  request: NextRequest,
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

  // Verify the sync belongs to this customer
  const { data: sync } = await supabase
    .from("sync_configs")
    .select("id")
    .eq("id", syncId)
    .eq("customer_id", customer.id)
    .single();
  if (!sync) return NextResponse.json({ error: "Sync not found" }, { status: 404 });

  const body = await request.json();
  const { orgId, sobjectType } = body as { orgId: string; sobjectType: string };
  if (!orgId || !sobjectType) {
    return NextResponse.json({ error: "orgId and sobjectType are required" }, { status: 400 });
  }

  // Verify org belongs to this customer
  const { data: org } = await supabase
    .from("connected_orgs")
    .select("id")
    .eq("id", orgId)
    .eq("customer_id", customer.id)
    .single();
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  try {
    const { accessToken, instanceUrl } = await getValidAccessToken(orgId);
    const result = await ensureExternalIdField(accessToken, instanceUrl, sobjectType);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : String(err), permissionError: false },
      { status: 500 }
    );
  }
}
