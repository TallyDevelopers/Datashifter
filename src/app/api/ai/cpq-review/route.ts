import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/salesforce/metadata";
import Anthropic from "@anthropic-ai/sdk";

const SF_API_VERSION = "v59.0";

export interface CpqReviewWarning {
  step: number;
  object: string;
  field: string | null;
  severity: "error" | "warn" | "info";
  message: string;
}

interface StepInput {
  step_order: number;
  label?: string;
  source_object: string;
  target_object: string;
  field_mappings: Array<{ source_field: string; target_field: string }>;
  filters?: Array<{ field: string; operator: string; value: string }>;
}

async function describeSObject(
  instanceUrl: string,
  accessToken: string,
  sobjectType: string
): Promise<{
  fields: Array<{
    name: string;
    label: string;
    type: string;
    nillable: boolean;
    referenceTo: string[];
    relationshipName: string | null;
    createable: boolean;
    updateable: boolean;
  }>;
}> {
  const url = `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/${sobjectType}/describe?_ts=${Date.now()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, "Cache-Control": "no-cache" },
  });
  if (!res.ok) throw new Error(`describeSObject failed for ${sobjectType}: ${res.status}`);
  const data = await res.json() as {
    fields: Array<{
      name: string;
      label: string;
      type: string;
      nillable: boolean;
      referenceTo: string[];
      relationshipName: string | null;
      createable: boolean;
      updateable: boolean;
    }>;
  };
  return { fields: data.fields };
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

  const body = await request.json() as {
    source_org_id: string;
    target_org_id: string;
    steps: StepInput[];
  };

  const { source_org_id, target_org_id, steps } = body;

  if (!source_org_id || !target_org_id || !steps?.length) {
    return NextResponse.json({ error: "source_org_id, target_org_id, and steps are required" }, { status: 400 });
  }

  // Get tokens for both orgs
  let sourceToken: { accessToken: string; instanceUrl: string };
  let targetToken: { accessToken: string; instanceUrl: string };
  try {
    [sourceToken, targetToken] = await Promise.all([
      getValidAccessToken(source_org_id),
      getValidAccessToken(target_org_id),
    ]);
  } catch (err) {
    return NextResponse.json({ error: `Failed to connect to orgs: ${err}` }, { status: 500 });
  }

  // Describe each object in the chain from both orgs
  const objectNames = [...new Set(steps.flatMap((s) => [s.source_object, s.target_object]))];
  const sourceDescriptions: Record<string, ReturnType<typeof describeSObject> extends Promise<infer T> ? T : never> = {};
  const targetDescriptions: Record<string, ReturnType<typeof describeSObject> extends Promise<infer T> ? T : never> = {};

  await Promise.all(
    objectNames.map(async (name) => {
      try {
        sourceDescriptions[name] = await describeSObject(sourceToken.instanceUrl, sourceToken.accessToken, name);
      } catch { /* object may only exist on one side */ }
      try {
        targetDescriptions[name] = await describeSObject(targetToken.instanceUrl, targetToken.accessToken, name);
      } catch { /* object may only exist on one side */ }
    })
  );

  // Build a compact representation for Claude
  const objectsInChain = steps.map((s) => s.source_object);

  const stepSummaries = steps.map((s) => {
    const srcFields = sourceDescriptions[s.source_object]?.fields ?? [];
    const tgtFields = targetDescriptions[s.target_object]?.fields ?? [];

    const lookupFields = tgtFields.filter((f) => f.type === "reference" && f.createable);
    const requiredTargetFields = tgtFields.filter((f) => !f.nillable && f.createable && f.updateable);
    const mappedTargetFields = s.field_mappings.map((m) => m.target_field);

    return {
      step: s.step_order,
      label: s.label ?? s.source_object,
      source_object: s.source_object,
      target_object: s.target_object,
      mapped_fields: s.field_mappings.length,
      lookup_fields_on_target: lookupFields.map((f) => ({
        name: f.name,
        referenceTo: f.referenceTo,
      })),
      required_unmapped: requiredTargetFields
        .filter((f) => !mappedTargetFields.includes(f.name))
        .map((f) => f.name),
      source_field_count: srcFields.length,
      target_field_count: tgtFields.length,
    };
  });

  const systemPrompt = `You are a Salesforce data integration expert reviewing a CPQ/RCA integration job.
You will receive a list of steps (object chains) in execution order.
Your job is to identify dependency risks, foreign key issues, and missing required field mappings.

Return ONLY a JSON array of warnings. Each warning:
{
  "step": <step_order number>,
  "object": "<source_object api name>",
  "field": "<field name or null>",
  "severity": "error" | "warn" | "info",
  "message": "<plain English explanation, max 2 sentences>"
}

Rules:
- "error": will almost certainly cause failures (e.g. lookup field references an object not in the chain or in a later step)
- "warn": likely to cause issues but may work in some cases (e.g. required field unmapped but has a default)
- "info": worth knowing but unlikely to fail (e.g. step order note)
- Flag lookup fields on target objects that reference objects NOT present in this job at all
- Flag lookup fields that reference objects that appear AFTER this step (will fail because parent doesn't exist yet)
- Flag required fields on the target that are not mapped
- Do NOT flag SwiftPort_Source_Id__c — that is handled automatically
- If everything looks clean, return an empty array []
- Keep messages friendly, non-technical where possible`;

  const userContent = `Objects in chain (in execution order): ${objectsInChain.join(", ")}

Steps:
${JSON.stringify(stepSummaries, null, 2)}`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const text = (response.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ warnings: [] });

    const warnings: CpqReviewWarning[] = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ warnings });
  } catch (err) {
    console.error("[cpq-review] AI error:", err);
    return NextResponse.json({ warnings: [], error: "AI review unavailable" });
  }
}
