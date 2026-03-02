"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, AlertTriangle, RotateCcw, Sparkles,
  ArrowRight, Loader2, ShieldCheck, Activity, Eye, LayoutDashboard,
  Wrench, ShieldAlert,
} from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ─── Tab data ─────────────────────────────────────────────────────────────────

const tabs = [
  { id: "logs", label: "Sync Activity", icon: Activity },
  { id: "errors", label: "Error Details", icon: XCircle },
  { id: "preflight", label: "Pre-flight Test", icon: ShieldCheck },
] as const;

type TabId = typeof tabs[number]["id"];

// ─── Mock UI: Sync Logs ───────────────────────────────────────────────────────

const mockLogs = [
  {
    name: "Account Sync",
    from: "Production",
    to: "Sandbox",
    status: "success" as const,
    succeeded: 142,
    failed: 0,
    when: "2m ago",
    duration: "1.4s",
  },
  {
    name: "Contact → Lead",
    from: "EMEA Org",
    to: "US Org",
    status: "partial" as const,
    succeeded: 89,
    failed: 3,
    when: "4m ago",
    duration: "2.1s",
  },
  {
    name: "Opportunity Sync",
    from: "Production",
    to: "Partner Org",
    status: "failed" as const,
    succeeded: 0,
    failed: 12,
    when: "6m ago",
    duration: "0.8s",
  },
  {
    name: "Account Sync",
    from: "Production",
    to: "Sandbox",
    status: "success" as const,
    succeeded: 138,
    failed: 0,
    when: "8m ago",
    duration: "1.3s",
  },
];

const STATUS = {
  success: { label: "Success", className: "border-green-200 bg-green-50 text-green-700", icon: CheckCircle2 },
  partial: { label: "Partial", className: "border-yellow-200 bg-yellow-50 text-yellow-700", icon: AlertTriangle },
  failed: { label: "Failed", className: "border-red-200 bg-red-50 text-red-700", icon: XCircle },
  running: { label: "Running", className: "border-blue-200 bg-blue-50 text-blue-700", icon: Loader2 },
};

