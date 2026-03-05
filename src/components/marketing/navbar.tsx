"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, Zap, LayoutDashboard, LogOut, User, ChevronDown,
  RefreshCw, MoveRight, Package, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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

const featureLinks = [
  {
    href: "/features/live-sync",
    label: "Live Sync",
    description: "Real-time bidirectional org sync",
    icon: RefreshCw,
  },
  {
    href: "/features/migrations",
    label: "Mass Migrations",
    description: "Bulk data movement between orgs",
    icon: MoveRight,
  },
  {
    href: "/features/cpq",
    label: "CPQ Migrations",
    description: "Salesforce CPQ object migrations",
    icon: Package,
  },
  {
    href: "/features/rca",
    label: "RCA Migrations",
    description: "Revenue Cloud Accelerator migrations",
    icon: Zap,
  },
  {
    href: "/features/ai",
    label: "AI Features",
    description: "Smart warnings, analysis & assistant",
    icon: Sparkles,
  },
];

const navLinks = [
  { href: "/security", label: "Security" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          email: data.user.email,
          name: data.user.user_metadata?.full_name,
        });
      }
      setAuthLoading(false);
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-border/50 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-bg shadow-sm shadow-primary/20">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight gradient-text">
            SwiftPort
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {/* Features dropdown */}
          <div
            ref={featuresRef}
            className="relative"
            onMouseEnter={() => setFeaturesOpen(true)}
            onMouseLeave={() => setFeaturesOpen(false)}
          >
            <button className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent">
              Features
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${featuresOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {featuresOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute left-0 top-full mt-1 w-72 rounded-2xl border bg-background/95 backdrop-blur-xl shadow-xl p-2"
                >
                  {featureLinks.map((f) => (
                    <Link
                      key={f.href}
                      href={f.href}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent group"
                      onClick={() => setFeaturesOpen(false)}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gradient-bg-subtle group-hover:gradient-bg transition-all">
                        <f.icon className="h-4 w-4 text-primary group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{f.label}</p>
                        <p className="text-xs text-muted-foreground">{f.description}</p>
                      </div>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop auth area */}
        <div className="hidden items-center gap-3 md:flex">
          {!authLoading && (
            user ? (
              <>
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
                        {user.name && <p className="text-sm font-medium">{user.name}</p>}
                        {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <User className="mr-2 h-4 w-4" />
                        Account Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" className="gradient-bg border-0 text-white hover:opacity-90 transition-opacity" asChild>
                  <Link href="/signup">Get Started Free</Link>
                </Button>
              </>
            )
          )}
        </div>

        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <div className="flex flex-col gap-6 pt-8">
              <div className="flex flex-col gap-1">
                {/* Features section */}
                <button
                  onClick={() => setMobileFeaturesOpen(!mobileFeaturesOpen)}
                  className="flex items-center justify-between rounded-lg px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Features
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mobileFeaturesOpen ? "rotate-180" : ""}`} />
                </button>
                {mobileFeaturesOpen && (
                  <div className="ml-4 flex flex-col gap-1">
                    {featureLinks.map((f) => (
                      <Link
                        key={f.href}
                        href={f.href}
                        onClick={() => { setMobileOpen(false); setMobileFeaturesOpen(false); }}
                        className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <f.icon className="h-4 w-4 text-primary shrink-0" />
                        {f.label}
                      </Link>
                    ))}
                  </div>
                )}
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="flex flex-col gap-3 border-t pt-4">
                {user ? (
                  <>
                    <Button className="gradient-bg border-0 text-white" asChild>
                      <Link href="/dashboard">Go to Dashboard</Link>
                    </Button>
                    <Button variant="outline" onClick={handleSignOut}>Sign out</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild>
                      <Link href="/login">Log in</Link>
                    </Button>
                    <Button className="gradient-bg border-0 text-white" asChild>
                      <Link href="/signup">Get Started Free</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </motion.header>
  );
}
