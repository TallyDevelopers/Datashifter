import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen, ArrowRight, Building2, ArrowLeftRight, Zap,
  ShieldCheck, RotateCcw, Filter, AlertTriangle, HelpCircle,
  CheckCircle2, Columns, UserCog, Search, ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Documentation — How to Sync Salesforce Orgs with OrgSync",
  description:
    "Complete guide to bidirectional Salesforce org synchronization with OrgSync. Connect two Salesforce orgs, map fields, set filters, configure owner assignment, and monitor sync logs — no code required.",
  keywords: [
    "Salesforce org sync",
    "bidirectional Salesforce sync",
    "sync two Salesforce orgs",
    "Salesforce data migration",
    "Salesforce integration no code",
    "connect multiple Salesforce orgs",
    "Salesforce field mapping",
    "Salesforce cross org data",
    "OrgSync documentation",
    "Salesforce sandbox to production sync",
  ],
  openGraph: {
    title: "How to Sync Two Salesforce Orgs — OrgSync Documentation",
    description:
      "Step-by-step guide to connecting, mapping, and syncing data between Salesforce orgs. Covers bidirectional sync, owner assignment, field mapping, error handling, and retry logic.",
    type: "article",
    url: "https://orgsync.io/docs",
  },
  alternates: {
    canonical: "https://orgsync.io/docs",
  },
};

