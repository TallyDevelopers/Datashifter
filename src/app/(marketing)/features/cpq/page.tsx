import type { Metadata } from "next";
import Link from "next/link";
import {
  Package, ArrowRight, CheckCircle2, GitBranch, Database,
  Shield, Clock, Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

export const metadata: Metadata = {
  title: "Salesforce CPQ Migration — Move CPQ Data Between Orgs | OrgSync",
  description:
    "Migrate Salesforce CPQ objects between orgs in the correct dependency order. Price Books, Products, Pricebook Entries, Quote Templates, and custom CPQ objects — handled automatically.",
  alternates: { canonical: "https://orgsync.io/features/cpq" },
  openGraph: {
    title: "Salesforce CPQ Migration — Move CPQ Data Between Orgs",
    description:
      "Migrate Salesforce CPQ objects in the correct dependency order. Price Books, Products, Pricebook Entries, and more — no manual ordering required.",
    url: "https://orgsync.io/features/cpq",
  },
};

const cpqObjects = [
  { name: "SBQQ__Product2__c", label: "Products", description: "Base product catalog with CPQ-specific attributes" },
  { name: "Product2", label: "Standard Products", description: "Salesforce standard Product2 records referenced by CPQ" },
  { name: "Pricebook2", label: "Price Books", description: "Standard and custom price books" },
  { name: "PricebookEntry", label: "Pricebook Entries", description: "Product-to-pricebook relationships with unit prices" },
  { name: "SBQQ__PriceRule__c", label: "Price Rules", description: "Conditional pricing logic applied during quoting" },
  { name: "SBQQ__PriceAction__c", label: "Price Actions", description: "Actions triggered by Price Rules" },
  { name: "SBQQ__DiscountSchedule__c", label: "Discount Schedules", description: "Volume and partner discount structures" },
  { name: "SBQQ__SubscriptionPricing__c", label: "Subscription Pricing", description: "Recurring pricing configurations" },
];

const challenges = [
  {
    icon: GitBranch,
    title: "Dependency ordering is critical",
    description:
      "CPQ data has strict parent-child relationships. Price Book Entries depend on both Price Books and Products. Discount Schedules reference Products. If you migrate in the wrong order, lookups break and records fail to insert. OrgSync's migration engine handles this automatically.",
  },
  {
    icon: Database,
    title: "Field mapping between environments",
    description:
      "Your sandbox and production orgs may have different field configurations, custom fields at different API versions, or picklist values that don't match. OrgSync's field mapper shows you every field from both sides and flags type mismatches before you run.",
  },
  {
    icon: Shield,
    title: "No duplicates on re-run",
    description:
      "CPQ migrations often need to be run multiple times — once to test, once to go live, once for incremental updates. OrgSync's match strategy links existing records by a field like Product Code or External ID so re-runs update records instead of creating duplicates.",
  },
  {
    icon: Clock,
    title: "Critical-fail chain stops execution",
    description:
      "If Price Book migration fails, OrgSync stops the chain. It won't attempt to migrate Pricebook Entries that would reference non-existent Price Books and flood your logs with meaningless errors.",
  },
];

const useCases = [
  {
    title: "Production → Sandbox refresh",
    description: "Your sandbox's CPQ configuration has drifted from production. Push the full product catalog, price books, and pricing rules from production into sandbox to get a realistic testing environment.",
  },
  {
    title: "Org consolidation after acquisition",
    description: "Two companies merge, each with their own Salesforce CPQ setup. Migrate one org's product catalog into the other, mapping fields to the surviving schema.",
  },
  {
    title: "Dev → UAT → Production promotion",
    description: "New products and pricing are configured in a dev org. Promote that configuration up the chain — dev to UAT, UAT to production — using the same saved migration job.",
  },
  {
    title: "CPQ implementation migration",
    description: "Migrating from a legacy quoting system to Salesforce CPQ. Use OrgSync to bulk-load your product catalog and pricing structures into the new org.",
  },
];

const steps = [
  { step: "01", title: "Select CPQ template", body: "Choose the CPQ migration template when creating a new job. It pre-populates the recommended object order and common field mappings." },
  { step: "02", title: "Review and adjust object order", body: "The template orders objects by dependency. You can add, remove, or reorder steps based on what's in your specific org." },
  { step: "03", title: "Configure field mappings per step", body: "Each object step has independent field mapping. Auto-map handles name-matching fields; you handle schema differences manually." },
  { step: "04", title: "Set match strategies", body: "For each object, define how OrgSync identifies existing records. Typically Product Code for Products, Name for Price Books." },
  { step: "05", title: "Add filters if needed", body: "Optionally scope each step — e.g. only active products, only custom price books, only non-expired discount schedules." },
  { step: "06", title: "Review AI warnings", body: "OrgSync flags required fields that are unmapped, type mismatches, and picklist values that exist in source but not target." },
  { step: "07", title: "Run and monitor", body: "Execute the job. Each step runs in sequence. View per-step progress, per-record results, and full error details in the run history." },
];

export default function CPQPage() {
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
                <Package className="mr-1.5 h-3 w-3" />
                CPQ Migrations
              </Badge>
              <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
                Migrate Salesforce CPQ data{" "}
                <span className="gradient-text">without breaking lookups</span>
              </h1>
              <p className="mt-6 text-xl text-muted-foreground leading-relaxed">
                Salesforce CPQ has a complex object hierarchy. Price Books, Products, Pricebook Entries,
                Price Rules, Discount Schedules — each depends on the previous. OrgSync migrates them
                in the correct dependency order automatically, with full field mapping and deduplication.
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
                { value: "Ordered", label: "Dependency-aware" },
                { value: "No code", label: "Visual builder" },
                { value: "Re-runnable", label: "Save & reuse" },
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

      {/* CPQ objects */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                CPQ objects OrgSync can migrate
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Standard CPQ objects and any custom objects in your org. The template pre-populates the
                common ones — you adjust for your specific configuration.
              </p>
            </div>
          </FadeIn>
          <StaggerContainer className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cpqObjects.map((obj) => (
              <StaggerItem key={obj.name}>
                <div className="rounded-2xl border bg-card p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg gradient-bg-subtle">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">{obj.label}</p>
                  <p className="text-xs text-primary/80 font-mono mt-0.5 mb-2">{obj.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{obj.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
          <FadeIn delay={0.2}>
            <p className="text-center text-sm text-muted-foreground mt-8">
              Plus any custom CPQ-related objects in your org — OrgSync fetches your full schema.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Why CPQ is hard */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Why CPQ migrations are hard — and how OrgSync helps
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                CPQ has more interdependencies than almost any other Salesforce product.
                Most migration tools don&apos;t account for this.
              </p>
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
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                When to use CPQ migrations
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
      <section className="py-24 bg-muted/30">
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

      {/* RCA crosslink */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="rounded-2xl border bg-card p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <p className="font-semibold">Also using Revenue Cloud Accelerator?</p>
                </div>
                <p className="text-sm text-muted-foreground max-w-xl">
                  OrgSync also has an RCA migration mode for Revenue Cloud (formerly Billing) objects.
                  Same dependency-aware engine, pre-built templates for RCA object hierarchies.
                </p>
              </div>
              <Button variant="outline" asChild className="shrink-0">
                <Link href="/features/rca">Explore RCA Migrations <ArrowRight className="ml-2 h-4 w-4" /></Link>
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
                Ready to migrate your CPQ data?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Start free. Connect your orgs and build your CPQ migration job in minutes.
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
