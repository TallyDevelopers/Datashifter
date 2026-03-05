import { randomBytes, createHash } from "crypto";

export type SalesforceEnv = "production" | "sandbox";

const SF_LOGIN_URLS: Record<SalesforceEnv, string> = {
  production: "https://login.salesforce.com",
  sandbox: "https://test.salesforce.com",
};

const OAUTH_SCOPES = ["api", "id", "refresh_token", "offline_access"].join(" ");

/** Generate a PKCE code_verifier (43–128 char URL-safe random string). */
export function generateCodeVerifier(): string {
  return randomBytes(48).toString("base64url");
}

/** Derive the code_challenge from the verifier using S256 method. */
export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function buildAuthUrl(
  state: string,
  env: SalesforceEnv = "production",
  codeChallenge: string
): string {
  const clientId = process.env.SALESFORCE_CLIENT_ID?.trim();
  const callbackUrl = process.env.SALESFORCE_CALLBACK_URL?.trim();
  if (!clientId || !callbackUrl) {
    throw new Error("SALESFORCE_CLIENT_ID or SALESFORCE_CALLBACK_URL not set");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: OAUTH_SCOPES,
    state,
    prompt: "consent",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${SF_LOGIN_URLS[env]}/services/oauth2/authorize?${params.toString()}`;
}

export interface SalesforceTokenResponse {
  access_token: string;
  refresh_token: string;
  instance_url: string;
  id: string; // identity URL
  token_type: string;
  issued_at: string;
  signature: string;
}

export async function exchangeCodeForTokens(
  code: string,
  env: SalesforceEnv = "production",
  codeVerifier?: string
): Promise<SalesforceTokenResponse> {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  const callbackUrl = process.env.SALESFORCE_CALLBACK_URL;
  if (!clientId || !clientSecret || !callbackUrl) {
    throw new Error("Missing Salesforce OAuth environment variables");
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: callbackUrl,
    code,
    ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
  });

  const res = await fetch(
    `${SF_LOGIN_URLS[env]}/services/oauth2/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Salesforce token exchange failed: ${err}`);
  }

  return res.json() as Promise<SalesforceTokenResponse>;
}

export async function refreshAccessToken(
  refreshToken: string,
  env: SalesforceEnv = "production"
): Promise<{ access_token: string; instance_url: string; issued_at: string }> {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing Salesforce OAuth environment variables");
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch(
    `${SF_LOGIN_URLS[env]}/services/oauth2/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Salesforce token refresh failed: ${err}`);
  }

  return res.json();
}

export interface SalesforceOrgInfo {
  orgId: string;
  orgName: string;
  isSandbox: boolean;
  instanceUrl: string;
}

export async function getOrgInfo(
  accessToken: string,
  instanceUrl: string,
  identityUrl?: string
): Promise<SalesforceOrgInfo> {
  // Use the identity URL from the token response if available — faster than SOQL
  const idUrl = identityUrl ?? `${instanceUrl}/services/oauth2/userinfo`;

  const res = await fetch(idUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch org info: ${err}`);
  }

  const data = await res.json() as {
    organization_id?: string;
    org_id?: string;
    organization_name?: string;
    urls?: { profile?: string };
    is_sandbox?: boolean;
    // identity URL shape
    user_id?: string;
  };

  // /services/oauth2/userinfo returns organization_id and organization_name
  const orgId = data.organization_id ?? data.org_id ?? "";
  const orgName = data.organization_name ?? instanceUrl;
  const isSandbox = data.is_sandbox ?? (instanceUrl.includes("sandbox") || instanceUrl.includes("test."));

  if (!orgId) {
    // Fallback: SOQL query if userinfo doesn't have org ID
    const soqlRes = await fetch(
      `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent("SELECT Id, Name, IsSandbox FROM Organization LIMIT 1")}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (soqlRes.ok) {
      const soqlData = await soqlRes.json();
      const org = soqlData.records?.[0];
      if (org) return { orgId: org.Id, orgName: org.Name, isSandbox: org.IsSandbox ?? false, instanceUrl };
    }
    throw new Error("Could not determine org ID");
  }

  return { orgId, orgName, isSandbox, instanceUrl };
}
