import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getValidAccessToken,
  ensureExternalIdField,
  EXTERNAL_ID_FIELD_API_NAME,
} from "@/lib/salesforce/metadata";

/**
 * GET /api/syncs/[syncId]/tracking-field
 *
 * Returns per-object status for OrgSync_Source_Id__c.
 *
 * Strategy (in priority order):
 *  1. If the sync's `tracking_fields_ready` DB record already marks this
 *     org+object as ready → return exists:true immediately (skip Salesforce API).
 *  2. Otherwise call Salesforce describeSObject with cache-busting.
 *     If the field is found, also write it to `tracking_fields_ready` so
 *     future checks never need to hit Salesforce again.
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
      tracking_fields_ready,
      source_org:connected_orgs!source_org_id(id, label),
      target_org:connected_orgs!target_org_id(id, label)
    `)
    .eq("id", syncId)
    .eq("customer_id", customer.id)
    .single();
  if (!sync) return NextResponse.json({ error: "Sync not found" }, { status: 404 });

  const ready: Record<string, boolean> = (sync.tracking_fields_ready as Record<string, boolean>) ?? {};

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

  const newReady: Record<string, boolean> = { ...ready };
  let readyUpdated = false;

  const fields = await Promise.all(
    toCheck.map(async ({ orgId, orgLabel, object }) => {
      const dbKey = `${orgId}:${object}`;

      // 1. DB says it's already there — trust it, skip the API call
      if (ready[dbKey] === true) {
        return { orgId, orgLabel, object, exists: true };
      }

      // 2. Ask Salesforce (with cache-busting)
      try {
        const { accessToken, instanceUrl } = await getValidAccessToken(orgId);
        const res = await fetch(
          `${instanceUrl}/services/data/v59.0/sobjects/${object}/describe?_ts=${Date.now()}`,
          { headers: { Authorization: `Bearer ${accessToken}`, "Cache-Control": "no-cache" } }
        );
        if (!res.ok) return { orgId, orgLabel, object, exists: false, error: `Describe failed: ${res.status}` };
        const data = await res.json() as { fields: Array<{ name: string }> };
        const target = EXTERNAL_ID_FIELD_API_NAME.toLowerCase();
        const exists = data.fields.some((f) => f.name.toLowerCase() === target);

        // 3. If it exists, persist to DB so we never check again
        if (exists) {
          newReady[dbKey] = true;
          readyUpdated = true;
        }

        return { orgId, orgLabel, object, exists };
      } catch (err) {
        return { orgId, orgLabel, object, exists: false, error: String(err) };
      }
    })
  );

  // Persist any new "ready" entries we discovered
  if (readyUpdated) {
    await supabase
      .from("sync_configs")
      .update({ tracking_fields_ready: newReady })
      .eq("id", syncId);
  }

  return NextResponse.json({ fields });
}

/**
 * POST /api/syncs/[syncId]/tracking-field
 * Creates OrgSync_Source_Id__c on one specific org + object.
 * On success, writes the org+object to `tracking_fields_ready` in the DB.
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

  const { data: sync } = await supabase
    .from("sync_configs")
    .select("id, tracking_fields_ready")
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

    // On created or already exists, mark it in the DB
    if (result.status === "created" || result.status === "exists") {
      const dbKey = `${orgId}:${sobjectType}`;
      const current = (sync.tracking_fields_ready as Record<string, boolean>) ?? {};
      await supabase
        .from("sync_configs")
        .update({ tracking_fields_ready: { ...current, [dbKey]: true } })
        .eq("id", syncId);
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : String(err), permissionError: false },
      { status: 500 }
    );
  }
}
