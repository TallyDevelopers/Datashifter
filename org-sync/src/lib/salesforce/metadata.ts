import { refreshAccessToken, type SalesforceEnv } from "./oauth";
import { encrypt, decrypt } from "./crypto";
import { createClient } from "@/lib/supabase/server";

const SF_API_VERSION = "v59.0";

// ─── External ID field constants ─────────────────────────────────────────────

export const EXTERNAL_ID_FIELD_API_NAME = "OrgSync_Source_Id__c";
export const EXTERNAL_ID_FIELD_LABEL    = "OrgSync Source ID";

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

// ─── External ID field management ────────────────────────────────────────────

export type EnsureFieldResult =
  | { status: "exists" }
  | { status: "created" }
  | { status: "error"; message: string; permissionError: boolean };

/**
 * Checks whether OrgSync_Source_Id__c exists on `sobjectType` in the given org.
 * If it doesn't exist, creates it via the Salesforce Tooling API (REST).
 *
 * The field is:
 *   - Type: Text(18)
 *   - Unique: true (per-object, case-insensitive)
 *   - External ID: true  ← enables upsert-by-external-ID
 *   - Required: false    ← existing records won't break
 *
 * Requires "Customize Application" permission on the connected user's profile.
 */
export async function ensureExternalIdField(
  accessToken: string,
  instanceUrl: string,
  sobjectType: string
): Promise<EnsureFieldResult> {
  // 1. Check if the field already exists via describeSObject
  try {
    const describeRes = await fetch(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/${sobjectType}/describe`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (describeRes.ok) {
      const describeData = await describeRes.json() as { fields: Array<{ name: string }> };
      const alreadyExists = describeData.fields.some(
        (f) => f.name === EXTERNAL_ID_FIELD_API_NAME
      );
      if (alreadyExists) return { status: "exists" };
    }
  } catch {
    // If describe fails we still attempt creation below
  }

  // 2. Get the SObject ID for the Tooling API
  const entityRes = await fetch(
    `${instanceUrl}/services/data/${SF_API_VERSION}/tooling/query?q=${encodeURIComponent(
      `SELECT Id FROM EntityDefinition WHERE QualifiedApiName = '${sobjectType}' LIMIT 1`
    )}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!entityRes.ok) {
    const txt = await entityRes.text();
    const permissionError = txt.includes("INSUFFICIENT_ACCESS") || txt.includes("INVALID_SESSION");
    return {
      status: "error",
      message: `Could not query object definition: ${txt.slice(0, 200)}`,
      permissionError,
    };
  }

  const entityData = await entityRes.json() as { records: Array<{ Id: string }> };
  if (!entityData.records || entityData.records.length === 0) {
    return {
      status: "error",
      message: `Object "${sobjectType}" not found in this org.`,
      permissionError: false,
    };
  }

  const tableEnumOrId = entityData.records[0].Id;

  // 3. Create the custom field via Tooling API
  const createRes = await fetch(
    `${instanceUrl}/services/data/${SF_API_VERSION}/tooling/sobjects/CustomField`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        FullName: `${sobjectType}.${EXTERNAL_ID_FIELD_API_NAME}`,
        Metadata: {
          label: EXTERNAL_ID_FIELD_LABEL,
          type: "Text",
          length: 18,
          unique: true,
          caseSensitive: false,
          externalId: true,
          required: false,
          description:
            "Managed by OrgSync. Stores the source org record ID to enable accurate upserts. Do not edit.",
          TableEnumOrId: tableEnumOrId,
        },
      }),
    }
  );

  if (!createRes.ok) {
    const txt = await createRes.text();
    const permissionError =
      txt.includes("INSUFFICIENT_ACCESS") ||
      txt.includes("FIELD_INTEGRITY_EXCEPTION") ||
      txt.includes("NOT_SUPPORTED") ||
      createRes.status === 403;

    // If it already exists (race condition / duplicate) that's fine
    if (txt.includes("DUPLICATE_VALUE") || txt.includes("already exists")) {
      return { status: "exists" };
    }

    return {
      status: "error",
      message: permissionError
        ? `Your Salesforce profile needs "Customize Application" permission to let OrgSync create the tracking field on ${sobjectType}.`
        : `Failed to create tracking field: ${txt.slice(0, 300)}`,
      permissionError,
    };
  }

  return { status: "created" };
}
