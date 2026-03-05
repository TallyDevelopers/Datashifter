import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkSyncConfigLimit, checkSyncFeatures } from "@/lib/plan";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const { data: syncs, error } = await supabase
    .from("sync_configs")
    .select(`
      id, name, direction, is_active, created_at,
      trigger_on_create, trigger_on_update, trigger_on_delete,
      source_object, target_object,
      source_org:connected_orgs!source_org_id(id, label, is_sandbox),
      target_org:connected_orgs!target_org_id(id, label, is_sandbox),
      sync_logs(id, status, records_succeeded, records_failed, records_processed, started_at, completed_at)
    `)
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach ai_summary separately so a missing column never breaks the list
  const syncIds = (syncs ?? []).map((s) => s.id);
  let summaryMap: Record<string, string | null> = {};
  if (syncIds.length > 0) {
    try {
      const { data: summaries } = await supabase
        .from("sync_configs")
        .select("id, ai_summary")
        .in("id", syncIds);
      for (const s of summaries ?? []) summaryMap[s.id] = s.ai_summary ?? null;
    } catch { /* ai_summary column may not exist yet — degrade gracefully */ }
  }

  const enriched = (syncs ?? []).map((s) => ({ ...s, ai_summary: summaryMap[s.id] ?? null }));
  return NextResponse.json({ syncs: enriched });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const body = await request.json();
  const {
    name, source_org_id, source_object, target_org_id, target_object,
    direction, trigger_on_create, trigger_on_update, trigger_on_delete,
    filters, record_type_config, field_mappings, owner_config,
    match_strategy, max_retries, retry_on_partial, notify_on_failure,
  } = body;

  if (!name || !source_org_id || !source_object || !target_org_id || !target_object) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (source_org_id === target_org_id && source_object === target_object) {
    return NextResponse.json({ error: "Source and target cannot be the same object in the same org" }, { status: 400 });
  }

  // Check plan: sync config count limit
  const syncLimitErr = await checkSyncConfigLimit(supabase, customer.id);
  if (syncLimitErr) return NextResponse.json({ error: syncLimitErr }, { status: 403 });

  // Check plan: feature gates
  const featureErr = await checkSyncFeatures(supabase, customer.id, {
    bidirectional: direction === "bidirectional",
    hasFilters: Array.isArray(filters) && filters.length > 0,
    triggerOnDelete: trigger_on_delete === true,
  });
  if (featureErr) return NextResponse.json({ error: featureErr }, { status: 403 });

  // Verify both orgs belong to this customer
  const { data: orgs } = await supabase
    .from("connected_orgs")
    .select("id")
    .eq("customer_id", customer.id)
    .in("id", [source_org_id, target_org_id]);

  if (!orgs || orgs.length < (source_org_id === target_org_id ? 1 : 2)) {
    return NextResponse.json({ error: "One or more orgs not found" }, { status: 404 });
  }

  const insertPayload: Record<string, unknown> = {
    customer_id: customer.id,
    name: name.trim(),
    source_org_id,
    source_object,
    target_org_id,
    target_object,
    direction: direction ?? "one_way",
    trigger_on_create: trigger_on_create ?? true,
    trigger_on_update: trigger_on_update ?? false,
    trigger_on_delete: trigger_on_delete ?? false,
    filters: filters ?? [],
    field_mappings: field_mappings ?? [],
    owner_config: owner_config ?? null,
    max_retries: max_retries ?? 3,
    retry_on_partial: retry_on_partial ?? true,
    notify_on_failure: notify_on_failure ?? true,
    is_active: false,
  };

  // Optional columns that may not exist in all environments — add defensively
  if (record_type_config !== undefined) {
    insertPayload.record_type_config = record_type_config;
  }
  if (match_strategy !== undefined) {
    insertPayload.match_strategy = match_strategy;
  }

  // First try with record_type_config, fall back without it if column is missing
  let sync: { id: string } | null = null;
  let error: { message: string } | null = null;

  const attempt1 = await supabase.from("sync_configs").insert(insertPayload).select("id").single();
  if (attempt1.error?.message?.includes("record_type_config")) {
    // Column doesn't exist yet — retry without it
    const { record_type_config: _rtc, ...payloadWithout } = insertPayload;
    void _rtc;
    const attempt2 = await supabase.from("sync_configs").insert(payloadWithout).select("id").single();
    sync = attempt2.data;
    error = attempt2.error;
  } else {
    sync = attempt1.data;
    error = attempt1.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sync }, { status: 201 });
}
