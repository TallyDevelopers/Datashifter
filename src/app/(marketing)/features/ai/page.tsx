import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles, ArrowRight, CheckCircle2, AlertCircle, MessageSquare,
  Eye, Shield, BarChart2, BrainCircuit, Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

export const metadata: Metadata = {
  title: "AI Features — Intelligent Salesforce Sync with Claude | OrgSync",
  description:
    "OrgSync's AI assistant powered by Claude analyzes your sync configs, warns about mapping issues, suggests field matches, explains errors in plain English, and detects anomalies — automatically.",
  alternates: { canonical: "https://orgsync.io/features/ai" },
  openGraph: {
    title: "AI Features — Intelligent Salesforce Sync with Claude",
    description:
      "OrgSync's AI warns about mapping issues, explains errors in plain English, suggests fixes, and detects anomalies — automatically.",
    url: "https://orgsync.io/features/ai",
  },
};

const features = [
  {
    icon: AlertCircle,
    title: "Pre-flight mapping analysis",
    description:
      "Before you activate a sync or run a migration, OrgSync's AI analyzes your field mappings. It catches currency-to-text mismatches, date format differences, required target fields that are unmapped, and picklist values in source that don't exist in target. Each warning comes with a Remove & Retest option.",
    badge: "Pre-flight",
  },
  {
    icon: Sparkles,
    title: "Auto-mapping suggestions",
    description:
      "When you open the field mapper, OrgSync auto-maps fields with identical API names first. The AI then suggests additional mappings based on semantic similarity — e.g. linking Account_Name__c to AccountName__c — so you're not starting from a blank canvas.",
    badge: "Mapping",
  },
  {
    icon: MessageSquare,
    title: "Sync Assistant chatbot",
    description:
      "Each sync config has a Sync Assistant — a context-aware AI chatbot that knows your org names, connected objects, field mappings, recent logs, and error rates. Ask it anything: 'Why did these 12 records fail?', 'What does my sync do in plain English?', 'Is my Owner ID setup correct?'",
    badge: "Assistant",
  },
  {
    icon: Eye,
    title: "Plain English sync summaries",
    description:
      "Every sync config auto-generates a plain English summary: 'This sync copies new and updated Accounts from Production to Sandbox every 2 minutes. It maps 14 fields and filters for accounts in the US region. Owner is assigned round-robin across 3 users.' No more decoding field API names.",
    badge: "Summaries",
  },
  {
    icon: BarChart2,
    title: "Log analysis with fix suggestions",
    description:
      "When a sync run produces errors, the AI reads the Salesforce error codes and explains them in plain English with actionable fix buttons. 'FIELD_CUSTOM_VALIDATION_EXCEPTION on Revenue — this field has a validation rule requiring a value. Fix: map a source field or set a default.'",
    badge: "Log Analysis",
  },
  {
    icon: BrainCircuit,
    title: "Anomaly detection",
    description:
      "The AI monitors sync volume patterns over time. If a sync that normally processes 200 records suddenly processes 0 — or 2,000 — it flags the anomaly. Calibrated to avoid false positives for low-volume test orgs that naturally have variable record counts.",
    badge: "Monitoring",
  },
  {
    icon: Wrench,
    title: "Natural language sync setup",
    description:
      "Describe what you want in plain English and OrgSync's AI tries to pre-configure it: 'Sync Contacts from Production to Sandbox when they are created or updated, filtering for contacts in the Enterprise segment.' Then you review and adjust.",
    badge: "Setup",
  },
  {
    icon: Shield,
    title: "Migration pre-flight for CPQ & RCA",
    description:
      "For CPQ and RCA migrations, the AI performs a deeper analysis — checking that parent objects are mapped before child objects, that currency precision matches between orgs, that required picklist values exist on both sides, and that critical fields like Invoice Number have match strategies configured.",
    badge: "Migration",
  },
];

const exampleWarnings = [
  {
    severity: "error",
    field: "Annual_Revenue__c → Revenue__c",
    message: "Currency → Text mapping. Text fields can't store currency formatting and precision will be lost. Map to a currency field on the target, or accept the string representation.",
    action: "Remove & Retest",
  },
  {
    severity: "warning",
    field: "Close_Date__c (Required)",
    message: "Required target field is unmapped. Records will fail to insert if no default is set. Map this field or set a default value.",
    action: "Remove & Retest",
  },
  {
    severity: "info",
    field: "Stage__c picklist",
    message: "Source has values 'Negotiation' and 'Closed - No Decision' that don't exist in target. Records with these values may fail picklist validation.",
    action: "View values",
  },
];

const chatExamples = [
  { q: "What does this sync do?", a: "This sync copies new and updated Accounts from your Production org to Sandbox every 2 minutes. It maps 14 fields, filters for US accounts only, and assigns new records round-robin across 3 sales reps." },
  { q: "Why did 12 records fail last run?", a: "All 12 failures share the same error: FIELD_CUSTOM_VALIDATION_EXCEPTION on the Revenue field. Your target org has a validation rule requiring Revenue > 0 for accounts in the Enterprise segment, but 12 source records have Revenue = null." },
  { q: "Is my config production-ready?", a: "Mostly yes. One concern: OwnerId is passing through from source, but the user IDs don't exist in target. Recommend switching to a fixed user or round-robin assignment." },
];

