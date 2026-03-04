import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askClaude } from "@/lib/ai/client";

interface NLSyncResult {
  understood: boolean;
  config: {
    name: string;
    source_object: string;
    target_object: string;
    direction: "one_way" | "bidirectional";
    trigger_on_create: boolean;
    trigger_on_update: boolean;
    trigger_on_delete: boolean;
    field_mappings: {
      source_field: string;
      source_label: string;
      target_field: string;
      target_label: string;
    }[];
    filters: {
      field: string;
      operator: string;
      value: string;
    }[];
  } | null;
  clarification_needed: string | null;
  summary: string;
}

const SYSTEM_PROMPT = `You are a Salesforce integration assistant. Parse natural language sync configuration requests into structured JSON.

Return valid JSON matching this exact shape:
{
  "understood": true | false,
  "config": {
    "name": "A short descriptive name for this sync",
    "source_object": "Salesforce API name e.g. Account",
    "target_object": "Salesforce API name e.g. Contact",
    "direction": "one_way" | "bidirectional",
    "trigger_on_create": true | false,
    "trigger_on_update": true | false,
    "trigger_on_delete": true | false,
    "field_mappings": [
      {
        "source_field": "API name",
        "source_label": "Human label",
        "target_field": "API name",
        "target_label": "Human label"
      }
    ],
    "filters": []
  } | null,
  "clarification_needed": "Question to ask if unclear, or null",
  "summary": "1 sentence confirming what you understood"
}

Rules:
- Use standard Salesforce API names (Account, Contact, Lead, Opportunity, Case etc.)
- If no direction specified, default to one_way
- If no triggers specified, default trigger_on_create=true, trigger_on_update=false, trigger_on_delete=false
- If field mappings are mentioned, include them. Common mappings: Name→LastName, Phone→Phone, Email→Email
- If the request is too vague to parse, set understood=false, config=null, and ask for clarification
- Always return valid JSON only`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { prompt, availableOrgs } = body as {
    prompt: string;
    availableOrgs?: { label: string; id: string }[];
  };

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
  }

  const userContent = `
${availableOrgs?.length ? `Available orgs: ${availableOrgs.map((o) => o.label).join(", ")}` : ""}

User request: "${prompt}"

Parse this into a sync configuration. Return only valid JSON.`;

  try {
    const result = await askClaude<NLSyncResult>(SYSTEM_PROMPT, userContent);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[ai/natural-language-sync]", err);
    return NextResponse.json({ error: "AI parsing failed" }, { status: 500 });
  }
}
