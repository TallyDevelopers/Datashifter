import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken, ensureExternalIdField } from "@/lib/salesforce/metadata";

/**
 * POST /api/salesforce/orgs/[orgId]/ensure-external-id-field
 * Body: { sobjectType: string }
 *
 * Checks whether OrgSync_Source_Id__c exists on the given SObject in the org.
 * If not, creates it automatically via the Salesforce Tooling API.
 *
 * Called during sync activation. Returns:
 *   { status: "exists" | "created" }  on success
 *   { status: "error", message, permissionError }  on failure
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify org belongs to this customer
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const { data: org } = await supabase
    .from("connected_orgs")
    .select("id")
    .eq("id", orgId)
    .eq("customer_id", customer.id)
    .single();
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const body = await request.json();
  const { sobjectType } = body as { sobjectType: string };
  if (!sobjectType) {
    return NextResponse.json({ error: "sobjectType is required" }, { status: 400 });
  }

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
