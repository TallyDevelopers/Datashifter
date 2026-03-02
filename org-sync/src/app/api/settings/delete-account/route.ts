import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get the customer record
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();

  if (customer) {
    // Cascade deletes are set up in the DB so deleting the customer
    // removes: sync_configs → sync_logs → sync_record_errors → sync_record_mappings
    //          connected_orgs, support_tickets, plan_features
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customer.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Delete the Supabase auth user using the service role client
  // The server client created via createClient() uses the service role key server-side,
  // so we can call admin.deleteUser directly.
  const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
  if (authError) {
    // Non-fatal: customer data is gone; auth user cleanup can be manual
    console.error("[delete-account] Failed to delete auth user:", authError.message);
  }

  return NextResponse.json({ ok: true });
}
