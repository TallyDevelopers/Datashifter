import type { Metadata } from "next";
import Link from "next/link";
import {
  Zap, RefreshCw, Clock, Filter, ArrowLeftRight, GitBranch,
  CheckCircle2, AlertCircle, RotateCcw, ArrowRight, Eye,
  Layers, ShieldCheck, Bell,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

export const metadata: Metadata = {
  title: "Live Sync — Real-Time Bidirectional Salesforce Org Sync | OrgSync",
  description:
    "Keep two Salesforce orgs in sync automatically, every 2 minutes. Bidirectional field mapping, smart filters, picklist support, and real-time error logs — no code, no middleware.",
  alternates: { canonical: "https://orgsync.io/features/live-sync" },
  openGraph: {
    title: "Live Sync — Real-Time Bidirectional Salesforce Org Sync",
    description:
      "Keep two Salesforce orgs in sync automatically, every 2 minutes. Bidirectional field mapping, filters, and real-time logs — no code needed.",
    url: "https://orgsync.io/features/live-sync",
  },
};

const capabilities = [
  {
    icon: RefreshCw,
    title: "Runs every 2 minutes",
    description:
      "OrgSync's background worker polls for changes every 2 minutes using Salesforce's SystemModstamp. New and updated records are detected and pushed to the target org without any manual intervention.",
  },
  {
    icon: ArrowLeftRight,
    title: "Bidirectional sync",
    description:
      "A single sync config can push changes both ways — from Org A to Org B and from Org B to Org A. Set independent field mappings for each direction so you're never stuck with a mirror-only setup.",
  },
  {
    icon: Filter,
    title: "Filters with picklist support",
    description:
      "Narrow down which records get synced using field-level filters. For picklist fields, OrgSync pulls the real values from Salesforce and presents them as a dropdown — no guessing allowed.",
  },
  {
    icon: Layers,
    title: "Visual field mapping",
    description:
      "A drag-and-drop style field mapper shows all fields from both objects side by side. Required fields are flagged. Auto-mapping matches fields by exact name so you don't start from scratch.",
  },
  {
    icon: GitBranch,
    title: "Record Type mapping",
    description:
      "Map source Record Types to different target Record Types, assign a fixed default, or pass the value through as-is. Essential when your two orgs have different picklist structures.",
  },
  {
    icon: Eye,
    title: "OwnerId assignment strategy",
    description:
      "Choose how owner is set on synced records: fixed user, round-robin across a group, or pass-through from source. Prevents all records landing in one person's queue.",
  },
  {
    icon: ShieldCheck,
    title: "Match strategy for existing records",
    description:
      "Already have records in the target org? Configure a match strategy — match by a field value like Email or External ID — so OrgSync links to the existing record instead of creating a duplicate.",
  },
  {
    icon: Bell,
    title: "Pre-flight warnings",
    description:
      "Before you activate a sync, OrgSync's AI analyzes your field mappings for type mismatches, required fields that are unmapped, and picklist value gaps — with a Remove & Retest option for each issue.",
  },
];

const logFeatures = [
  { icon: CheckCircle2, label: "Per-record success logs with timestamps" },
  { icon: AlertCircle, label: "Inline error details with Salesforce error codes" },
  { icon: RotateCcw, label: "Retry single failed records or retry all failures in one click" },
  { icon: Eye, label: "Filter logs by status: Success, Error, Retried" },
  { icon: Clock, label: "Countdown to next scheduled run" },
  { icon: Bell, label: "Success rate auto-updates after retries" },
];

const steps = [
  { step: "01", title: "Connect your orgs", body: "Click 'Add Org', authorize via Salesforce OAuth on Salesforce's own login page. No credentials touch OrgSync." },
  { step: "02", title: "Pick your objects", body: "Choose the source and target object from a searchable dropdown. Accounts, Contacts, Opportunities, custom objects — anything Salesforce exposes." },
  { step: "03", title: "Set filters", body: "Optionally filter which records get synced. Pick a field, an operator, and a value. Picklist fields show real Salesforce picklist values." },
  { step: "04", title: "Map your fields", body: "Drag source fields to target fields. Auto-map handles exact-name matches. Required target fields are highlighted. AI flags type conflicts." },
  { step: "05", title: "Configure Record Types and Owner", body: "Set how Record Types translate and how OwnerId is assigned on newly synced records." },
  { step: "06", title: "Set match strategy", body: "Tell OrgSync how to handle records that already exist in the target org to avoid duplicates on first run." },
  { step: "07", title: "Dry run & activate", body: "Run a dry run to preview what would sync without writing anything. Then activate — the worker picks it up on the next 2-minute cycle." },
];

export default function LiveSyncPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/8 blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-3xl text-center">
              <Badge className="gradient-bg border-0 text-white mb-6">
                <Zap className="mr-1.5 h-3 w-3" />
                Live Sync
              </Badge>
              <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
                Two Salesforce orgs,{" "}
                <span className="gradient-text">always in sync</span>
              </h1>
              <p className="mt-6 text-xl text-muted-foreground leading-relaxed">
                OrgSync runs a background worker every 2 minutes, detecting changes in your source org and
                pushing them to your target org — automatically, with no code, no middleware, and no data
                ever touching OrgSync&apos;s servers.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" className="gradient-bg border-0 text-white hover:opacity-90" asChild>
                  <Link href="/signup">Start syncing free <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/docs">Read the docs</Link>
                </Button>
              </div>
            </div>
          </FadeIn>

          {/* Stat strip */}
          <FadeIn delay={0.2}>
            <div className="mx-auto mt-16 max-w-2xl grid grid-cols-3 gap-px rounded-2xl overflow-hidden border bg-border">
              {[
                { value: "2 min", label: "Sync interval" },
                { value: "Bidirectional", label: "Sync direction" },
                { value: "0 bytes", label: "Record data stored" },
              ].map((stat) => (
                <div key={stat.label} className="bg-background px-8 py-6 text-center">
                  <p className="text-2xl font-bold gradient-text">{stat.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Capabilities grid */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Everything you need to configure a sync
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Every setting is in the builder. No config files. No SQL. No engineers required.
              </p>
            </div>
          </FadeIn>
          <StaggerContainer className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((cap) => (
              <StaggerItem key={cap.title}>
                <div className="group rounded-2xl border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all duration-200">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl gradient-bg-subtle">
                    <cap.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{cap.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{cap.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Step-by-step setup */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Set up a sync in 7 steps
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                The builder guides you through every decision. Each step validates before you can proceed.
              </p>
            </div>
          </FadeIn>
          <div className="mx-auto max-w-3xl space-y-4">
            {steps.map((s, i) => (
              <FadeIn key={s.step} delay={i * 0.07}>
                <div className="flex gap-5 rounded-2xl border bg-card p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-bg text-white text-sm font-bold">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Logs & monitoring */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 items-center">
            <FadeIn>
              <div>
                <Badge variant="outline" className="mb-4 text-primary border-primary/30">Observability</Badge>
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
                  Logs that actually tell you what went wrong
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                  Every sync run produces a detailed log. You can see which records succeeded, which
                  failed, read the exact Salesforce error, and retry failures without leaving the page.
                  The AI assistant can analyze your logs and explain what&apos;s happening in plain English.
                </p>
                <ul className="space-y-3">
                  {logFeatures.map((f) => (
                    <li key={f.label} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <f.icon className="h-4 w-4 text-primary shrink-0" />
                      {f.label}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="rounded-2xl border bg-card overflow-hidden shadow-xl">
                <div className="border-b px-6 py-4 flex items-center justify-between">
                  <span className="font-medium text-sm">Sync Logs</span>
                  <div className="flex gap-2">
                    <Badge className="bg-green-100 text-green-700 border-0 text-xs">Success</Badge>
                    <Badge className="bg-red-100 text-red-700 border-0 text-xs">Error</Badge>
                  </div>
                </div>
                <div className="p-4 space-y-2 font-mono text-xs">
                  {[
                    { status: "success", id: "001ab000003GkYv", msg: "Upserted → Account 001ab000003GkYv" },
                    { status: "success", id: "001ab000003GkYw", msg: "Upserted → Account 001ab000003GkYw" },
                    { status: "error", id: "001ab000003GkYx", msg: "FIELD_CUSTOM_VALIDATION_EXCEPTION: Revenue required" },
                    { status: "success", id: "001ab000003GkYy", msg: "Upserted → Account 001ab000003GkYy" },
                    { status: "success", id: "001ab000003GkYz", msg: "Upserted → Account 001ab000003GkYz" },
                  ].map((row) => (
                    <div key={row.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                      row.status === "error" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"
                    }`}>
                      {row.status === "success"
                        ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                      <span className="truncate">{row.msg}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>4/5 succeeded · 1 error</span>
                  <button className="text-primary font-medium hover:underline flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Retry failures
                  </button>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
                Ready to keep your orgs in sync?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Start free. Connect your first two orgs in minutes. No credit card required.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" className="gradient-bg border-0 text-white hover:opacity-90" asChild>
                  <Link href="/signup">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/pricing">View pricing</Link>
                </Button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
