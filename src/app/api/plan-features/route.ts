import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/plan-features?tier=starter
 * Returns the plan_features row for the current customer's plan tier.
 * Also accepts an explicit ?tier= for convenience.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Resolve tier: from query param or from customer record
  let tier = request.nextUrl.searchParams.get("tier");
  if (!tier) {
    const { data: customer } = await supabase
      .from("customers")
      .select("plan_tier")
      .eq("supabase_user_id", user.id)
      .single();
    tier = customer?.plan_tier ?? "starter";
  }

  const { data: features, error } = await supabase
    .from("plan_features")
    .select("*")
    .eq("plan_tier", tier)
    .single();

  if (error || !features) {
    // Fail open — return all features enabled so UI never incorrectly blocks
    return NextResponse.json({
      plan_tier: tier,
      can_use_filters: true,
      can_use_bidirectional: true,
      can_use_delete_sync: true,
      can_use_ai: true,
      can_use_scheduling: true,
      max_connected_orgs: 999,
      max_sync_configs: 999,
      max_records_per_month: 999999,
      log_retention_days: 365,
    });
  }

  return NextResponse.json(features);
}
