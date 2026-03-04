import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // Verify job belongs to customer
  const { data: job } = await supabase
    .from("cpq_jobs")
    .select("id, is_active")
    .eq("id", jobId)
    .eq("customer_id", customer.id)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Create a run record — the worker will pick it up on next cycle
  // (or optionally we mark it so the worker runs it immediately)
  const { data: run, error: runError } = await supabase
    .from("cpq_job_runs")
    .insert({
      job_id: jobId,
      status: "running",
      triggered_by: "manual",
    })
    .select()
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: runError?.message ?? "Failed to create run" }, { status: 500 });
  }

  // Update last_run_at on the job
  await supabase
    .from("cpq_jobs")
    .update({ last_run_at: new Date().toISOString() })
    .eq("id", jobId);

  return NextResponse.json({ run }, { status: 201 });
}
