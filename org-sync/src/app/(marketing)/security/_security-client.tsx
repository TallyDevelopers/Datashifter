"use client";

import Link from "next/link";
import {
  Shield, Lock, ServerOff, GitBranch, Eye, CheckCircle2,
  Key, Database, RefreshCw, ArrowRight, ExternalLink,
} from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

const pillars = [
  {
    icon: ServerOff,
    title: "Zero record data storage",
    subtitle: "Your data never touches our database",
    description:
      "When OrgSync syncs a record, it reads the record from your source org via Salesforce API, maps the fields in memory, and immediately writes it to your target org via Salesforce API. Nothing is persisted on our infrastructure. Not a field value, not a record ID mapping, not a name. We store only sync configuration (which fields to map), execution logs (timestamps, record counts, error codes), and encrypted OAuth tokens.",
    badge: "Architecture",
  },
  {
    icon: GitBranch,
    title: "Direct org-to-org transfer",
    subtitle: "We orchestrate — we never hold",
    description:
      "Most integration platforms act as a data broker — your records flow into their platform, get transformed, then flow back out. That means your customer data lives on a third-party server momentarily. OrgSync's architecture is different: our worker reads a batch of records from Salesforce, maps them in memory, and sends them directly to the target org in the same process — there is no intermediate storage step.",
    badge: "Architecture",
  },
  {
    icon: Lock,
    title: "AES-256-GCM credential encryption",
    subtitle: "Bank-grade encryption at rest",
    description:
      "OAuth access tokens and refresh tokens that grant access to your Salesforce orgs are encrypted using AES-256-GCM before being stored in our database. The encryption key is stored separately from the encrypted data. Even in the event of a database breach, your Salesforce credentials cannot be decrypted without the separate key.",
    badge: "Encryption",
  },
  {
    icon: Key,
    title: "OAuth 2.0 Web Server Flow with PKCE",
    subtitle: "Your password never comes near us",
    description:
      "You connect your Salesforce org through the standard OAuth 2.0 authorization flow — the same flow used by Salesforce's own tools. You log in directly on Salesforce's login page, not ours. OrgSync never sees your username or password. We receive a scoped access token that you can revoke at any time from within Salesforce. PKCE (Proof Key for Code Exchange) is enforced on every authorization request, protecting against authorization code interception attacks.",
    badge: "Authentication",
  },
  {
    icon: Eye,
    title: "Row-level security isolation",
    subtitle: "Your data is architecturally inaccessible to others",
    description:
      "Every table in OrgSync's database has Row Level Security (RLS) policies enforced at the database engine level. This means that even if a bug existed in our application code, a customer's sync configurations, connected orgs, and logs are inaccessible to any other customer. The isolation is enforced by the database, not just application logic.",
    badge: "Isolation",
  },
  {
    icon: Database,
    title: "Salesforce External ID upserts",
    subtitle: "No record ID mapping table — ever",
    description:
      "To track which records have been synced and avoid duplicates, OrgSync uses Salesforce's native External ID mechanism. A custom field (OrgSync_Source_Id__c) is created on your target object in Salesforce, and Salesforce itself handles the find-or-create upsert logic. This means we never maintain a table mapping source record IDs to target record IDs — another potential source of sensitive metadata that we simply don't store.",
    badge: "Data Handling",
  },
  {
    icon: RefreshCw,
    title: "Token rotation and revocation",
    subtitle: "Access that expires and can be cut off instantly",
    description:
      "Salesforce OAuth tokens expire and are automatically refreshed using refresh tokens stored in encrypted form. You can revoke OrgSync's access to your org at any time from Salesforce Setup → Connected Apps, or directly from the OrgSync portal. Revoking access immediately prevents any further sync operations for that org.",
    badge: "Authentication",
  },
  {
    icon: Shield,
    title: "Scoped OAuth permissions",
    subtitle: "Access only what's needed — nothing more",
    description:
      "OrgSync requests only the OAuth scopes required to read from your source org and write to your target org. We don't request admin permissions, metadata access beyond field creation, or any scope that isn't directly needed for sync to function. You can inspect exactly what was granted from Salesforce Setup → Connected Apps at any time.",
    badge: "Authentication",
  },
];

