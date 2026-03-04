import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getJobAndCustomer(jobId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401, supabase, customer: null, job: null };

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return { error: "Customer not found", status: 404, supabase, customer: null, job: null };

  const { data: job, error } = await supabase
    .from("cpq_jobs")
    .select(`
      id, name, description, is_active, interval_minutes, last_run_at, created_at, updated_at,
      source_org_id, target_org_id,
      source_org:connected_orgs!source_org_id(id, label, is_sandbox),
      target_org:connected_orgs!target_org_id(id, label, is_sandbox),
      cpq_job_objects(id, step_order, label, source_object, target_object, field_mappings, filters, record_type_config, owner_config)
    `)
    .eq("id", jobId)
    .eq("customer_id", customer.id)
    .single();

  if (error || !job) return { error: "Job not found", status: 404, supabase, customer, job: null };
  return { error: null, status: 200, supabase, customer, job };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const { error, status, job, supabase, customer } = await getJobAndCustomer(jobId);
  if (error || !job) return NextResponse.json({ error }, { status });

  // Fetch run history
  const { data: runs } = await supabase
    .from("cpq_job_runs")
    .select(`
      id, status, triggered_by, started_at, completed_at,
      cpq_job_run_steps(id, step_order, source_object, target_object, status, records_queried, records_succeeded, records_failed, error_details, skip_reason, started_at, completed_at)
    `)
    .eq("job_id", jobId)
    .order("started_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ job: { ...job, runs: runs ?? [] } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const { error, status, supabase, customer } = await getJobAndCustomer(jobId);
  if (error || !customer) return NextResponse.json({ error }, { status });

  const body = await request.json();
  const allowed = ["name", "description", "interval_minutes", "is_active", "source_org_id", "target_org_id"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0 && !body.steps) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Update job metadata
  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from("cpq_jobs")
      .update(updates)
      .eq("id", jobId)
      .eq("customer_id", customer.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Replace steps if provided
  if (body.steps) {
    await supabase.from("cpq_job_objects").delete().eq("job_id", jobId);
    const stepRows = (body.steps as Array<{
      step_order: number;
      label?: string;
      source_object: string;
      target_object: string;
      field_mappings?: unknown[];
      filters?: unknown[];
      record_type_config?: unknown;
      owner_config?: unknown;
    }>).map((s) => ({
      job_id: jobId,
      step_order: s.step_order,
      label: s.label ?? null,
      source_object: s.source_object,
      target_object: s.target_object,
      field_mappings: s.field_mappings ?? [],
      filters: s.filters ?? [],
      record_type_config: s.record_type_config ?? { strategy: "none" },
      owner_config: s.owner_config ?? null,
    }));
    const { error: stepsError } = await supabase.from("cpq_job_objects").insert(stepRows);
    if (stepsError) return NextResponse.json({ error: stepsError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const { error, status, supabase, customer } = await getJobAndCustomer(jobId);
  if (error || !customer) return NextResponse.json({ error }, { status });

  const { error: deleteError } = await supabase
    .from("cpq_jobs")
    .delete()
    .eq("id", jobId)
    .eq("customer_id", customer.id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
