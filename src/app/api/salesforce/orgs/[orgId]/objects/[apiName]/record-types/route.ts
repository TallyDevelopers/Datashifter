import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/salesforce/metadata";

const SF_API_VERSION = "v59.0";

export interface SalesforceRecordType {
  id: string;
  name: string;
  developerName: string;
  isActive: boolean;
  isMaster: boolean;
}

/**
 * GET /api/salesforce/orgs/[orgId]/objects/[apiName]/record-types
 *
 * Returns all active record types for the given SObject.
 * Always fetches live — record types change infrequently but are critical
 * for correctness, so we don't cache them.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; apiName: string }> }
) {
  const { orgId, apiName } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  try {
    const { accessToken, instanceUrl } = await getValidAccessToken(orgId);

    // Query RecordType directly — fastest, no describe needed
    const soql = `SELECT Id, Name, DeveloperName, IsActive FROM RecordType WHERE SobjectType = '${apiName}' ORDER BY Name ASC`;
    const url = `${instanceUrl}/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(soql)}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const txt = await res.text();
      // If the object simply doesn't support record types, return an empty list
      if (txt.includes("INVALID_FIELD") || txt.includes("INVALID_TYPE")) {
        return NextResponse.json({ recordTypes: [] });
      }
      return NextResponse.json({ error: `Salesforce error: ${txt}` }, { status: 502 });
    }

    const body = await res.json() as {
      records: Array<{
        Id: string;
        Name: string;
        DeveloperName: string;
        IsActive: boolean;
      }>;
    };

    // Also include the system "Master" record type (id = all-zeros in Salesforce, but
    // we represent it as a virtual entry so the UI can offer "Master (default)")
    const recordTypes: SalesforceRecordType[] = [
      {
        id: "012000000000000AAA",
        name: "Master",
        developerName: "Master",
        isActive: true,
        isMaster: true,
      },
      ...body.records.map((r) => ({
        id: r.Id,
        name: r.Name,
        developerName: r.DeveloperName,
        isActive: r.IsActive,
        isMaster: false,
      })),
    ];

    return NextResponse.json({ recordTypes });
  } catch (err) {
    console.error("record-types fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch record types" },
      { status: 500 }
    );
  }
}
