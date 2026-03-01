"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { PortalHeader } from "./portal-header";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const pageMeta: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Dashboard", description: "Overview of your sync activity" },
  "/orgs": { title: "Connected Orgs", description: "Manage your Salesforce org connections" },
  "/syncs": { title: "Sync Configurations", description: "Configure and manage your data syncs" },
  "/logs": { title: "Sync Logs", description: "Monitor sync executions and errors" },
  "/support": { title: "Support", description: "Get help and manage support tickets" },
};

interface PortalShellProps {
  children: React.ReactNode;
  userName: string | null;
  userEmail: string | null;
}

export function PortalShell({ children, userName, userEmail }: PortalShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const meta = pageMeta[pathname] || { title: "Portal", description: "" };

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
