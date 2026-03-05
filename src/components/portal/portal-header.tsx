"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Settings, User, Menu, Zap, BookOpen, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

interface PortalHeaderProps {
  title: string;
  description?: string;
  userEmail?: string;
  userName?: string;
  onMenuToggle?: () => void;
}

export function PortalHeader({
  title,
  description,
  userEmail,
  userName,
  onMenuToggle,
}: PortalHeaderProps) {
  const router = useRouter();
  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : userEmail
      ? userEmail[0].toUpperCase()
      : "U";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {/* Brand — visible on mobile where sidebar is hidden */}
        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-bg shadow-sm shadow-primary/20">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight gradient-text">SwiftPort</span>
        </Link>
        {/* Page title — visible on desktop */}
        <div className="hidden lg:block">
          <h1 className="text-base font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Help shortcut */}
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" asChild>
          <Link href="/help" title="Help & Docs">
            <BookOpen className="h-4 w-4" />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="gradient-bg text-xs font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                {userName && (
                  <p className="text-sm font-medium leading-none">{userName}</p>
                )}
                {userEmail && (
                  <p className="text-xs text-muted-foreground leading-none mt-1">{userEmail}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile & Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/help" className="cursor-pointer">
                <BookOpen className="mr-2 h-4 w-4" />
                Help & Docs
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
