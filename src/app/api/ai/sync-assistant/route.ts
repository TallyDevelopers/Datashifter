import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/ai/client";

/**
 * POST /api/ai/sync-assistant
 *
 * A conversational AI assistant scoped to the customer's own sync configs,
 * connected orgs, and recent sync logs. Knows the full picture and can
 * answer questions like:
 *   - "What happens with Account to Lead, is it bidirectional?"
 *   - "Could my current mappings cause issues?"
 *   - "Why did my last sync fail?"
 *   - "Is my Contact sync healthy?"
 *
 * Body:
 *   { message: string, history: Array<{ role: "user"|"assistant", content: string }> }
 *
 * Returns:
 *   { reply: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id, plan_tier")
    .eq("supabase_user_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const body = await request.json();
  const { message, history = [] } = body as {
    message: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // ── Fetch context: sync configs + connected orgs only ────────────────────
  const [syncsRes, orgsRes] = await Promise.all([
    supabase
      .from("sync_configs")
      .select(`
        id, name, direction, is_active,
        source_object, target_object,
        trigger_on_create, trigger_on_update, trigger_on_delete,
        filters, field_mappings,
        source_org:connected_orgs!source_org_id(id, label, is_sandbox),
        target_org:connected_orgs!target_org_id(id, label, is_sandbox)
      `)
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("connected_orgs")
      .select("id, label, is_sandbox, status")
      .eq("customer_id", customer.id),
  ]);

  const syncs = syncsRes.data ?? [];
  const orgs = orgsRes.data ?? [];

  // ── Build compact context string for the system prompt ────────────────────
  const orgsContext = orgs.map((o) =>
    `- "${o.label}" (${o.is_sandbox ? "Sandbox" : "Production"}, status: ${o.status})`
  ).join("\n") || "No connected orgs.";

  const syncsContext = syncs.map((s) => {
    const sourceOrg = (s.source_org as unknown as { label: string } | null)?.label ?? s.source_object;
    const targetOrg = (s.target_org as unknown as { label: string } | null)?.label ?? s.target_object;
    const mappings = Array.isArray(s.field_mappings) ? s.field_mappings : [];
    const filters = Array.isArray(s.filters) ? s.filters : [];
    const triggers = [
      s.trigger_on_create && "create",
      s.trigger_on_update && "update",
      s.trigger_on_delete && "delete",
    ].filter(Boolean).join(", ");

    return [
      `Sync: "${s.name}" [${s.is_active ? "ACTIVE" : "PAUSED"}]`,
      `  Direction: ${s.direction === "bidirectional" ? "Bidirectional (both ways)" : "One-way"}`,
      `  Source: ${s.source_object} in "${sourceOrg}"`,
      `  Target: ${s.target_object} in "${targetOrg}"`,
      `  Triggers on: ${triggers || "none configured"}`,
      `  Field mappings: ${mappings.length} mapped fields`,
      filters.length > 0
        ? `  Filters: ${filters.map((f: { field: string; operator: string; value: string }) => `${f.field} ${f.operator} "${f.value}"`).join(", ")}`
        : `  Filters: none (all records sync)`,
    ].join("\n");
  }).join("\n\n") || "No sync configurations yet.";

  const systemPrompt = `You are a helpful AI assistant embedded inside SwiftPort, a Salesforce org-to-org data synchronization platform. You have full visibility into this customer's sync configurations and connected orgs.

You help customers understand their syncs, spot potential issues, and answer questions. Be friendly, concise, and direct. Never make up field names, org names, or config details — only reference what's listed below.

## Connected Orgs
${orgsContext}

## Sync Configurations
${syncsContext}

## Rules
- Only reference data listed above — never invent anything
- Keep answers short: 2-4 sentences for simple questions, bullet points for complex ones
- If a sync doesn't exist, say so clearly
- No markdown headers, plain text or simple bullet points only
- If asked about sync run history or logs, let the customer know you only have config metadata and they can check the Logs page for run history`;

  // ── Call Claude with conversation history ──────────────────────────────────
  try {
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...history.slice(-10), // keep last 10 turns for context window efficiency
      { role: "user", content: message },
    ];

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      system: systemPrompt,
      messages,
    });

    const reply = response.content[0].type === "text"
      ? response.content[0].text.trim()
      : "Sorry, I couldn't generate a response. Please try again.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[sync-assistant] Claude error:", err);
    return NextResponse.json(
      { error: "AI assistant is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