function LogsTab() {
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      {/* Filter bar */}
      <div className="flex items-center gap-1 border-b bg-muted/30 px-4 py-2.5">
        {["All", "Success", "Partial", "Failed"].map((f, i) => (
          <button
            key={f}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-all",
              i === 0 ? "gradient-bg text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f}
          </button>
        ))}
        <div className="ml-auto text-xs text-muted-foreground">4 logs</div>
      </div>
      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs font-semibold text-muted-foreground">
            <th className="px-4 py-2.5 text-left">Sync</th>
            <th className="px-3 py-2.5 text-left">Status</th>
            <th className="px-3 py-2.5 text-right">Succeeded</th>
            <th className="px-3 py-2.5 text-right">Failed</th>
            <th className="px-3 py-2.5 text-left">When</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {mockLogs.map((log, i) => {
            const cfg = STATUS[log.status];
            const Icon = cfg.icon;
            return (
              <tr key={i} className={cn("group transition-colors hover:bg-muted/30", log.status === "partial" || log.status === "failed" ? "cursor-pointer" : "")}>
                <td className="px-4 py-3">
                  <p className="font-medium text-xs">{log.name}</p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                    <span>{log.from}</span>
                    <ArrowRight className="h-2.5 w-2.5" />
                    <span>{log.to}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", cfg.className)}>
                    <Icon className="h-2.5 w-2.5" />
                    {cfg.label}
                  </span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-xs">
                  <span className="text-green-600">{log.succeeded}</span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-xs">
                  {log.failed > 0
                    ? <span className="font-semibold text-red-600">{log.failed}</span>
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-3 text-[11px] text-muted-foreground">{log.when}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Mock UI: Error Panel ─────────────────────────────────────────────────────

const mockErrors = [
  {
    id: "0051A000005ABCDEF",
    code: "REQUIRED_FIELD_MISSING",
    message: "Required fields are missing: [Rating]",
    ai: {
      plain: "The target org requires the 'Rating' field to be filled in, but it wasn't included in your field mapping.",
      fix: "Add Rating → Rating in your field mapping, or set a default value for Rating in the target org.",
      action: { label: "Fix field mapping", icon: Wrench, type: "mapping" },
    },
  },
  {
    id: "0051A000005XYZDEF",
    code: "INVALID_CROSS_REFERENCE_KEY",
    message: "Record ID 005Qy000001ABCDE does not exist in target org",
    ai: {
      plain: "The owner (User ID) from your source org doesn't exist in the target org — you can't copy User IDs between orgs.",
      fix: "Set up an Owner Assignment strategy. Use Fixed Owner or Round Robin to assign records to a real user in the target org.",
      action: { label: "Edit sync config", icon: ShieldAlert, type: "config" },
    },
  },
];

function ErrorsTab() {
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(mockErrors.map((e) => e.id)) // both expanded by default in the demo
  );

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-red-50/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" />
          <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">2 Failed Records — Opportunity Sync</span>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-white px-2.5 py-1 text-[10px] font-medium text-primary hover:bg-primary/5">
            <Sparkles className="h-2.5 w-2.5" />Explain with AI
          </button>
          <button className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-[10px] font-medium text-red-700 hover:bg-red-50">
            <RotateCcw className="h-2.5 w-2.5" />Retry All
          </button>
        </div>
      </div>
      {/* Error rows */}
      <div className="divide-y">
        {mockErrors.map((err) => (
          <div key={err.id}>
            <button
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              onClick={() => toggle(err.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] text-muted-foreground">{err.id}</span>
                  <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-medium text-red-600">
                    {err.code}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-red-800">{err.message}</p>
              </div>
              <button className="shrink-0 rounded-md border border-red-200 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-50">
                <RotateCcw className="h-2.5 w-2.5" />
              </button>
            </button>
            {/* AI Explanation — shown by default */}
            {expanded.has(err.id) && (
              <div className="mx-4 mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <div className="flex items-start gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground leading-relaxed">{err.ai.plain}</p>
                </div>
                <div className="flex items-start justify-between gap-3 border-t border-primary/10 pt-2">
                  <div className="flex items-start gap-1.5 min-w-0">
                    <span className="text-[10px] font-semibold text-primary shrink-0 mt-0.5">Fix:</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">{err.ai.fix}</p>
                  </div>
                  <button className="inline-flex shrink-0 items-center gap-1 rounded-md gradient-bg px-2.5 py-1 text-[10px] font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap">
                    <err.ai.action.icon className="h-2.5 w-2.5" />
                    {err.ai.action.label}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mock UI: Pre-flight Test ─────────────────────────────────────────────────

const mockChecks = [
  { status: "pass", category: "Connection", message: "Source org connected successfully" },
  { status: "pass", category: "Connection", message: "Target org connected successfully" },
  { status: "pass", category: "Schema", message: "Opportunity is accessible (47 fields)" },
  { status: "pass", category: "Schema", message: "Opportunity is accessible in target org (47 fields)" },
  { status: "warn", category: "Mappings", message: "OwnerId → OwnerId is a lookup — source org User IDs won't be valid in target org" },
  { status: "pass", category: "Mappings", message: "Name → Name looks good (string → string)" },
  { status: "pass", category: "Mappings", message: "Amount → Amount looks good (currency → currency)" },
  { status: "fail", category: "Mappings", message: "Required target field 'StageName' is not mapped — inserts will fail" },
  { status: "pass", category: "Sample Record", message: "Found 312 records in Opportunity — using most recent for simulation" },
] as const;

const CHECK_ICONS = {
  pass: { icon: CheckCircle2, cls: "text-green-500" },
  warn: { icon: AlertTriangle, cls: "text-yellow-500" },
  fail: { icon: XCircle, cls: "text-red-500" },
};

const mockPayload = {
  Name: "Q4 Enterprise Deal",
  Amount: 87500,
  CloseDate: "2026-03-31",
  StageName: null,
};

function PreflightTab() {
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      {/* Verdict banner */}
      <div className="flex items-start gap-3 border-b border-yellow-200 bg-yellow-50/80 px-4 py-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-yellow-800">Ready with warnings — 1 blocking issue must be fixed first</p>
          <p className="text-[11px] text-yellow-700 mt-0.5">StageName is required in the target org but isn&apos;t mapped. Activate it now and every insert will fail. Map that field first.</p>
        </div>
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-medium text-primary">AI</span>
        </div>
      </div>
      {/* Checks */}
      <div className="p-4 space-y-2">
        {mockChecks.map((check, i) => {
          const { icon: Icon, cls } = CHECK_ICONS[check.status];
          return (
            <div key={i} className="flex items-start gap-2 text-xs">
              <Icon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", cls)} />
              <div>
                <span className={cn(
                  "font-medium",
                  check.status === "pass" && "text-green-700",
                  check.status === "warn" && "text-yellow-700",
                  check.status === "fail" && "text-red-700",
                )}>
                  {check.category}:{" "}
                </span>
                <span className="text-muted-foreground">{check.message}</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Simulated payload */}
      <div className="border-t px-4 pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 mt-3">Simulated payload (not written)</p>
        <div className="rounded-lg border bg-muted/30 divide-y">
          {Object.entries(mockPayload).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-3 py-1.5 text-xs">
              <span className="font-mono text-muted-foreground">{k}</span>
              <span className={cn("font-medium", v === null && "text-red-500 italic")}>
                {v === null ? "missing — required" : String(v)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export function ProductShowcase() {
  const [activeTab, setActiveTab] = useState<TabId>("logs");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
  }, []);

  return (
    <section id="product" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/0 via-muted/40 to-muted/0" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium text-muted-foreground mb-4 shadow-sm">
            <Eye className="h-3.5 w-3.5 text-primary" />
            See it in action
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            This is what your dashboard looks like
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Every sync, every record, every error — laid out in plain English.
            Nothing hidden, nothing to decipher.
          </p>
        </FadeIn>

        {/* Take me there CTA — sits right under the headline, above the demo */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-8 flex flex-col items-center gap-3"
        >
          <Link
            href={isLoggedIn ? "/dashboard" : "/signup"}
            className="group inline-flex items-center gap-2.5 rounded-2xl gradient-bg px-8 py-4 text-base font-semibold text-white shadow-xl shadow-primary/30 transition-all hover:opacity-90 hover:shadow-primary/40 hover:-translate-y-0.5"
          >
            <LayoutDashboard className="h-5 w-5" />
            {isLoggedIn ? "Take me to my dashboard" : "Take me there — it's free"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="text-xs text-muted-foreground">
            {isLoggedIn ? "You're already signed in — jump straight in." : "No credit card. Set up in under 10 minutes."}
          </p>
        </motion.div>

        <div className="mt-10">
          {/* Tab buttons */}
          <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition-all",
                    activeTab === tab.id
                      ? "gradient-bg border-transparent text-white shadow-lg shadow-primary/20"
                      : "bg-background text-muted-foreground hover:text-foreground hover:border-primary/30"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="mx-auto max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "logs" && <LogsTab />}
                {activeTab === "errors" && <ErrorsTab />}
                {activeTab === "preflight" && <PreflightTab />}
              </motion.div>
            </AnimatePresence>

            {/* Caption */}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {activeTab === "logs" && "Every sync run logged automatically. Click any row with failures to expand the error panel."}
              {activeTab === "errors" && "Every failed record shows the exact reason. Click \"Explain with AI\" and get a plain English fix — instantly."}
              {activeTab === "preflight" && "Run this test before activating any sync. Nothing gets written to your other org during the test."}
            </p>
          </div>
        </div>

        {/* Three callout cards beneath */}
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Activity,
              title: "Every sync is logged",
              body: "You can see every run — how many records moved, how many failed, how long it took, and exactly when it happened.",
            },
            {
              icon: XCircle,
              title: "Every error is explained",
              body: "When something fails, you see the record ID, the error, and what to do about it. Click retry and it runs again.",
            },
            {
              icon: ShieldCheck,
              title: "Test before you activate",
              body: "Run a pre-flight test on any sync before going live. See what would happen — with real data — before a single record moves.",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="rounded-2xl border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-bg text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{card.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
