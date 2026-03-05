"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { PortalHeader } from "./portal-header";
import { Sheet, SheetContent } from "@/components/ui/sheet";

function resolvePageMeta(pathname: string): { title: string; description: string } {
  // Exact matches first
  const exact: Record<string, { title: string; description: string }> = {
    "/dashboard": { title: "Dashboard", description: "Overview of all your sync and migration activity" },
    "/orgs": { title: "Connected Orgs", description: "Manage your Salesforce org connections" },
    "/syncs": { title: "Live Syncs", description: "Continuous, automatic data syncs between orgs" },
    "/syncs/new": { title: "New Live Sync", description: "Set up a new automatic sync configuration" },
    "/migrations": { title: "Migrations", description: "On-demand bulk data transfers between orgs" },
    "/migrations/new": { title: "New Migration", description: "Set up a bulk data migration" },
    "/logs": { title: "Sync Logs", description: "Monitor sync executions and errors" },
    "/support": { title: "Support", description: "Get help and manage support tickets" },
    "/help": { title: "Help & Docs", description: "Guides, common errors, and FAQs" },
    "/settings": { title: "Settings", description: "Manage your account and preferences" },
  };
  if (exact[pathname]) return exact[pathname];

  // Dynamic route patterns
  if (/^\/orgs\/[^/]+\/objects/.test(pathname)) return { title: "Object Browser", description: "Browse objects and fields in this org" };
  if (/^\/syncs\/[^/]+\/edit/.test(pathname)) return { title: "Edit Sync", description: "Update your sync configuration" };
  if (/^\/migrations\/[^/]+/.test(pathname)) return { title: "Migration Detail", description: "View run history and execution details" };
  if (/^\/logs\/[^/]+/.test(pathname)) return { title: "Log Detail", description: "Inspect records, errors, and retry results" };
  if (/^\/support\/[^/]+/.test(pathname)) return { title: "Support Ticket", description: "View and reply to your support ticket" };

  return { title: "SwiftPort", description: "" };
}

interface PortalShellProps {
  children: React.ReactNode;
  userName: string | null;
  userEmail: string | null;
}

export function PortalShell({ children, userName, userEmail }: PortalShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const meta = resolvePageMeta(pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <PortalHeader
          title={meta.title}
          description={meta.description}
          userName={userName ?? undefined}
          userEmail={userEmail ?? undefined}
          onMenuToggle={() => setMobileOpen(true)}
        />
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
