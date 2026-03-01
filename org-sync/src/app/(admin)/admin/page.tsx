import { createAdminClient } from "@/lib/supabase/admin";
import { Users, LifeBuoy, ArrowLeftRight, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminOverviewPage() {
  const db = createAdminClient();

  const [
    { count: customerCount },
    { count: orgCount },
    { count: syncCount },
    { count: openTicketCount },
  ] = await Promise.all([
    db.from("customers").select("*", { count: "exact", head: true }),
    db.from("connected_orgs").select("*", { count: "exact", head: true }),
    db.from("sync_configs").select("*", { count: "exact", head: true }).eq("is_active", true),
    db.from("support_tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
  ]);

  const stats = [
    { label: "Total Customers", value: customerCount ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Connected Orgs", value: orgCount ?? 0, icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Active Syncs", value: syncCount ?? 0, icon: ArrowLeftRight, color: "text-green-600", bg: "bg-green-50" },
    { label: "Open Tickets", value: openTicketCount ?? 0, icon: LifeBuoy, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform-wide metrics across all customers.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="mt-3 text-2xl font-bold">{stat.value.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
