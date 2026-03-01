import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: adminRecord } = await supabase
    .from("admin_users")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();

  if (!adminRecord) redirect("/dashboard");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center border-b bg-card px-6">
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </p>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
