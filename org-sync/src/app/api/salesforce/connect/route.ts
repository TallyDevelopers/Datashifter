import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildAuthUrl,
  generateCodeVerifier,
  generateCodeChallenge,
  type SalesforceEnv,
} from "@/lib/salesforce/oauth";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const env = (searchParams.get("env") ?? "production") as SalesforceEnv;

  const statePayload = { userId: user.id, env, ts: Date.now() };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

  // PKCE: generate verifier + challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  try {
    const authUrl = buildAuthUrl(state, env, codeChallenge);
    console.log("SF AUTH URL:", authUrl);

    // Store verifier in a short-lived HttpOnly cookie so the callback can retrieve it
    const response = NextResponse.redirect(authUrl);
    response.cookies.set("sf_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("Salesforce connect error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/orgs?error=config_missing`
    );
  }
}
