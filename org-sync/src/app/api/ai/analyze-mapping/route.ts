import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askClaude } from "@/lib/ai/client";

interface FieldMeta {
  api_name: string;
  label: string;
  field_type: string;
  is_required: boolean;
  is_createable: boolean;
  is_updateable: boolean;
}

interface Mapping {
  source_field: string;
  source_label: string;
  target_field: string;
  target_label: string;
}

interface MappingAnalysis {
  overall_score: "good" | "warning" | "error";
  summary: string;
  mapping_results: {
    source_field: string;
    target_field: string;
    confidence: "high" | "medium" | "low";
    status: "ok" | "warning" | "error";
    message: string | null;
  }[];
  suggested_mappings: {
    source_field: string;
    source_label: string;
    target_field: string;
    target_label: string;
    reason: string;
  }[];
  unmapped_required_targets: {
    api_name: string;
    label: string;
  }[];
}

const SYSTEM_PROMPT = `You are a Salesforce data integration expert. Analyze field mappings between two Salesforce objects and return a JSON analysis.

Your response must be valid JSON matching this exact shape:
{
  "overall_score": "good" | "warning" | "error",
  "summary": "1-2 sentence plain English summary of the mapping quality",
  "mapping_results": [
    {
      "source_field": "api_name",
      "target_field": "api_name",
      "confidence": "high" | "medium" | "low",
      "status": "ok" | "warning" | "error",
      "message": "Specific issue or null if ok"
    }
  ],
  "suggested_mappings": [
    {
      "source_field": "api_name",
      "source_label": "label",
      "target_field": "api_name",
      "target_label": "label",
      "reason": "Why this mapping makes sense"
    }
  ],
  "unmapped_required_targets": [
    { "api_name": "api_name", "label": "label" }
  ]
}

Rules for analysis:
- Flag type mismatches (e.g. Currency → Text, Date → Checkbox) as warnings or errors
- Flag mapping to read-only target fields (is_createable=false AND is_updateable=false) as errors
- Flag required target fields that are not mapped as errors
- Suggest additional mappings for unmapped source fields that semantically match unmapped target fields
- Only suggest mappings for target fields that are createable or updateable
- Do not suggest mappings that already exist
- Keep messages short and actionable (max 15 words)`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { mappings, sourceFields, targetFields, sourceObject, targetObject } = body as {
    mappings: Mapping[];
    sourceFields: FieldMeta[];
    targetFields: FieldMeta[];
    sourceObject: string;
    targetObject: string;
  };

  if (!mappings?.length || !sourceFields?.length || !targetFields?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const userContent = `
Source Object: ${sourceObject}
Target Object: ${targetObject}

Current Mappings:
${mappings.map((m) => `  ${m.source_field} (${sourceFields.find(f => f.api_name === m.source_field)?.field_type ?? "unknown"}) → ${m.target_field} (${targetFields.find(f => f.api_name === m.target_field)?.field_type ?? "unknown"}, createable=${targetFields.find(f => f.api_name === m.target_field)?.is_createable}, required=${targetFields.find(f => f.api_name === m.target_field)?.is_required})`).join("\n")}

All Source Fields:
${sourceFields.slice(0, 60).map((f) => `  ${f.api_name} | ${f.label} | ${f.field_type} | required=${f.is_required}`).join("\n")}

All Target Fields:
${targetFields.slice(0, 60).map((f) => `  ${f.api_name} | ${f.label} | ${f.field_type} | required=${f.is_required} | createable=${f.is_createable} | updateable=${f.is_updateable}`).join("\n")}

Analyze these mappings and suggest improvements. Return only valid JSON.`;

  try {
    const analysis = await askClaude<MappingAnalysis>(SYSTEM_PROMPT, userContent);
    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("[ai/analyze-mapping]", err);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }
}