const sections = [
  {
    id: "what-is-orgsync",
    title: "What is OrgSync?",
    icon: Zap,
    content: `OrgSync is a SaaS platform that connects two or more Salesforce orgs and keeps data synchronized between them in near real-time — automatically, bidirectionally, and without writing a single line of code.

Companies use OrgSync when they run multiple Salesforce orgs — for example, a parent company and a subsidiary, two acquired companies, or a production org and a sandbox they want to stay in sync. Instead of manual exports, complex middleware, or expensive Salesforce consultants, OrgSync handles the sync automatically every 2 minutes.

You choose which objects to sync (Accounts, Contacts, Opportunities, custom objects), which fields to map, which records to include or exclude using filters, and who should own the records in the target org. OrgSync's built-in AI analyzes your field mappings and warns you about type mismatches, picklist value mismatches, missing required fields, and lookup field problems before you go live.`,
  },
  {
    id: "connecting-orgs",
    title: "Connecting Your Salesforce Orgs",
    icon: Building2,
    content: `OrgSync uses Salesforce OAuth 2.0 with PKCE for secure, one-click authentication. You do not need to create a Connected App in Salesforce — OrgSync handles that for you.

**Steps:**
1. Go to Connected Orgs in your dashboard
2. Click Connect New Org
3. Choose Production or Sandbox
4. You'll be redirected to Salesforce's login page — log in with any user who has API access
5. Approve the OrgSync permissions
6. You're connected

OrgSync requests only the \`api\` OAuth scope — the minimum required to read and write Salesforce records. Your org credentials are encrypted with AES-256-GCM and never stored in plain text.

**Tip:** Use a dedicated Integration User in each org rather than a personal user account. This ensures syncs don't stop if someone changes their password.`,
  },
  {
    id: "creating-sync",
    title: "Creating a Sync Configuration",
    icon: ArrowLeftRight,
    content: `A sync configuration defines the relationship between a source object (where data comes from) and a target object (where data goes). You walk through this in a guided 8-step builder.

**Step 1 — Name your sync:** Give it a descriptive name like "Production Accounts → Subsidiary Contacts"

**Step 2 — Choose your orgs:** Select source org and target org from your connected orgs list

**Step 3 — Choose objects and direction:** Select the object in each org and whether to sync one-way (source → target) or bidirectionally (both ways)

**Step 4 — Set triggers:** Choose what events trigger a sync: record Created, Updated, or both

**Step 5 — Add filters (optional):** Only sync records that match specific criteria — for example, only Accounts where Industry = Technology, or only Contacts where Email is not blank

**Step 6 — Map fields:** Map each source field to a target field. OrgSync auto-suggests mappings by name. The AI analyzer reviews your mappings and flags incompatible types (e.g., Currency → Text), picklist value mismatches between orgs, missing required fields, read-only fields, and lookup field issues.

**Step 7 — Owner assignment:** Every Salesforce record needs an OwnerId. Since User IDs differ between orgs, choose a strategy: Fixed Owner (one user owns all synced records), Round Robin (rotates through a list), or Pass Through (copies source owner — only works if the same user exists in both orgs).

**Step 8 — Pre-flight test and review:** OrgSync fetches a real sample record from your source org and simulates the sync payload without writing anything. You see exactly what would be sent, including any warnings. Activate when ready.`,
  },
  {
    id: "bidirectional-sync",
    title: "Bidirectional Sync",
    icon: ArrowLeftRight,
    content: `Bidirectional sync keeps changes flowing in both directions — source to target and target to source.

**How it works:** OrgSync uses Salesforce's \`SystemModstamp\` field to detect which records have changed since the last sync run. After writing a record to the target org, OrgSync records the timestamp so it won't re-process the same record on the next cycle. This prevents infinite sync loops.

**Separate owner strategies per direction:** You can configure different owner assignment strategies for each direction — for example, all records coming from Org A use a Fixed Owner in Org B, while records going the other way use Round Robin.

**Recommendation:** Start with one-way sync first, confirm it works correctly, then enable the reverse direction. Bidirectional sync is more complex to debug when something goes wrong.`,
  },
  {
    id: "owner-assignment",
    title: "Owner Assignment",
    icon: UserCog,
    content: `Every Salesforce record must have an OwnerId. User IDs are unique per org — the same person has a different ID in each org — so you cannot simply copy OwnerId across orgs.

OrgSync provides three strategies:

**Fixed Owner:** All synced records in the target org are assigned to one specific user you select. Simple and predictable. Best for integration users or a dedicated owner.

**Round Robin:** Synced records are distributed evenly across a list of users you select. The first record goes to User 1, the second to User 2, and so on, cycling through the list. Good for distributing leads or cases across a team.

**Pass Through:** OrgSync copies the source OwnerId directly to the target record. This only works if the same user (same Salesforce User ID) exists in both orgs — which is rare. Using Pass Through when the user doesn't exist in the target org causes \`INVALID_CROSS_REFERENCE_KEY\` errors. Only use Pass Through if you've confirmed the user IDs match.`,
  },
  {
    id: "filters",
    title: "Filters",
    icon: Filter,
    content: `Filters let you control which records get synced. Only records that match all your filter conditions are processed.

**Example filters:**
- \`Industry\` equals \`Technology\` — only sync tech companies
- \`Email\` is not blank — only sync contacts with an email address
- \`AnnualRevenue\` greater than \`1000000\` — only sync enterprise accounts
- \`RecordTypeId\` equals \`[specific ID]\` — only sync records of a specific type

Filters are evaluated against the source record's field values before the record is sent to the target org. Records that don't match are counted as "filtered out" in your sync logs.`,
  },
  {
    id: "field-mapping",
    title: "Field Mapping",
    icon: Columns,
    content: `Field mapping defines how data flows from source fields to target fields. OrgSync loads all available fields from both objects using the Salesforce Metadata API.

**AI-powered analysis:** When you click "Analyze with AI" in the field mapping step, OrgSync's AI reviews your mappings and flags:
- Type mismatches (e.g., mapping a Currency field to a Text field)
- Missing required fields — fields the target object requires but aren't in your mapping
- Read-only fields (e.g., \`Name\` on Contact, formula fields, auto-number fields)
- Lookup fields that may reference records that don't exist in the target org
- **Picklist value mismatches** — if you map a picklist field in the source org to a picklist in the target org, OrgSync compares the actual allowed values from both orgs. If the source has values like \`"Hot"\` or \`"Cold"\` that don't exist in the target's picklist, Salesforce will reject those records. OrgSync flags missing values as a warning (partial overlap) or error (zero overlap) before you go live — so you know exactly which values to add to the target org's picklist definition first.

**Important:** The \`Name\` field on the Contact object is read-only — Salesforce builds it from \`FirstName\` and \`LastName\`. Map those separately and do not include \`Name\` in your mapping.

**How OrgSync tracks records:** When you activate a sync, OrgSync automatically creates a custom field \`OrgSync_Source_Id__c\` on the target object in your target org (requires "Customize Application" permission on the connected profile). This field stores the source record's Salesforce ID and uses Salesforce's native External ID upsert mechanism. On every sync run:
- If a record with that source ID already exists in the target org → it gets **updated**
- If no matching record exists → a **new record is created**
- If someone manually deletes a target record → OrgSync **recreates it cleanly** on the next run

Zero record data is ever stored in OrgSync's database — all data lives entirely within your own Salesforce orgs.`,
  },
  {
    id: "sync-logs",
    title: "Sync Logs & Error Handling",
    icon: CheckCircle2,
    content: `Every sync run is logged in the Sync Logs section. You can see:
- How many records were processed, succeeded, and failed
- The exact Salesforce error code and message for each failure
- When the sync ran and how long it took
- AI-generated explanations of errors with suggested fixes

**Inline retry:** You don't need to re-open your sync config to fix a failed record. From the Sync Logs page, expand any failed run and click Retry on individual records or Retry All to re-attempt all failures at once.

**Retry settings:** Each sync config has configurable retry settings — maximum automatic retry attempts (0 to 10), whether to auto-retry on partial failures, and notifications on failure. Configure these in Step 7 (Retry Settings) of the sync builder.

**Success rate:** Your dashboard shows an overall success rate across all syncs. When retried records succeed, the original sync log is updated — succeeded count increases, failed count decreases, and your success rate reflects the true outcome.`,
  },
  {
    id: "security",
    title: "Security",
    icon: ShieldCheck,
    content: `OrgSync is designed to be enterprise-safe and is built for Salesforce AppExchange compatibility.

**What we store:**
- Your Salesforce OAuth access tokens and refresh tokens — encrypted with AES-256-GCM. The encryption key is never in the database.
- Sync configuration metadata (which orgs, objects, field mappings, settings)
- Sync execution logs (record IDs, timestamps, error codes — never field values)

**What we never store:**
- Salesforce record field values (name, email, phone, revenue, etc.)
- Passwords
- PII from your Salesforce data

**Log retention by plan:**
Sync logs (run history, record counts, error codes) are automatically deleted on a nightly schedule based on your plan: Starter keeps 30 days, Professional keeps 90 days, Enterprise keeps 1 year. Individual record-level error details are cleaned up first; summary log rows follow the same schedule.

**Data isolation:** Each customer's data is isolated using Supabase Row Level Security. It is architecturally impossible for one customer's sync configuration to access another customer's org.

**OAuth scope:** OrgSync requests only the \`api\` OAuth scope — the minimum needed to read and write records via REST API.

**Transit:** All data between OrgSync and Salesforce is transmitted over TLS 1.2+. Your data never touches disk — syncs are processed entirely in memory.`,
  },
  {
    id: "common-errors",
    title: "Common Errors",
    icon: AlertTriangle,
    content: `**INVALID_CROSS_REFERENCE_KEY — Owner ID doesn't exist in target org**
The OwnerId you're using doesn't exist in the target org. Switch to Fixed Owner or Round Robin and select a real user from the target org.

**REQUIRED_FIELD_MISSING — Missing a required field in target object**
The target object requires a field you haven't mapped. Add it to your field mapping. If you can't map it from the source, set a default value for it in the target org's Salesforce field definition.

**INVALID_FIELD_FOR_INSERT_UPDATE: Name — Don't map Name on Contact**
The Name field on Contact is read-only. Remove Name → Name from your mapping and map FirstName and LastName individually.

**MALFORMED_QUERY — No fields in your mapping**
Your sync config has no field mappings. Edit the config and add at least one field mapping.

**FIELD_CUSTOM_VALIDATION_EXCEPTION — Validation rule in target org**
A validation rule in your target org is rejecting the record. Review the validation rules on the target object and either fix the source data or add a filter to exclude non-compliant records.`,
  },
];

