"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, LifeBuoy, Zap, LogOut,
  ChevronLeft, ChevronRight, ExternalLink, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/tickets", label: "Support Queue", icon: LifeBuoy },
];

interface AdminShellProps {
  children: React.ReactNode;
  adminEmail: string;
  adminRole: string;
}

export function AdminShell({ children, adminEmail, adminRole }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = adminEmail?.[0]?.toUpperCase() ?? "A";

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <aside className={cn(
          "flex h-screen flex-col border-r bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}>
          {/* Brand */}
          <div className={cn(
            "flex h-16 items-center border-b px-4",
            collapsed ? "justify-center" : "justify-between"
          )}>
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-600 shadow-md">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              {!collapsed && (
                <div>
                  <span className="text-sm font-bold tracking-tight text-foreground">SwiftPort</span>
                  <span className="ml-1.5 text-xs font-semibold text-red-600 uppercase tracking-wider">Admin</span>
                </div>
              )}
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-0.5 p-3">
            {!collapsed && (
              <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Admin
              </p>
            )}
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              const link = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }
              return link;
            })}
          </nav>

          {/* Bottom */}
          <div className="border-t p-3 space-y-1">
            {!collapsed && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-1">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-red-600 text-[10px] font-bold text-white">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{adminEmail}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{adminRole.replace("_", " ")}</p>
                </div>
              </div>
            )}
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link href="/dashboard" className="flex items-center justify-center rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Customer Portal</TooltipContent>
              </Tooltip>
            ) : (
              <Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <ExternalLink className="h-3.5 w-3.5" />
                Customer Portal
              </Link>
            )}
            <button
              onClick={handleLogout}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
                collapsed && "justify-center"
              )}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && <span>Sign out</span>}
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span className="text-xs">Collapse</span></>}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-red-600" />
              <span className="text-sm font-semibold text-red-600">Admin Console</span>
              <span className="text-muted-foreground text-sm">— SwiftPort</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                <Zap className="h-3.5 w-3.5" />
                Switch to portal
              </Link>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    </TooltipProvider>
  );
}
