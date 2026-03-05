"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, LifeBuoy, Zap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Overview", icon: ShieldCheck, exact: true },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/tickets", label: "Support Tickets", icon: LifeBuoy },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-bg">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight">SwiftPort</p>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          ← Back to Portal
        </Link>
      </div>
    </aside>
  );
}
