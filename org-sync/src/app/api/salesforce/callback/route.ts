import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeCodeForTokens,
  getOrgInfo,
  type SalesforceEnv,
} from "@/lib/salesforce/oauth";
import { encrypt } from "@/lib/salesforce/crypto";
import { checkOrgLimit } from "@/lib/plan";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const sfError = searchParams.get("error");

  if (sfError) {
    const desc = searchParams.get("error_description") ?? sfError;
    return NextResponse.redirect(
      `${APP_URL}/orgs?error=${encodeURIComponent(desc)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/orgs?error=missing_params`);
  }

  // Decode and validate state
  let statePayload: { userId: string; env: SalesforceEnv; ts: number };
  try {
    statePayload = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    return NextResponse.redirect(`${APP_URL}/orgs?error=invalid_state`);
  }

  // Reject states older than 10 minutes
  if (Date.now() - statePayload.ts > 10 * 60 * 1000) {
    return NextResponse.redirect(`${APP_URL}/orgs?error=state_expired`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== statePayload.userId) {
    return NextResponse.redirect(`${APP_URL}/orgs?error=user_mismatch`);
  }

  try {
    // Retrieve PKCE verifier from cookie
    const codeVerifier = request.cookies.get("sf_code_verifier")?.value;

    // Exchange the authorization code for tokens (with PKCE verifier)
    const tokens = await exchangeCodeForTokens(code, statePayload.env, codeVerifier);

    // Fetch the org's name and ID — pass identity URL from token response to avoid extra round-trip
    const orgInfo = await getOrgInfo(tokens.access_token, tokens.instance_url, tokens.id);

    // Get our internal customer record
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("supabase_user_id", user.id)
      .single();

    if (!customer) {
      return NextResponse.redirect(`${APP_URL}/orgs?error=customer_not_found`);
    }

    // Check if this org is already connected (re-auth — always allowed, no limit check)
    const { data: existing } = await supabase
      .from("connected_orgs")
      .select("id")
      .eq("customer_id", customer.id)
      .eq("org_id", orgInfo.orgId)
      .single();

    if (existing) {
      // Update the tokens (re-auth of existing connection)
      await supabase
        .from("connected_orgs")
        .update({
          access_token: encrypt(tokens.access_token),
          refresh_token: encrypt(tokens.refresh_token),
          instance_url: tokens.instance_url,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      const reconnectRes = NextResponse.redirect(`${APP_URL}/orgs?reconnected=true`);
      reconnectRes.cookies.delete("sf_code_verifier");
      return reconnectRes;
    }

    // New org — check plan limit before creating
    const limitErr = await checkOrgLimit(supabase, customer.id);
    if (limitErr) {
      const limitRes = NextResponse.redirect(`${APP_URL}/orgs?error=${encodeURIComponent(limitErr)}`);
      limitRes.cookies.delete("sf_code_verifier");
      return limitRes;
    }

    // Store the new connection with encrypted tokens
    await supabase.from("connected_orgs").insert({
      customer_id: customer.id,
      org_id: orgInfo.orgId,
      instance_url: tokens.instance_url,
      access_token: encrypt(tokens.access_token),
      refresh_token: encrypt(tokens.refresh_token),
      label: orgInfo.orgName,
      is_sandbox: orgInfo.isSandbox,
      status: "active",
    });

    const successRes = NextResponse.redirect(`${APP_URL}/orgs?connected=true`);
    successRes.cookies.delete("sf_code_verifier");
    return successRes;
  } catch (err) {
    console.error("Salesforce callback error:", err);
    const errRes = NextResponse.redirect(`${APP_URL}/orgs?error=connection_failed`);
    errRes.cookies.delete("sf_code_verifier");
    return errRes;
  }
}