const toc = sections.map((s) => ({ id: s.id, title: s.title }));

// ─── JSON-LD structured data for SEO ────────────────────────────────────────

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "How to Sync Two Salesforce Orgs — OrgSync Documentation",
  "description":
    "Complete guide to bidirectional Salesforce org synchronization: connecting orgs, field mapping, owner assignment, filters, error handling, and retry logic.",
  "url": "https://orgsync.io/docs",
  "author": {
    "@type": "Organization",
    "name": "OrgSync",
    "url": "https://orgsync.io",
  },
  "publisher": {
    "@type": "Organization",
    "name": "OrgSync",
    "url": "https://orgsync.io",
    "logo": {
      "@type": "ImageObject",
      "url": "https://orgsync.io/logo.png",
    },
  },
  "about": [
    { "@type": "Thing", "name": "Salesforce org synchronization" },
    { "@type": "Thing", "name": "Bidirectional Salesforce data sync" },
    { "@type": "Thing", "name": "Salesforce integration" },
    { "@type": "Thing", "name": "No-code Salesforce tools" },
  ],
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://orgsync.io/docs",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I sync two Salesforce orgs?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Connect both orgs using OAuth in the Connected Orgs section, then create a Sync Configuration selecting your source and target org, object, field mappings, and owner assignment strategy. OrgSync will automatically sync records every 2 minutes.",
      },
    },
    {
      "@type": "Question",
      "name": "Does OrgSync support bidirectional Salesforce sync?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Set Direction to Bidirectional in the sync builder. OrgSync uses SystemModstamp to detect changes in both orgs and syncs them in both directions, preventing infinite loops.",
      },
    },
    {
      "@type": "Question",
      "name": "Do I need to create a Connected App in Salesforce?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. OrgSync uses a shared Connected App with OAuth 2.0 + PKCE. You simply click Connect Org, log in to Salesforce, and approve access. No setup required on your end.",
      },
    },
    {
      "@type": "Question",
      "name": "Does OrgSync store my Salesforce data?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. OrgSync stores zero Salesforce record data. Data flows directly between your orgs in memory. OrgSync uses Salesforce's native External ID mechanism — a custom field (OrgSync_Source_Id__c) on your target object — to track which records have been synced. All data lives entirely within your own Salesforce orgs. OrgSync stores only sync configuration, execution logs, and timestamps.",
      },
    },
    {
      "@type": "Question",
      "name": "How do I handle owner assignment when syncing between orgs?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "OrgSync provides three owner assignment strategies: Fixed Owner (assign all records to one user), Round Robin (distribute across a list of users), or Pass Through (copy source OwnerId — only if the same user exists in both orgs).",
      },
    },
  ],
};

