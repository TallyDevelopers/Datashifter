import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { data: jobs, error } = await supabase
    .from("cpq_jobs")
    .select(`
      id, name, description, is_active, interval_minutes, last_run_at, created_at,
      source_org:connected_orgs!source_org_id(id, label, is_sandbox),
      target_org:connected_orgs!target_org_id(id, label, is_sandbox),
      cpq_job_objects(id, step_order, label, source_object, target_object),
      cpq_job_runs(id, status, started_at, completed_at)
    `)
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: jobs ?? [] });
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
    name, description,
    source_org_id, target_org_id,
    interval_minutes,
    is_active,
    steps, // array of cpq_job_objects
  } = body;

  if (!name || !source_org_id || !target_org_id || !steps?.length) {
    return NextResponse.json({ error: "name, source_org_id, target_org_id, and steps are required" }, { status: 400 });
  }

  // Verify orgs belong to customer
  const { data: orgs } = await supabase
    .from("connected_orgs")
    .select("id")
    .eq("customer_id", customer.id)
    .in("id", [source_org_id, target_org_id]);

  // When source and target are the same org, the IN query returns 1 row — that's fine.
  const uniqueOrgIds = [...new Set([source_org_id, target_org_id])];
  if (!orgs || orgs.length < uniqueOrgIds.length) {
    return NextResponse.json({ error: "One or more orgs not found or not owned by you" }, { status: 403 });
  }

  // Create job
  const { data: job, error: jobError } = await supabase
    .from("cpq_jobs")
    .insert({
      customer_id: customer.id,
      name,
      description: description ?? null,
      source_org_id,
      target_org_id,
      interval_minutes: interval_minutes ?? 60,
      is_active: is_active ?? false,
    })
    .select()
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message ?? "Failed to create job" }, { status: 500 });
  }

  // Insert ordered steps
  const stepRows = (steps as Array<{
    step_order: number;
    label?: string;
    source_object: string;
    target_object: string;
    field_mappings?: unknown[];
    filters?: unknown[];
    match_strategy?: unknown;
    record_type_config?: unknown;
    owner_config?: unknown;
  }>).map((s) => ({
    job_id: job.id,
    step_order: s.step_order,
    label: s.label ?? null,
    source_object: s.source_object,
    target_object: s.target_object,
    field_mappings: s.field_mappings ?? [],
    filters: s.filters ?? [],
    match_strategy: s.match_strategy ?? { type: "none" },
    record_type_config: s.record_type_config ?? { strategy: "none" },
    owner_config: s.owner_config ?? null,
  }));

  const { error: stepsError } = await supabase.from("cpq_job_objects").insert(stepRows);
  if (stepsError) {
    // Rollback job
    await supabase.from("cpq_jobs").delete().eq("id", job.id);
    return NextResponse.json({ error: stepsError.message }, { status: 500 });
  }

  return NextResponse.json({ job }, { status: 201 });
}
