import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/salesforce/metadata";

const SF_API_VERSION = "v59.0";

export interface SalesforceUser {
  id: string;
  name: string;
  email: string;
  username: string;
  profile: string;
  isActive: boolean;
}

/**
 * GET /api/salesforce/orgs/[orgId]/users
 *
 * Fetches all active, non-system Users from the org.
 * Used to populate owner assignment options in the sync builder.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // Verify org belongs to this customer
  const { data: org } = await supabase
    .from("connected_orgs")
    .select("id, label")
    .eq("id", orgId)
    .eq("customer_id", customer.id)
    .single();
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  try {
    const { accessToken, instanceUrl } = await getValidAccessToken(orgId);

    const soql = `SELECT Id, Name, Email, Username, Profile.Name, IsActive
                  FROM User
                  WHERE IsActive = true
                    AND UserType = 'Standard'
                  ORDER BY Name ASC
                  LIMIT 200`;

    const res = await fetch(
      `${instanceUrl}/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(soql)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Salesforce query failed: ${err}` }, { status: 502 });
    }

    const data = await res.json();
    const users: SalesforceUser[] = (data.records ?? []).map((r: Record<string, unknown>) => ({
      id: r.Id as string,
      name: r.Name as string,
      email: r.Email as string,
      username: r.Username as string,
      profile: (r.Profile as { Name?: string } | null)?.Name ?? "",
      isActive: r.IsActive as boolean,
    }));

    return NextResponse.json({ users, orgLabel: org.label });
  } catch (err) {
    console.error("[orgs/users]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
