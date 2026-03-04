import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { full_name } = body;

  if (!full_name?.trim()) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  }

  // Update Supabase auth metadata
  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: full_name.trim() },
  });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  // Also update customers table if it has a name column
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();

  if (customer) {
    await supabase
      .from("customers")
      .update({ name: full_name.trim() })
      .eq("id", customer.id);
  }

  return NextResponse.json({ ok: true });
}
