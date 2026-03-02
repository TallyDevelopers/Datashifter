import { createClient } from "@supabase/supabase-js";
import { decrypt } from "./crypto.js";
import type {
  ConnectedOrg,
  SalesforceQueryResult,
  SalesforceRecord,
  SalesforceCompositeSubrequest,
  SalesforceCompositeResponse,
} from "./types.js";

const SF_API_VERSION = "v59.0";

export const EXTERNAL_ID_FIELD = "OrgSync_Source_Id__c";

function db() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Returns a live (decrypted, refreshed if needed) access token for an org.
 * If the token is expired or within 5 minutes of expiry it refreshes via Salesforce.
 * Updates the stored token in Supabase if refreshed.
 */
export async function getValidAccessToken(org: ConnectedOrg): Promise<{ accessToken: string; instanceUrl: string }> {
  const accessToken = decrypt(org.access_token);
  const refreshToken = decrypt(org.refresh_token);

  const isExpired = org.token_expires_at
    ? new Date(org.token_expires_at).getTime() - Date.now() < 5 * 60 * 1000
    : false;

  if (!isExpired) {
    return { accessToken, instanceUrl: org.instance_url };
  }

  // Refresh
  console.log(`[salesforce] Refreshing token for org ${org.label} (${org.id})`);
  const loginUrl = org.is_sandbox
    ? "https://test.salesforce.com"
    : "https://login.salesforce.com";

  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId ?? "",
    client_secret: clientSecret ?? "",
    refresh_token: refreshToken,
  });

  const res = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    // Mark the org as error so the scheduler stops hammering it
    console.error(`[salesforce] Token refresh failed for org ${org.label} (${org.id}) — marking as error`);
    await db()
      .from("connected_orgs")
      .update({ status: "error", status_message: `Token refresh failed: ${err.slice(0, 300)}` })
      .eq("id", org.id);
    throw new Error(`Token refresh failed for org ${org.label}: ${err}`);
  }

  const data = await res.json() as { access_token: string; instance_url: string; issued_at: string };

  // Persist the refreshed token (we store it encrypted, but here we just update instance_url + expires)
  // The main app stores encrypted tokens — we keep only the expiry updated so future runs skip refresh
  const expiresAt = new Date(parseInt(data.issued_at) + 2 * 60 * 60 * 1000).toISOString(); // SF tokens last ~2hrs
  await db()
    .from("connected_orgs")
    .update({ token_expires_at: expiresAt, instance_url: data.instance_url })
    .eq("id", org.id);

  return { accessToken: data.access_token, instanceUrl: data.instance_url };
}

/**
 * Queries Salesforce for records modified since a given date.
 * Handles pagination automatically and returns all records.
 */
export async function queryRecords(
  org: ConnectedOrg,
  sobjectType: string,
  fields: string[],
  sinceDate: Date
): Promise<SalesforceRecord[]> {
  const { accessToken, instanceUrl } = await getValidAccessToken(org);

  // Always include Id and SystemModstamp for tracking
  const fieldList = Array.from(new Set(["Id", "SystemModstamp", ...fields])).join(", ");
  const since = sinceDate.toISOString();
  const soql = `SELECT ${fieldList} FROM ${sobjectType} WHERE SystemModstamp > ${since} ORDER BY SystemModstamp ASC`;

  const records: SalesforceRecord[] = [];
  let url: string | null = `${instanceUrl}/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(soql)}`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Salesforce query failed: ${err}`);
    }

    const data = await res.json() as SalesforceQueryResult;
    records.push(...data.records);

    url = data.nextRecordsUrl ? `${instanceUrl}${data.nextRecordsUrl}` : null;
  }

  return records;
}

/**
 * Upserts or inserts records into the target org using the Salesforce Composite API
 * in batches of 25 (Salesforce limit per composite request).
 * Returns per-record results.
 */
export async function upsertRecords(
  org: ConnectedOrg,
  sobjectType: string,
  records: Array<{ payload: Record<string, unknown>; existingTargetId?: string; sourceRecordId: string }>
): Promise<Array<{ sourceRecordId: string; targetRecordId: string | null; success: boolean; errorMessage?: string; errorCode?: string }>> {
  const { accessToken, instanceUrl } = await getValidAccessToken(org);
  const results: Array<{ sourceRecordId: string; targetRecordId: string | null; success: boolean; errorMessage?: string; errorCode?: string }> = [];

  const BATCH_SIZE = 25;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const subrequests: SalesforceCompositeSubrequest[] = batch.map((rec, idx) => {
      if (rec.existingTargetId) {
        // PATCH existing record
        return {
          method: "PATCH",
          url: `/services/data/${SF_API_VERSION}/sobjects/${sobjectType}/${rec.existingTargetId}`,
          referenceId: `rec_${idx}`,
          body: rec.payload,
        };
      } else {
        // POST new record
        return {
          method: "POST",
          url: `/services/data/${SF_API_VERSION}/sobjects/${sobjectType}`,
          referenceId: `rec_${idx}`,
          body: rec.payload,
        };
      }
    });

    const res = await fetch(`${instanceUrl}/services/data/${SF_API_VERSION}/composite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ allOrNone: false, compositeRequest: subrequests }),
    });

    if (!res.ok) {
      const err = await res.text();
      // Fail entire batch
      for (const rec of batch) {
        results.push({ sourceRecordId: rec.sourceRecordId, targetRecordId: null, success: false, errorMessage: `Composite API error: ${err}`, errorCode: "COMPOSITE_FAILED" });
      }
      continue;
    }

    const compositeData = await res.json() as SalesforceCompositeResponse;

    for (let j = 0; j < batch.length; j++) {
      const subRes = compositeData.compositeResponse[j];
      const rec = batch[j];

      if (subRes.httpStatusCode === 200 || subRes.httpStatusCode === 201 || subRes.httpStatusCode === 204) {
        const body = subRes.body as { id?: string } | null;
        const targetId = rec.existingTargetId ?? body?.id ?? null;
        results.push({ sourceRecordId: rec.sourceRecordId, targetRecordId: targetId, success: true });
      } else {
        const errs = subRes.body as Array<{ message: string; errorCode: string }> | null;
        const msg = Array.isArray(errs) && errs[0] ? errs[0].message : JSON.stringify(subRes.body);
        const code = Array.isArray(errs) && errs[0] ? errs[0].errorCode : "UNKNOWN";
        results.push({ sourceRecordId: rec.sourceRecordId, targetRecordId: null, success: false, errorMessage: msg, errorCode: code });
      }
    }
  }

  return results;
}