export default function AIFeaturesPage() {
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
                <Sparkles className="mr-1.5 h-3 w-3" />
                AI Features
              </Badge>
              <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
                AI that actually{" "}
                <span className="gradient-text">understands your Salesforce data</span>
              </h1>
              <p className="mt-6 text-xl text-muted-foreground leading-relaxed">
                OrgSync is powered by Claude (Anthropic). The AI knows your field mappings, connected
                orgs, sync history, and error logs — and it uses that context to give you specific,
                actionable help rather than generic advice.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" className="gradient-bg border-0 text-white hover:opacity-90" asChild>
                  <Link href="/signup">Try it free <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/docs">See docs</Link>
                </Button>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="mx-auto mt-16 max-w-2xl grid grid-cols-3 gap-px rounded-2xl overflow-hidden border bg-border">
              {[
                { value: "Claude", label: "Powered by Anthropic" },
                { value: "Context-aware", label: "Knows your setup" },
                { value: "Actionable", label: "Not just warnings" },
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

      {/* Feature grid */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Eight AI capabilities built into the platform
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                AI isn&apos;t a bolt-on in OrgSync. It&apos;s woven into every step — from setup to monitoring.
              </p>
            </div>
          </FadeIn>
          <StaggerContainer className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <StaggerItem key={f.title}>
                <div className="group rounded-2xl border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all duration-200">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg-subtle">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="outline" className="text-xs text-primary border-primary/30">{f.badge}</Badge>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 mt-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Pre-flight warnings */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 items-center">
            <FadeIn>
              <div>
                <Badge variant="outline" className="mb-4 text-primary border-primary/30">Pre-flight</Badge>
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
                  Catch problems before they hit production
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Before you activate a sync or run a migration, the AI scans your entire configuration
                  for issues. It flags errors that would cause immediate failures, warnings that might
                  cause some records to fail, and informational notices about potential edge cases.
                </p>
                <p className="text-sm text-muted-foreground">
                  Each issue has a Remove & Retest button so you can resolve it in context, not after
                  seeing 500 failed records in your logs.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="rounded-2xl border bg-card overflow-hidden shadow-xl">
                <div className="border-b px-6 py-4">
                  <p className="font-medium text-sm">Pre-flight Analysis</p>
                  <p className="text-xs text-muted-foreground mt-0.5">3 issues found before activation</p>
                </div>
                <div className="p-4 space-y-3">
                  {exampleWarnings.map((w, i) => (
                    <div key={i} className={`rounded-xl border p-4 ${
                      w.severity === "error" ? "border-red-200 bg-red-50/50" :
                      w.severity === "warning" ? "border-yellow-200 bg-yellow-50/50" :
                      "border-blue-200 bg-blue-50/50"
                    }`}>
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className={`h-4 w-4 shrink-0 mt-0.5 ${
                          w.severity === "error" ? "text-red-600" :
                          w.severity === "warning" ? "text-yellow-600" : "text-blue-600"
                        }`} />
                        <p className="font-mono text-xs font-medium text-foreground">{w.field}</p>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6 leading-relaxed mb-2">{w.message}</p>
                      <div className="ml-6">
                        <button className="text-xs font-medium text-primary hover:underline">{w.action} →</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Sync Assistant */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 items-center">
            <FadeIn delay={0.15} className="order-2 lg:order-1">
              <div className="rounded-2xl border bg-card overflow-hidden shadow-xl">
                <div className="border-b px-6 py-4 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full gradient-bg">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="font-medium text-sm">Sync Assistant</p>
                  <Badge variant="outline" className="text-xs text-muted-foreground ml-auto">Context-aware</Badge>
                </div>
                <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
                  {chatExamples.map((ex, i) => (
                    <div key={i} className="space-y-2">
                      <div className="ml-auto max-w-xs rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-xs">
                        {ex.q}
                      </div>
                      <div className="max-w-sm rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-xs text-foreground leading-relaxed">
                        {ex.a}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t p-3">
                  <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2">
                    <input
                      disabled
                      placeholder="Ask anything about this sync…"
                      className="flex-1 bg-transparent text-xs text-muted-foreground outline-none"
                    />
                    <Button size="sm" disabled className="h-7 gradient-bg border-0 text-white text-xs px-3">Send</Button>
                  </div>
                </div>
              </div>
            </FadeIn>
            <FadeIn className="order-1 lg:order-2">
              <div>
                <Badge variant="outline" className="mb-4 text-primary border-primary/30">Sync Assistant</Badge>
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
                  An AI that knows your entire setup
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  The Sync Assistant isn&apos;t a generic chatbot. It has full context of your sync configuration:
                  which orgs are connected, what objects are syncing, your field mappings, recent run logs,
                  error rates, and your record volume. Ask it anything.
                </p>
                <ul className="space-y-3">
                  {[
                    "Explain your sync in plain English",
                    "Diagnose why records are failing",
                    "Suggest fixes for specific Salesforce errors",
                    "Evaluate if your Owner assignment makes sense",
                    "Warn you about potential issues before they happen",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
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
                Sync smarter, not harder
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Start free. The AI features are available from day one — no extra setup.
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