export default function DocsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="min-h-screen bg-background pt-24 pb-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">

          {/* Page header */}
          <div className="max-w-3xl mb-12">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <span>/</span>
              <span className="text-foreground font-medium">Documentation</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              How to Sync Two Salesforce Orgs
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              A complete guide to connecting, mapping, and keeping data synchronized between Salesforce orgs — automatically, bidirectionally, without code.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl gradient-bg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold hover:bg-accent transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </div>

          <div className="flex gap-12">
            {/* Table of contents — sticky sidebar */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-28 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-3">
                  On this page
                </p>
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    {item.title}
                  </a>
                ))}
                <div className="border-t mt-4 pt-4 px-3 space-y-2">
                  <p className="text-xs text-muted-foreground">Need help?</p>
                  <Link
                    href="/login"
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    Open a support ticket
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 min-w-0 space-y-16">
              {sections.map((section) => (
                <article key={section.id} id={section.id} className="scroll-mt-28">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-bg shadow-sm shadow-primary/20">
                      <section.icon className="h-4 w-4 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">{section.title}</h2>
                  </div>
                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    {section.content.split("\n\n").map((paragraph, i) => {
                      if (paragraph.startsWith("**") && paragraph.includes(":**")) {
                        const lines = paragraph.split("\n");
                        return (
                          <div key={i} className="space-y-2 my-4">
                            {lines.map((line, j) => {
                              if (line.startsWith("**") && line.includes(":**")) {
                                const colonIdx = line.indexOf(":**");
                                const bold = line.slice(2, colonIdx);
                                const rest = line.slice(colonIdx + 3).trim();
                                return (
                                  <div key={j} className="flex gap-2">
                                    <span className="font-semibold text-foreground shrink-0">{bold}:</span>
                                    <span className="text-muted-foreground text-sm leading-relaxed">{rest}</span>
                                  </div>
                                );
                              }
                              if (line.startsWith("- ")) {
                                return (
                                  <div key={j} className="flex gap-2 pl-4">
                                    <span className="text-muted-foreground shrink-0">•</span>
                                    <span className="text-sm text-muted-foreground leading-relaxed">{renderInlineCode(line.slice(2))}</span>
                                  </div>
                                );
                              }
                              return (
                                <p key={j} className="text-sm text-muted-foreground leading-relaxed">{renderInlineCode(line)}</p>
                              );
                            })}
                          </div>
                        );
                      }
                      if (paragraph.startsWith("**Step")) {
                        const lines = paragraph.split("\n");
                        return (
                          <div key={i} className="my-3">
                            {lines.map((line, j) => {
                              const boldMatch = line.match(/^\*\*(.+?)\*\*(.*)$/);
                              if (boldMatch) {
                                return (
                                  <p key={j} className="text-sm leading-relaxed">
                                    <span className="font-semibold text-foreground">{boldMatch[1]}</span>
                                    <span className="text-muted-foreground">{boldMatch[2]}</span>
                                  </p>
                                );
                              }
                              return <p key={j} className="text-sm text-muted-foreground leading-relaxed">{line}</p>;
                            })}
                          </div>
                        );
                      }
                      if (paragraph.startsWith("**Tip:**")) {
                        return (
                          <div key={i} className="flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 my-4">
                            <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-sm leading-relaxed">
                              <span className="font-semibold text-foreground">Tip: </span>
                              <span className="text-muted-foreground">{paragraph.slice(8).trim()}</span>
                            </p>
                          </div>
                        );
                      }
                      if (paragraph.startsWith("**Important:**")) {
                        return (
                          <div key={i} className="flex items-start gap-2 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 my-4">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                            <p className="text-sm leading-relaxed">
                              <span className="font-semibold text-yellow-800">Important: </span>
                              <span className="text-yellow-700">{paragraph.slice(14).trim()}</span>
                            </p>
                          </div>
                        );
                      }
                      if (paragraph.startsWith("**Recommendation:**")) {
                        return (
                          <div key={i} className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 my-4">
                            <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-sm leading-relaxed">
                              <span className="font-semibold text-blue-800">Recommendation: </span>
                              <span className="text-blue-700">{paragraph.slice(19).trim()}</span>
                            </p>
                          </div>
                        );
                      }
                      const boldHeaderMatch = paragraph.match(/^\*\*(.+?):\*\*\n([\s\S]+)/);
                      if (boldHeaderMatch) {
                        return (
                          <div key={i} className="my-4">
                            <p className="text-sm font-semibold text-foreground mb-2">{boldHeaderMatch[1]}:</p>
                            <div className="space-y-1.5 pl-3 border-l-2 border-primary/20">
                              {boldHeaderMatch[2].split("\n").map((line, j) => (
                                <p key={j} className="text-sm text-muted-foreground leading-relaxed">{renderInlineCode(line)}</p>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <p key={i} className="text-sm text-muted-foreground leading-relaxed my-3">
                          {renderInlineCode(paragraph)}
                        </p>
                      );
                    })}
                  </div>
                </article>
              ))}

              {/* CTA at bottom */}
              <div className="rounded-2xl gradient-bg p-8 text-white text-center">
                <h2 className="text-2xl font-bold mb-2">Ready to sync your Salesforce orgs?</h2>
                <p className="text-white/80 mb-6 max-w-lg mx-auto text-sm leading-relaxed">
                  Connect two Salesforce orgs in minutes. No code, no Connected App setup, no data stored on our servers.
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary hover:bg-white/90 transition-opacity"
                  >
                    Start for free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    View plans
                  </Link>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}

function renderInlineCode(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="rounded bg-muted px-1.5 py-0.5 text-[12px] font-mono text-foreground">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        )
      )}
    </>
  );
}
