import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askClaude } from "@/lib/ai/client";

interface ErrorInput {
  id: string;
  error_code: string;
  error_message: string;
  source_record_id: string;
}

interface ErrorExplanation {
  id: string;
  plain_english: string;
  suggested_fix: string;
  fix_type: "mapping" | "permissions" | "data" | "config" | "other";
}

interface ErrorAnalysisResponse {
  explanations: ErrorExplanation[];
}

const SYSTEM_PROMPT = `You are a Salesforce integration expert. Explain Salesforce API errors in plain English and suggest specific fixes.

Return valid JSON matching this exact shape:
{
  "explanations": [
    {
      "id": "the error id passed in",
      "plain_english": "1 sentence explaining what went wrong in plain English (no jargon)",
      "suggested_fix": "1 specific actionable sentence telling the user exactly what to change",
      "fix_type": "mapping" | "permissions" | "data" | "config" | "other"
    }
  ]
}

Common error patterns:
- INVALID_FIELD_FOR_INSERT_UPDATE with "Name": Name on Contact/Lead is read-only, map to FirstName/LastName instead
- REQUIRED_FIELD_MISSING: A required field on the target object has no value mapped
- INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY: The connected user lacks permission on a related record
- FIELD_CUSTOM_VALIDATION_EXCEPTION: A validation rule on the target org is blocking the insert/update
- DUPLICATE_VALUE: A unique field already has this value in the target org
- STRING_TOO_LONG: Source value exceeds the target field's max length
Keep explanations under 20 words each. Be direct and friendly.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { errors, syncConfigContext } = body as {
    errors: ErrorInput[];
    syncConfigContext?: { sourceObject: string; targetObject: string };
  };

  if (!errors?.length) {
    return NextResponse.json({ error: "No errors provided" }, { status: 400 });
  }

  const userContent = `
${syncConfigContext ? `Sync context: ${syncConfigContext.sourceObject} → ${syncConfigContext.targetObject}` : ""}

Errors to explain:
${errors.map((e) => `ID: ${e.id}
  Error Code: ${e.error_code}
  Error Message: ${e.error_message}
  Record ID: ${e.source_record_id}`).join("\n\n")}

Return only valid JSON with explanations for each error.`;

  try {
    const result = await askClaude<ErrorAnalysisResponse>(SYSTEM_PROMPT, userContent);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[ai/analyze-errors]", err);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }
}
