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
  picklist_values?: { value: string; label: string }[];
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
- Flag ANY mapping where the target field_type is "reference" or "lookup" as an error with message: "Lookup field — source org record IDs are invalid in target org. Sync the parent object first or use an external ID field."
- CRITICAL: When BOTH source and target fields are picklist or multipicklist type AND picklist_values are provided for both, compare the value sets. If the source has values that do not exist in the target, flag as a WARNING with a message listing the missing values (max 3 shown, then "+N more"). Example: "Source values not in target: 'Hot', 'Cold' — records with these values will be rejected."
- If a picklist mapping has ZERO overlapping values between source and target, flag as an ERROR instead of a warning.
- Suggest additional mappings for unmapped source fields that semantically match unmapped target fields
- Only suggest mappings for target fields that are createable or updateable
- Do not suggest mappings that already exist
- Keep messages short and actionable (max 20 words)`;

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

  // Build picklist mismatch detail for mapped picklist pairs
  const picklistDetails = mappings
    .map((m) => {
      const sf = sourceFields.find((f) => f.api_name === m.source_field);
      const tf = targetFields.find((f) => f.api_name === m.target_field);
      if (
        sf && tf &&
        (sf.field_type === "picklist" || sf.field_type === "multipicklist") &&
        (tf.field_type === "picklist" || tf.field_type === "multipicklist") &&
        sf.picklist_values?.length && tf.picklist_values?.length
      ) {
        const srcVals = sf.picklist_values.map((v) => v.value);
        const tgtVals = new Set(tf.picklist_values.map((v) => v.value));
        const missing = srcVals.filter((v) => !tgtVals.has(v));
        const overlap = srcVals.filter((v) => tgtVals.has(v));
        return `  PICKLIST DETAIL ${m.source_field} → ${m.target_field}:\n    Source values: [${srcVals.join(", ")}]\n    Target values: [${[...tgtVals].join(", ")}]\n    Missing in target: [${missing.join(", ") || "none"}]\n    Overlap: ${overlap.length}/${srcVals.length} values match`;
      }
      return null;
    })
    .filter(Boolean)
    .join("\n");

  const userContent = `
Source Object: ${sourceObject}
Target Object: ${targetObject}

Current Mappings:
${mappings.map((m) => {
    const sf = sourceFields.find((f) => f.api_name === m.source_field);
    const tf = targetFields.find((f) => f.api_name === m.target_field);
    return `  ${m.source_field} (${sf?.field_type ?? "unknown"}) → ${m.target_field} (${tf?.field_type ?? "unknown"}, createable=${tf?.is_createable}, required=${tf?.is_required})`;
  }).join("\n")}
${picklistDetails ? `\nPicklist Value Analysis:\n${picklistDetails}` : ""}

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
