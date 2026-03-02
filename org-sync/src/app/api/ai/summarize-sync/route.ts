import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/ai/client";

/**
 * POST /api/ai/summarize-sync
 * Generates a plain-English, non-technical one-sentence summary of a sync config
 * and persists it to sync_configs.ai_summary.
 *
 * Called fire-and-forget after create/save — never blocks the user.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    sync_id,
    source_org_label,
    target_org_label,
    source_object,
    target_object,
    direction,
    trigger_on_create,
    trigger_on_update,
    trigger_on_delete,
    field_mappings,
    filters,
  } = body;

  if (!sync_id) return NextResponse.json({ error: "sync_id required" }, { status: 400 });

  // Verify ownership
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const { data: syncRow } = await supabase
    .from("sync_configs")
    .select("id")
    .eq("id", sync_id)
    .eq("customer_id", customer.id)
    .single();
  if (!syncRow) return NextResponse.json({ error: "Sync not found" }, { status: 404 });

  // Build a compact context string for the prompt
  const events: string[] = [];
  if (trigger_on_create) events.push("created");
  if (trigger_on_update) events.push("updated");
  if (trigger_on_delete) events.push("deleted");
  const eventStr = events.join(", ") || "changed";

  const mappingCount = Array.isArray(field_mappings) ? field_mappings.length : 0;
  const filterCount  = Array.isArray(filters)        ? filters.length        : 0;

  const context = [
    `Direction: ${direction === "bidirectional" ? "bidirectional (both ways)" : "one-way"}`,
    `Source: ${source_object} records in "${source_org_label}"`,
    `Target: ${target_object} records in "${target_org_label}"`,
    `Triggers: when records are ${eventStr}`,
    mappingCount > 0 ? `${mappingCount} field mapping${mappingCount !== 1 ? "s" : ""} configured` : "no field mappings yet",
    filterCount  > 0 ? `${filterCount} filter condition${filterCount  !== 1 ? "s" : ""} applied`  : "no filters (all records sync)",
  ].join(". ");

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 120,
      system: `You write one-sentence plain-English summaries of Salesforce data sync configurations.
Rules:
- One sentence only, no bullet points, no markdown.
- Write for a non-technical business user, not a developer.
- Do not use words like "upsert", "API", "webhook", "polling", "trigger", "DML".
- Use natural language like "keeps in sync", "automatically copies", "mirrors changes".
- Keep it under 30 words.
- Do not start with "This sync" — vary the opening.`,
      messages: [{
        role: "user",
        content: `Summarize this sync config in one sentence:\n${context}`,
      }],
    });

    const summary = response.content[0].type === "text"
      ? response.content[0].text.trim().replace(/^["']|["']$/g, "")
      : null;

    if (summary) {
      await supabase
        .from("sync_configs")
        .update({ ai_summary: summary })
        .eq("id", sync_id);
    }

    return NextResponse.json({ summary });
  } catch (err) {
    // Non-fatal — the card falls back to the deterministic sentence
    console.error("AI summary failed:", err);
    return NextResponse.json({ summary: null }, { status: 200 });
  }
}
