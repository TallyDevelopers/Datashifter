import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin");

  // Verify admin_users row exists for this user
  const { data: adminRecord } = await supabase
    .from("admin_users")
    .select("id, role, email")
    .eq("supabase_user_id", user.id)
    .single();

  if (!adminRecord) redirect("/dashboard");

  return (
    <AdminShell adminEmail={user.email ?? ""} adminRole={adminRecord.role}>
      {children}
    </AdminShell>
  );
}
