import type { Metadata } from "next";
import Link from "next/link";
import {
  Zap, ArrowRight, CheckCircle2, GitBranch, Database,
  Shield, Clock, Package, DollarSign, FileText,
  RefreshCw, AlertCircle, Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

export const metadata: Metadata = {
  title: "Salesforce Revenue Cloud Accelerator (RCA) Migration | OrgSync",
  description:
    "Migrate Salesforce Revenue Cloud Accelerator (RCA) and Billing objects between orgs in dependency order. Assets, Subscriptions, Invoices, Orders, and more — no code, no broken lookups.",
  alternates: { canonical: "https://orgsync.io/features/rca" },
  openGraph: {
    title: "Salesforce Revenue Cloud Accelerator (RCA) Migration",
    description:
      "Migrate RCA and Billing objects between Salesforce orgs in the correct dependency order. Assets, Subscriptions, Invoices — no broken lookups.",
    url: "https://orgsync.io/features/rca",
  },
};

const rcaObjects = [
  { name: "Asset", label: "Assets", description: "Purchased products tied to accounts — the foundation of RCA" },
  { name: "SBQQ__Subscription__c", label: "Subscriptions", description: "CPQ subscriptions linked to assets and contracts" },
  { name: "Contract", label: "Contracts", description: "Contracts governing the service relationship" },
  { name: "Order", label: "Orders", description: "Orders created from quotes and contracts" },
  { name: "OrderItem", label: "Order Products", description: "Line items on orders, linked to price book entries" },
  { name: "blng__Invoice__c", label: "Invoices", description: "Billing invoices generated from orders and subscriptions" },
  { name: "blng__InvoiceLine__c", label: "Invoice Lines", description: "Individual line items on invoices" },
  { name: "blng__CreditNote__c", label: "Credit Notes", description: "Credits issued against invoices" },
];

const challenges = [
  {
    icon: GitBranch,
    title: "RCA dependencies run deep",
    description:
      "Assets depend on Products and Accounts. Subscriptions depend on Assets and Contracts. Invoices depend on Orders and Subscriptions. The chain is long and order-sensitive — a single step out of order cascades into dozens of lookup failures.",
  },
  {
    icon: Database,
    title: "Financial data demands precision",
    description:
      "Revenue and billing data has strict field requirements. Required fields, precision constraints on currency fields, date field formats, and lookup validations all need to be mapped correctly. OrgSync flags every type mismatch and required field gap before you run.",
  },
  {
    icon: Shield,
    title: "Match by unique revenue identifiers",
    description:
      "RCA objects often have natural unique keys — invoice numbers, order numbers, contract numbers. Configure match strategies using these so re-runs and incremental updates never create duplicates in your billing system.",
  },
  {
    icon: AlertCircle,
    title: "Don't migrate partial billing chains",
    description:
      "If Asset migration fails, OrgSync stops the chain immediately. Subscription records won't be inserted with broken Asset lookups. Invoice lines won't reference non-existent invoices. The critical-fail logic keeps your data consistent.",
  },
];

const useCases = [
  {
    title: "Production → Sandbox for billing testing",
    description: "Billing logic is hard to test without real data. Pull a subset of production Assets, Subscriptions, and Invoices into your sandbox for realistic end-to-end billing testing.",
  },
  {
    title: "Revenue Cloud implementation migration",
    description: "Moving from Salesforce Billing to Revenue Cloud Accelerator? Use OrgSync to migrate your existing billing objects into the new data model with field mapping to handle schema changes.",
  },
  {
    title: "Org split or acquisition",
    description: "A division is splitting off or being acquired. Move their revenue objects — active contracts, open invoices, recurring subscriptions — to the new or acquiring org.",
  },
  {
    title: "Multi-region org consolidation",
    description: "Multiple regional orgs each with their own billing data. Consolidate into a single global org with RCA as the billing backbone.",
  },
];

const steps = [
  { step: "01", title: "Select RCA template", body: "Start with the RCA migration template. It pre-sets the dependency-ordered object chain: Assets → Subscriptions → Contracts → Orders → Invoices." },
  { step: "02", title: "Scope each step with filters", body: "For billing data, you often want a subset — e.g. active subscriptions only, open invoices from the last 12 months, contracts in specific regions." },
  { step: "03", title: "Map billing fields carefully", body: "Currency fields, date fields, formula-backed fields — the mapper flags every type mismatch. AI analysis catches precision and format issues." },
  { step: "04", title: "Set match strategies using invoice/order numbers", body: "Invoice Number, Order Number, Contract Number are natural deduplication keys. Use these as your match field to prevent re-runs from creating duplicate billing records." },
  { step: "05", title: "Review AI pre-flight analysis", body: "Before running, OrgSync's AI checks for required field gaps, type mismatches, picklist values in source that don't exist in target, and flags them with suggested fixes." },
  { step: "06", title: "Run with monitoring", body: "Execute. Per-step progress updates in real time. If a step fails, the chain stops. Fix the mapping issue and re-run — already-migrated steps are handled by the match strategy." },
];

export default function RCAPage() {
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
                RCA Migrations
              </Badge>
              <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
                Salesforce Revenue Cloud Accelerator,{" "}
                <span className="gradient-text">migrated correctly</span>
              </h1>
              <p className="mt-6 text-xl text-muted-foreground leading-relaxed">
                Revenue Cloud Accelerator (RCA) and Salesforce Billing objects have deep dependency chains.
                Assets before Subscriptions. Contracts before Orders. Orders before Invoices. OrgSync&apos;s
                RCA migration mode handles this automatically — with field mapping, deduplication, and
                critical-fail logic that stops the chain if something breaks.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" className="gradient-bg border-0 text-white hover:opacity-90" asChild>
                  <Link href="/signup">Start free <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/features/migrations">All Migration features</Link>
                </Button>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="mx-auto mt-16 max-w-2xl grid grid-cols-3 gap-px rounded-2xl overflow-hidden border bg-border">
              {[
                { value: "Ordered", label: "Dependency chain" },
                { value: "Financial", label: "Billing precision" },
                { value: "Safe", label: "Fail-safe stops" },
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

      {/* RCA objects */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                RCA objects OrgSync can migrate
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                The RCA template covers the standard Revenue Cloud and Billing object model. Any custom
                objects your implementation added are also available from your org&apos;s schema.
              </p>
            </div>
          </FadeIn>
          <StaggerContainer className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {rcaObjects.map((obj) => (
              <StaggerItem key={obj.name}>
                <div className="rounded-2xl border bg-card p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg gradient-bg-subtle">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">{obj.label}</p>
                  <p className="text-xs text-primary/80 font-mono mt-0.5 mb-2">{obj.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{obj.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Dependency chain visual */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 items-center">
            <FadeIn>
              <div>
                <Badge variant="outline" className="mb-4 text-primary border-primary/30">Dependency Chain</Badge>
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
                  Run in the right order, automatically
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  The RCA object model is a tree of dependencies. OrgSync&apos;s migration engine processes
                  each step sequentially, and if any step in a chain fails, execution stops immediately
                  to prevent orphaned records or broken lookups downstream.
                </p>
                <ul className="space-y-3">
                  {[
                    "Products and Price Books migrated first",
                    "Assets created before Subscriptions and Contracts",
                    "Orders follow Contracts; Order Items follow Price Book Entries",
                    "Invoices and Invoice Lines only after Orders succeed",
                    "Chain stops if any step hits a critical failure",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="rounded-2xl border bg-card p-6 space-y-3">
                {[
                  { label: "1. Products & Price Books", icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "2. Assets", icon: Database, color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "3. Contracts & Subscriptions", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
                  { label: "4. Orders & Order Items", icon: Layers, color: "text-violet-600", bg: "bg-violet-50" },
                  { label: "5. Invoices & Invoice Lines", icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
                  { label: "6. Credit Notes", icon: RefreshCw, color: "text-teal-600", bg: "bg-teal-50" },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-center gap-3">
                    {i > 0 && (
                      <div className="ml-4 w-px h-0 border-l-2 border-dashed border-muted-foreground/30 absolute" />
                    )}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${step.bg}`}>
                      <step.icon className={`h-4 w-4 ${step.color}`} />
                    </div>
                    <div className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm font-medium">
                      {step.label}
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Challenges */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Why RCA migrations are uniquely difficult
              </h2>
            </div>
          </FadeIn>
          <StaggerContainer className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {challenges.map((c) => (
              <StaggerItem key={c.title}>
                <div className="rounded-2xl border bg-card p-8">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl gradient-bg-subtle">
                    <c.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">{c.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{c.description}</p>
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
                When to use RCA migrations
              </h2>
            </div>
          </FadeIn>
          <StaggerContainer className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {useCases.map((uc) => (
              <StaggerItem key={uc.title}>
                <div className="rounded-2xl border bg-card p-8 flex gap-4">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{uc.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{uc.description}</p>
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
                How it works
              </h2>
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

      {/* CPQ crosslink */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="rounded-2xl border bg-card p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-primary" />
                  <p className="font-semibold">Also using Salesforce CPQ?</p>
                </div>
                <p className="text-sm text-muted-foreground max-w-xl">
                  OrgSync also has a dedicated CPQ migration mode for the Salesforce CPQ product catalog
                  hierarchy — Products, Price Books, Price Rules, and Discount Schedules.
                </p>
              </div>
              <Button variant="outline" asChild className="shrink-0">
                <Link href="/features/cpq">Explore CPQ Migrations <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
                Ready to migrate your Revenue Cloud data?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Start free. Connect your orgs and run your first RCA migration job in minutes.
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
