import type { Metadata } from "next";
import Link from "next/link";
import {
  MoveRight, Database, History, Play, Filter, GitBranch,
  CheckCircle2, ArrowRight, Layers, RotateCcw, Shield,
  Package, Clock, AlertCircle, Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

export const metadata: Metadata = {
  title: "Mass Migrations — Bulk Data Migration Between Salesforce Orgs | SwiftPort",
  description:
    "Migrate any Salesforce object between orgs in bulk — Accounts, Contacts, Opportunities, Orders, custom objects. Multi-step dependency-aware jobs, deduplication match strategy, full run history. No code, no data loaders.",
  alternates: { canonical: "https://swiftport.io/features/migrations" },
  keywords: [
    "Salesforce mass data migration",
    "bulk Salesforce data migration",
    "migrate Salesforce objects between orgs",
    "Salesforce org to org data migration",
    "Salesforce bulk record migration tool",
    "Salesforce org consolidation migration",
    "Salesforce sandbox data migration",
    "Salesforce data loader alternative",
    "migrate Salesforce custom objects",
    "Salesforce data migration no code",
  ],
  openGraph: {
    title: "Mass Migrations — Bulk Data Migration Between Salesforce Orgs",
    description:
      "Move any Salesforce object between orgs in bulk. Multi-step, dependency-aware jobs with deduplication, filters, field mapping, and full run history.",
    url: "https://swiftport.io/features/migrations",
  },
};

const capabilities = [
  {
    icon: Layers,
    title: "Any Salesforce object",
    description:
      "Migrate standard objects (Accounts, Contacts, Leads, Opportunities, Cases) or any custom object. SwiftPort fetches the full schema from Salesforce so you see every field.",
  },
  {
    icon: GitBranch,
    title: "Multi-step, dependency-aware",
    description:
      "Define multiple object steps in a single migration job. SwiftPort executes them in sequence — so Accounts migrate before Contacts, preserving lookup relationships.",
  },
  {
    icon: Filter,
    title: "Scoped by filters",
    description:
      "Don't move everything — filter which records get migrated. Combine field conditions to select only the records you need, with picklist values shown from Salesforce.",
  },
  {
    icon: Database,
    title: "Field mapping per step",
    description:
      "Each step gets its own field mapping. Source fields don't need to have matching names in the target org. Auto-map handles exact matches; you handle the rest manually.",
  },
  {
    icon: Shield,
    title: "Match strategy for deduplication",
    description:
      "If records already exist in the target org, configure a match strategy. Match by Email, Account Name, external ID, or any field — so existing records are updated, not duplicated.",
  },
  {
    icon: History,
    title: "Full run history",
    description:
      "Every migration run is logged. See how many records were processed, how many succeeded, how many failed, and why — with per-record error details for failures.",
  },
  {
    icon: RotateCcw,
    title: "Saveable & re-runnable",
    description:
      "Migrations are saved to your account. Re-run a migration any time — useful for periodic imports, initial data loads, or syncing environments on demand.",
  },
  {
    icon: Clock,
    title: "Critical-fail logic",
    description:
      "If a critical step fails, the chain stops. Downstream steps that depend on the failed step don't run — preventing partial or inconsistent data states.",
  },
];

const useCases = [
  {
    title: "Org consolidation",
    description: "Merging two business units that each have their own Salesforce org. Move all historical data into one org before decommissioning the other.",
    objects: ["Accounts", "Contacts", "Opportunities", "Cases", "Activities"],
  },
  {
    title: "Sandbox refresh population",
    description: "Production data looks different from sandbox data. Use a migration to pull a representative sample from production into your sandbox for realistic testing.",
    objects: ["Accounts", "Contacts", "Custom Objects", "Price Books"],
  },
  {
    title: "Data archiving",
    description: "Move closed or old records out of a busy org into a clean archive org. Reduce clutter and keep your operational org focused on active data.",
    objects: ["Closed Opportunities", "Archived Cases", "Old Leads"],
  },
  {
    title: "Initial data load",
    description: "Going live on a new Salesforce org? Migrate your data from a legacy CRM, spreadsheet import org, or existing org all at once with a single migration job.",
    objects: ["Any Object", "Custom Objects", "Lookup Relationships"],
  },
];

const steps = [
  { step: "01", title: "Name your migration job", body: "Give the job a clear name. You'll run it more than once so make it meaningful — e.g. 'Production → Sandbox Accounts & Contacts'." },
  { step: "02", title: "Choose source and target orgs", body: "Select from your connected orgs. The same org can be used for both source and target (useful for testing)." },
  { step: "03", title: "Add steps (objects)", body: "Each step is one object migration. Add as many steps as needed. Order matters — place parent objects before child objects." },
  { step: "04", title: "Per step: filters and mapping", body: "For each step, configure which records to pull (filters) and how fields map from source to target. Required target fields are highlighted." },
  { step: "05", title: "Per step: match strategy", body: "Tell SwiftPort how to handle records already in the target org. Match by a field like Email or External ID to avoid duplicates." },
  { step: "06", title: "Review AI warnings", body: "SwiftPort's AI analyzes your mapping for type mismatches, unmapped required fields, and potential data loss before you run." },
  { step: "07", title: "Run the migration", body: "Hit Run. SwiftPort executes each step in sequence on the Railway worker. Monitor live progress in the run history view." },
];

export default function MigrationsPage() {
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
                <MoveRight className="mr-1.5 h-3 w-3" />
                Mass Migrations
              </Badge>
              <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
                Move your Salesforce data,{" "}
                <span className="gradient-text">in bulk, on demand</span>
              </h1>
              <p className="mt-6 text-xl text-muted-foreground leading-relaxed">
                Whether you&apos;re consolidating orgs, refreshing a sandbox, or doing an initial data load,
                SwiftPort Migrations let you push any object — with filters, field mapping, and match strategy —
                from one Salesforce org to another. No code. Save and re-run any time.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" className="gradient-bg border-0 text-white hover:opacity-90" asChild>
                  <Link href="/signup">Start migrating free <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/docs">Read the docs</Link>
                </Button>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="mx-auto mt-16 max-w-2xl grid grid-cols-3 gap-px rounded-2xl overflow-hidden border bg-border">
              {[
                { value: "Any object", label: "Standard & custom" },
                { value: "Multi-step", label: "Dependency-aware" },
                { value: "Re-runnable", label: "Save & run again" },
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

      {/* Capabilities */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Built for serious data movement
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                More than a CSV import. A full migration builder with logging, deduplication, and re-runs.
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

      {/* Use cases */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Common use cases
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Migrations work for any scenario where you need to bulk-move records between orgs.
              </p>
            </div>
          </FadeIn>
          <StaggerContainer className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {useCases.map((uc) => (
              <StaggerItem key={uc.title}>
                <div className="rounded-2xl border bg-card p-8">
                  <h3 className="text-lg font-semibold text-foreground mb-3">{uc.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">{uc.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {uc.objects.map((obj) => (
                      <Badge key={obj} variant="outline" className="text-xs text-primary border-primary/30">
                        {obj}
                      </Badge>
                    ))}
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Steps */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Build a migration job in 7 steps
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                The guided builder walks you through every decision. No SQL, no APIs, no engineers.
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

      {/* CPQ / RCA callout */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-4xl">
              <div className="rounded-2xl border bg-card p-10 text-center">
                <div className="mb-4 flex items-center justify-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold tracking-tight mb-3">
                  Need ordered, dependency-chain migrations?
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6 max-w-2xl mx-auto">
                  Migrations also power SwiftPort&apos;s CPQ and Revenue Cloud Accelerator (RCA) integration modes.
                  These are pre-built templates that migrate Salesforce CPQ and RCA objects in the correct
                  dependency order — Price Books, Products, Pricebook Entries, Assets, and more.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Button variant="outline" asChild>
                    <Link href="/features/cpq">
                      Explore CPQ Migrations <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/features/rca">
                      Explore RCA Migrations <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Run history mockup */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 items-center">
            <FadeIn>
              <div>
                <Badge variant="outline" className="mb-4 text-primary border-primary/30">Run History</Badge>
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
                  Every run is logged and inspectable
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  After a migration runs, you get a full breakdown of every step: how many records were
                  attempted, how many succeeded, and detailed error messages for each failure. You can
                  re-run the entire job or investigate individual steps.
                </p>
                <ul className="space-y-3">
                  {[
                    { icon: CheckCircle2, text: "Per-step success and failure counts" },
                    { icon: AlertCircle, text: "Salesforce error codes per failed record" },
                    { icon: Play, text: "Re-run the full job with one click" },
                    { icon: History, text: "Full history across all runs for each job" },
                  ].map((f) => (
                    <li key={f.text} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <f.icon className="h-4 w-4 text-primary shrink-0" />
                      {f.text}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="rounded-2xl border bg-card overflow-hidden shadow-xl">
                <div className="border-b px-6 py-4">
                  <p className="font-medium text-sm">Migration Run — Production → Sandbox</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Started 2 minutes ago · 3 steps</p>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { step: "Accounts", records: 2430, success: 2430, status: "done" },
                    { step: "Contacts", records: 8920, success: 8918, status: "done", errors: 2 },
                    { step: "Opportunities", records: 1200, success: 0, status: "running" },
                  ].map((row) => (
                    <div key={row.step} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{row.step}</span>
                        <Badge className={`text-xs border-0 ${
                          row.status === "done"
                            ? row.errors ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {row.status === "running" ? "Running…" : row.errors ? `${row.errors} errors` : "Complete"}
                        </Badge>
                      </div>
                      {row.status === "done" && (
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="text-green-700">{row.success.toLocaleString()} succeeded</span>
                          {row.errors && <span className="text-red-600">{row.errors} failed</span>}
                        </div>
                      )}
                      {row.status === "running" && (
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                          <div className="h-full w-1/3 rounded-full gradient-bg animate-pulse" />
                        </div>
                      )}
                    </div>
                  ))}
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
                Ready to move your data?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Start free. Build your first migration job in minutes. No credit card required.
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