const comparisonRows = [
  { label: "Records stored on platform servers", others: false, orgsync: false, oursNote: "Never — not even temporarily" },
  { label: "Data passes through platform servers", others: true, orgsync: false, oursNote: "Direct Salesforce → Salesforce" },
  { label: "Credentials encrypted at rest", others: null, orgsync: true, oursNote: "AES-256-GCM" },
  { label: "OAuth 2.0 with PKCE", others: null, orgsync: true, oursNote: "Enforced on every auth request" },
  { label: "Row-level customer isolation", others: null, orgsync: true, oursNote: "Database-level RLS" },
  { label: "Password ever stored or seen", others: null, orgsync: false, oursNote: "OAuth only — never your password" },
  { label: "Access revocable instantly", others: null, orgsync: true, oursNote: "From Salesforce or OrgSync portal" },
  { label: "Access revocable from Salesforce at any time", others: null, orgsync: true, oursNote: "Revoke from Connected Apps in Salesforce Setup" },
];

const badgeColors: Record<string, string> = {
  Architecture: "bg-blue-50 text-blue-700 border-blue-200",
  Encryption: "bg-purple-50 text-purple-700 border-purple-200",
  Authentication: "bg-green-50 text-green-700 border-green-200",
  Isolation: "bg-orange-50 text-orange-700 border-orange-200",
  "Data Handling": "bg-primary/5 text-primary border-primary/20",
  Compliance: "bg-amber-50 text-amber-700 border-amber-200",
};

