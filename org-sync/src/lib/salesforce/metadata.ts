import { refreshAccessToken, type SalesforceEnv } from "./oauth";
import { encrypt, decrypt } from "./crypto";
import { createClient } from "@/lib/supabase/server";

const SF_API_VERSION = "v59.0";

// ─── Token refresh helper ────────────────────────────────────────────────────

/**
 * Returns a valid access token for the given connected org.
 * If the stored token is expired or a request fails with 401,
 * automatically refreshes using the refresh token and persists the new token.
 */
export async function getValidAccessToken(orgId: string): Promise<{
  accessToken: string;
  instanceUrl: string;
}> {
  const supabase = await createClient();

  const { data: org, error } = await supabase
    .from("connected_orgs")
    .select("id, access_token, refresh_token, instance_url, is_sandbox, status")
    .eq("id", orgId)
    .single();

  if (error || !org) {
    throw new Error(`Org not found: ${orgId}`);
  }

  if (org.status !== "active") {
    throw new Error(`Org is not active (status: ${org.status})`);
  }

  const accessToken = decrypt(org.access_token);
  const refreshToken = decrypt(org.refresh_token);
  const env: SalesforceEnv = org.is_sandbox ? "sandbox" : "production";

  // Attempt a lightweight identity call to verify the token is still valid
  const testRes = await fetch(
    `${org.instance_url}/services/data/${SF_API_VERSION}/limits`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (testRes.status === 401) {
    // Token expired — refresh it
    const refreshed = await refreshAccessToken(refreshToken, env);
    const newAccessToken = refreshed.access_token;
    const newInstanceUrl = refreshed.instance_url;

    await supabase
      .from("connected_orgs")
      .update({
        access_token: encrypt(newAccessToken),
        instance_url: newInstanceUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId);

    return { accessToken: newAccessToken, instanceUrl: newInstanceUrl };
  }

  if (!testRes.ok) {
    // Mark the org as errored if something else is wrong
    await supabase
      .from("connected_orgs")
      .update({ status: "error", updated_at: new Date().toISOString() })
      .eq("id", orgId);
    throw new Error(`Salesforce API error: ${testRes.status}`);
  }

  return { accessToken, instanceUrl: org.instance_url };
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SObjectSummary {
  name: string;
  label: string;
  labelPlural: string;
  custom: boolean;
  queryable: boolean;
  createable: boolean;
  updateable: boolean;
  deletable: boolean;
}

export interface SObjectField {
  name: string;
  label: string;
  type: string;
  length: number;
  nillable: boolean;
  createable: boolean;
  updateable: boolean;
  referenceTo: string[];
  picklistValues: { value: string; label: string; active: boolean }[];
  externalId: boolean;
  unique: boolean;
  defaultedOnCreate: boolean;
}

export interface SObjectDetail {
  name: string;
  label: string;
  custom: boolean;
  fields: SObjectField[];
}

// ─── API wrappers ─────────────────────────────────────────────────────────────

export async function describeGlobal(
  accessToken: string,
  instanceUrl: string
): Promise<SObjectSummary[]> {
  const res = await fetch(
    `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`describeGlobal failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return (data.sobjects as SObjectSummary[]).filter(
    (obj) => obj.queryable && obj.createable
  );
}

export async function describeSObject(
  accessToken: string,
  instanceUrl: string,
  apiName: string
): Promise<SObjectDetail> {
  const res = await fetch(
    `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/${apiName}/describe`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `describeSObject(${apiName}) failed: ${res.status} ${await res.text()}`
    );
  }

  const data = await res.json();
  return {
    name: data.name,
    label: data.label,
    custom: data.custom,
    fields: (data.fields as SObjectField[]).filter(
      (f) => f.createable || f.updateable
    ),
  };
}