/**
 * Upserts records into the target org using Salesforce's native External ID mechanism.
 *
 * Each record is sent as:
 *   PATCH /sobjects/{sobjectType}/{EXTERNAL_ID_FIELD}/{sourceRecordId}
 *
 * Salesforce will:
 *   - UPDATE the record if one already has OrgSync_Source_Id__c = sourceRecordId
 *   - INSERT a new record (and set OrgSync_Source_Id__c) if none exists
 *
 * This completely replaces the sync_record_mappings lookup table — no Supabase
 * roundtrip needed, no storage growth, and handles "target record manually deleted"
 * gracefully (Salesforce recreates it as a new insert).
 *
 * Uses the Composite API in batches of 25 for efficiency.
 */
export async function upsertByExternalId(
  org: ConnectedOrg,
  sobjectType: string,
  records: Array<{
    sourceRecordId: string;
    payload: Record<string, unknown>;
  }>
): Promise<Array<{
  sourceRecordId: string;
  success: boolean;
  errorMessage?: string;
  errorCode?: string;
}>> {
  const { accessToken, instanceUrl } = await getValidAccessToken(org);
  const results: Array<{ sourceRecordId: string; success: boolean; errorMessage?: string; errorCode?: string }> = [];

  const BATCH_SIZE = 25;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const subrequests: SalesforceCompositeSubrequest[] = batch.map((rec, idx) => ({
      method: "PATCH",
      // Salesforce upsert-by-external-ID endpoint:
      // PATCH /sobjects/{Type}/{ExternalIdField}/{ExternalIdValue}
      // If a record with that external ID exists → update it
      // If not → insert a new one with that external ID set
      url: `/services/data/${SF_API_VERSION}/sobjects/${sobjectType}/${EXTERNAL_ID_FIELD}/${encodeURIComponent(rec.sourceRecordId)}`,
      referenceId: `rec_${idx}`,
      body: {
        ...rec.payload,
        // Always stamp the external ID field so it's set on inserts
        [EXTERNAL_ID_FIELD]: rec.sourceRecordId,
      },
    }));

    const res = await fetch(`${instanceUrl}/services/data/${SF_API_VERSION}/composite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ allOrNone: false, compositeRequest: subrequests }),
    });

    if (!res.ok) {
      const err = await res.text();
      for (const rec of batch) {
        results.push({ sourceRecordId: rec.sourceRecordId, success: false, errorMessage: `Composite API error: ${err}`, errorCode: "COMPOSITE_FAILED" });
      }
      continue;
    }

    const compositeData = await res.json() as SalesforceCompositeResponse;

    for (let j = 0; j < batch.length; j++) {
      const subRes = compositeData.compositeResponse[j];
      const rec = batch[j];

      // 200 = updated, 201 = inserted, 204 = updated (no body)
      if (subRes.httpStatusCode === 200 || subRes.httpStatusCode === 201 || subRes.httpStatusCode === 204) {
        results.push({ sourceRecordId: rec.sourceRecordId, success: true });
      } else {
        const errs = subRes.body as Array<{ message: string; errorCode: string }> | null;
        const msg  = Array.isArray(errs) && errs[0] ? errs[0].message : JSON.stringify(subRes.body);
        const code = Array.isArray(errs) && errs[0] ? errs[0].errorCode : "UNKNOWN";
        results.push({ sourceRecordId: rec.sourceRecordId, success: false, errorMessage: msg, errorCode: code });
      }
    }
  }

  return results;
}