export function SecurityPageClient() {
  return (
    <div className="min-h-screen">

      {/* Hero */}
      <section className="relative py-24 lg:py-32 overflow-hidden border-b">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute right-1/4 bottom-0 h-[400px] w-[400px] rounded-full bg-primary/4 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary mb-6">
              <Shield className="h-4 w-4" />
              Security & Trust
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your records go{" "}
              <span className="gradient-text">org to org.</span>
              <br />
              Not through us.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-xl text-muted-foreground leading-relaxed">
              Most integration platforms store your Salesforce data on their servers while processing it.
              OrgSync was architected from day one so your records never leave your Salesforce ecosystem.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              {[
                "Zero record data stored",
                "AES-256-GCM encryption",
                "OAuth 2.0 + PKCE",
                "Row-level isolation",
              ].map((badge) => (
                <div key={badge} className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  {badge}
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Data flow visual */}
      <section className="py-20 border-b">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <FadeIn className="text-center mb-14">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How your data actually moves</h2>
            <p className="mt-3 text-muted-foreground">The architectural difference that matters most.</p>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Other tools */}
            <FadeIn>
              <div className="rounded-2xl border bg-destructive/3 p-6 h-full">
                <p className="text-xs font-bold uppercase tracking-widest text-destructive/60 mb-5">Other integration tools</p>
                <div className="space-y-3">
                  {[
                    { node: "Your Source Org", note: null, highlight: false },
                    { node: "Platform servers", note: "Data stored here temporarily", highlight: true },
                    { node: "Your Target Org", note: null, highlight: false },
                  ].map((item, i, arr) => (
                    <div key={item.node}>
                      <div className={`rounded-xl border p-3.5 ${item.highlight ? "border-destructive/30 bg-destructive/10" : "border-border bg-card"}`}>
                        <p className={`text-sm font-semibold ${item.highlight ? "text-destructive" : ""}`}>{item.node}</p>
                        {item.note && <p className="text-xs text-destructive/70 mt-0.5">⚠ {item.note}</p>}
                      </div>
                      {i < arr.length - 1 && (
                        <div className="flex justify-center my-1">
                          <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-xs text-muted-foreground leading-relaxed">
                  Your records exist on a third-party server. A breach of their infrastructure exposes your customer data.
                </p>
              </div>
            </FadeIn>

            {/* OrgSync */}
            <FadeIn>
              <div className="rounded-2xl border border-primary/20 bg-primary/3 p-6 h-full">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-5">OrgSync</p>
                <div className="space-y-3">
                  {[
                    { node: "Your Source Org", note: null, highlight: false },
                    { node: "OrgSync worker", note: "Maps fields in memory — nothing persisted", highlight: true, good: true },
                    { node: "Your Target Org", note: null, highlight: false },
                  ].map((item, i, arr) => (
                    <div key={item.node}>
                      <div className={`rounded-xl border p-3.5 ${item.highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
                        <p className={`text-sm font-semibold ${item.highlight ? "text-primary" : ""}`}>{item.node}</p>
                        {item.note && <p className="text-xs text-primary/70 mt-0.5">✓ {item.note}</p>}
                      </div>
                      {i < arr.length - 1 && (
                        <div className="flex justify-center my-1">
                          <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs font-medium text-primary">Our servers can&apos;t expose what they don&apos;t have.</p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-20 border-b bg-muted/20">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <FadeIn className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Security at a glance</h2>
          </FadeIn>
          <FadeIn>
            <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
              <div className="grid grid-cols-[1fr_auto_auto] border-b bg-muted/30 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <span>Property</span>
                <span className="w-28 text-center">Others</span>
                <span className="w-28 text-center text-primary">OrgSync</span>
              </div>
              {comparisonRows.map((row, i) => (
                <div key={row.label} className={`grid grid-cols-[1fr_auto_auto] items-center px-6 py-4 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                  <div>
                    <p className="text-sm font-medium">{row.label}</p>
                    {row.oursNote && <p className="text-xs text-muted-foreground mt-0.5">{row.oursNote}</p>}
                  </div>
                  <div className="w-28 flex justify-center">
                    {row.others === null ? (
                      <span className="text-xs text-muted-foreground">varies</span>
                    ) : row.others ? (
                      <span className="text-xs font-semibold text-destructive bg-destructive/10 rounded-full px-2.5 py-0.5">Yes</span>
                    ) : (
                      <span className="text-xs font-semibold text-green-700 bg-green-50 rounded-full px-2.5 py-0.5">No</span>
                    )}
                  </div>
                  <div className="w-28 flex justify-center">
                    {row.orgsync ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <span className="text-xs font-semibold text-green-700 bg-green-50 rounded-full px-2.5 py-0.5">Never</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Deep dive pillars */}
      <section className="py-20 border-b">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <FadeIn className="text-center mb-14">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Security in depth</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Every layer of OrgSync&apos;s security architecture, explained plainly.</p>
          </FadeIn>

          <StaggerContainer className="space-y-6" staggerDelay={0.07}>
            {pillars.map((pillar) => (
              <StaggerItem key={pillar.title}>
                <div className="rounded-2xl border bg-card p-7 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                  <div className="flex items-start gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <pillar.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-bold">{pillar.title}</h3>
                        <span className={`text-[11px] font-semibold border rounded-full px-2.5 py-0.5 ${badgeColors[pillar.badge] ?? "bg-muted text-muted-foreground"}`}>
                          {pillar.badge}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-primary mt-0.5">{pillar.subtitle}</p>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pillar.description}</p>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Questions / CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 lg:px-8 text-center">
          <FadeIn>
            <Shield className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Have a security question?</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              If you have specific security requirements, are conducting a vendor assessment, or want to understand our architecture in more detail — we&apos;re happy to talk.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/support"
                className="inline-flex items-center gap-2 rounded-xl gradient-bg px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Contact us
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold hover:bg-muted/50 transition-colors"
              >
                Read the docs
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

    </div>
  );
}
