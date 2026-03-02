"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen, Zap, Building2, ArrowLeftRight, AlertTriangle,
  CheckCircle2, ChevronDown, ExternalLink, Search, HelpCircle,
  RotateCcw, ShieldCheck, UserCog, Filter, Columns, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Content ─────────────────────────────────────────────────────────────────

const GETTING_STARTED = [
  {
    step: 1,
    icon: Building2,
    title: "Connect your Salesforce orgs",
    description: "Go to Connected Orgs and click Connect New Org. You'll be redirected to Salesforce to approve access — no Connected App setup required on your end. OrgSync handles authentication securely via OAuth 2.0.",
    tip: "You can connect Production and Sandbox orgs. Connect at least two to start syncing between them.",
    link: { label: "Go to Connected Orgs", href: "/orgs" },
  },
  {
    step: 2,
    icon: ArrowLeftRight,
    title: "Create a sync configuration",
    description: "Go to Sync Configs and click New Sync. You'll walk through selecting a source org and object, a target org and object, how records should be triggered (on create, update), owner assignment, filters, and field mappings.",
    tip: "Start with a one-way sync before trying bidirectional. It's easier to debug.",
    link: { label: "Create a Sync", href: "/syncs/new" },
  },
  {
    step: 3,
    icon: UserCog,
    title: "Set up owner assignment",
    description: "Every Salesforce record needs an OwnerId. Since User IDs differ between orgs, you must choose a strategy: Fixed Owner (all records go to one user), Round Robin (rotate through a list), or Pass Through (copies source ID — only works if the same user exists in both orgs).",
    tip: "Pass Through will cause INVALID_CROSS_REFERENCE_KEY errors if the source user doesn't exist in the target org. Use Fixed or Round Robin to be safe.",
  },
  {
    step: 4,
    icon: Columns,
    title: "Map your fields",
    description: "In Step 6 of the sync builder, map fields from your source object to your target object. OrgSync will suggest mappings automatically. The AI analyzer will warn you about incompatible types, required fields you've missed, and read-only fields.",
    tip: "Don't map the Name field on Contact — it's a read-only compound field. Map FirstName and LastName separately instead.",
  },
  {
    step: 5,
    icon: Zap,
    title: "Run a pre-flight test",
    description: "Before activating, run the pre-flight test in Step 8 of the builder. It fetches a real sample record from your source org and simulates the payload without writing anything. You'll see exactly what would be sent and any warnings before going live.",
    tip: "The pre-flight test is completely safe — it never writes to your target org.",
  },
  {
    step: 6,
    icon: CheckCircle2,
    title: "Activate and monitor",
    description: "Activate your sync from the Sync Configs list. OrgSync polls for changes every 2 minutes. Go to Sync Logs to see every run — how many records succeeded, failed, and exactly what the error was. You can retry failed records individually or all at once.",
    link: { label: "View Sync Logs", href: "/logs" },
  },
];

const COMMON_ERRORS = [
  {
    code: "INVALID_CROSS_REFERENCE_KEY",
    title: "Owner ID doesn't exist in target org",
    explanation: "The OwnerId from your source org doesn't exist in the target org. You can't copy User IDs between orgs — they're unique per org.",
    fix: "Go to your sync config and change the Owner Assignment strategy to Fixed or Round Robin. Select a real user from your target org.",
    fixLink: { label: "Edit sync config", href: "/syncs" },
    severity: "error",
  },
  {
    code: "REQUIRED_FIELD_MISSING",
    title: "A required field wasn't included in the mapping",
    explanation: "The target org requires a field that isn't in your field mapping. Salesforce won't let you create or update a record without it.",
    fix: "Add the missing field to your field mapping. If you can't map it from the source, set a default value for it in the target org's field definition.",
    fixLink: { label: "Fix field mapping", href: "/syncs" },
    severity: "error",
  },
  {
    code: "INVALID_FIELD_FOR_INSERT_UPDATE: Name",
    title: "Mapped the Name field on Contact",
    explanation: "The Name field on Contact is a read-only compound field — Salesforce builds it from FirstName and LastName automatically.",
    fix: "Remove Name → Name from your field mapping. Map FirstName → FirstName and LastName → LastName instead.",
    severity: "error",
  },
  {
    code: "MALFORMED_QUERY",
    title: "Sync has no field mappings",
    explanation: "Your sync config was saved without any field mappings. The worker can't build a SOQL query with no fields to select.",
    fix: "Edit your sync config and add at least one field mapping in Step 6.",
    fixLink: { label: "Edit sync config", href: "/syncs" },
    severity: "error",
  },
  {
    code: "FIELD_CUSTOM_VALIDATION_EXCEPTION",
    title: "Validation rule blocked the record",
    explanation: "The target org has a validation rule that the synced record failed. This is a data quality issue in the source org or a config mismatch.",
    fix: "Review the validation rules on the target object in Salesforce. Either fix the source data, add a filter to exclude non-compliant records, or adjust the validation rule.",
    severity: "warn",
  },
  {
    code: "INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY",
    title: "Lookup field references a record the user can't access",
    explanation: "A lookup field (like AccountId) points to a record that exists in the target org but the OwnerId user doesn't have permission to see.",
    fix: "Use a system-level user (like an Integration User) as the Fixed Owner so it has full access, or review sharing rules on the target org.",
    severity: "warn",
  },
];

const FAQS = [
  {
    q: "Does OrgSync store my Salesforce data?",
    a: "No. OrgSync never stores Salesforce record field values. We only store record IDs (to track what's been synced), sync configuration metadata, and execution logs. Your data flows directly between your orgs in memory.",
  },
  {
    q: "How often does OrgSync check for new records?",
    a: "Every 2 minutes. OrgSync polls your source org for records modified since the last successful run using Salesforce's SystemModstamp field. This means the maximum delay between a record changing and it syncing is about 2 minutes.",
  },
  {
    q: "Can I sync the same object in both directions?",
    a: "Yes — set Direction to Bidirectional in Step 3 of the sync builder. You can configure separate owner assignment strategies for each direction. Be aware that bidirectional sync requires careful field mapping to avoid infinite loops — OrgSync uses SystemModstamp to prevent re-syncing records it just wrote.",
  },
  {
    q: "What happens if a sync fails halfway through?",
    a: "OrgSync uses per-record tracking. If 8 out of 10 records succeed and 2 fail, the 8 are marked as synced and won't be re-processed. The 2 failures are logged with exact error codes and you can retry them individually or all at once from the Logs page.",
  },
  {
    q: "Can I filter which records get synced?",
    a: "Yes. In Step 5 of the sync builder you can add filter conditions — for example, only sync Accounts where Industry equals 'Technology', or only Contacts where Email is not empty. Filters use the source record's field values.",
  },
  {
    q: "What Salesforce permissions does OrgSync need?",
    a: "OrgSync requests the 'api' OAuth scope, which gives access to Salesforce data via REST API. It needs Read access on the source object and Create/Edit access on the target object. We recommend using a dedicated Integration User profile.",
  },
  {
    q: "Will OrgSync work with Salesforce Sandboxes?",
    a: "Yes. When connecting an org, select Sandbox and you'll be redirected to test.salesforce.com instead of login.salesforce.com. You can mix Production and Sandbox orgs in the same sync.",
  },
  {
    q: "What is the Owner Assignment step for?",
    a: "Every Salesforce record must have an OwnerId. Since User IDs are unique per org, you can't copy them across orgs. The Owner Assignment step lets you choose: Fixed Owner (one user owns all synced records), Round Robin (rotates through selected users), or Pass Through (copies source OwnerId — only works if the same user exists in both orgs).",
  },
  {
    q: "Can I connect more than 2 orgs?",
    a: "Yes, depending on your plan. You can connect multiple orgs and create sync configs between any pair of them. Each sync config has one source org and one target org.",
  },
];

// ─── Components ──────────────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0">
      <button
        className="flex w-full items-start justify-between gap-4 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-medium leading-relaxed">{q}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground mt-0.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

function ErrorCard({ error }: { error: typeof COMMON_ERRORS[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        "rounded-xl border cursor-pointer transition-all",
        open ? "border-primary/30 bg-primary/5" : "hover:border-primary/20 hover:bg-muted/30"
      )}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5",
            error.severity === "error" ? "bg-red-100" : "bg-yellow-100"
          )}>
            <AlertTriangle className={cn("h-3.5 w-3.5", error.severity === "error" ? "text-red-600" : "text-yellow-600")} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold">{error.title}</p>
              <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground shrink-0">
                {error.code}
              </code>
            </div>
            {!open && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{error.explanation}</p>
            )}
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground mt-1 transition-transform", open && "rotate-180")} />
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3 mt-0">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">What happened</p>
            <p className="text-sm text-foreground leading-relaxed">{error.explanation}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">How to fix it</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{error.fix}</p>
          </div>
          {error.fixLink && (
            <Link
              href={error.fixLink.href}
              className="inline-flex items-center gap-1.5 rounded-lg gradient-bg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              {error.fixLink.label}
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<"start" | "errors" | "faq">("start");

  const filteredFaqs = search.trim()
    ? FAQS.filter((f) =>
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase())
      )
    : FAQS;

  const filteredErrors = search.trim()
    ? COMMON_ERRORS.filter((e) =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.code.toLowerCase().includes(search.toLowerCase()) ||
        e.explanation.toLowerCase().includes(search.toLowerCase())
      )
    : COMMON_ERRORS;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">Help Center</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Everything you need to get your Salesforce orgs syncing. Can&apos;t find what you need?{" "}
          <Link href="/support" className="text-primary hover:underline">Open a support ticket</Link>.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search — e.g. 'owner assignment', 'INVALID_FIELD', 'bidirectional'…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border bg-background py-3 pl-10 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Section tabs — hidden when searching */}
      {!search && (
        <div className="flex items-center gap-2 border-b">
          {[
            { id: "start" as const, label: "Getting Started", icon: Zap },
            { id: "errors" as const, label: "Common Errors", icon: AlertTriangle },
            { id: "faq" as const, label: "FAQ", icon: HelpCircle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeSection === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Getting Started */}
      {(activeSection === "start" || search) && (
        <div className="space-y-4">
          {search && (
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Getting Started</h3>
          )}
          <div className="grid gap-4">
            {GETTING_STARTED.map((item) => (
              <Card key={item.step} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex gap-4 p-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-bg shadow-sm shadow-primary/20">
                      <item.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] text-muted-foreground py-0 h-4">
                          Step {item.step}
                        </Badge>
                        <h3 className="text-sm font-semibold">{item.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                      {item.tip && (
                        <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2">
                          <Zap className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground leading-relaxed">{item.tip}</p>
                        </div>
                      )}
                      {item.link && (
                        <Link
                          href={item.link.href}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                          {item.link.label}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Common Errors */}
      {(activeSection === "errors" || search) && (
        <div className="space-y-3">
          {search && (
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Common Errors</h3>
          )}
          {filteredErrors.length > 0 ? (
            <div className="space-y-2">
              {filteredErrors.map((err) => (
                <ErrorCard key={err.code} error={err} />
              ))}
            </div>
          ) : search ? (
            <p className="text-sm text-muted-foreground">No matching errors found.</p>
          ) : null}
        </div>
      )}

      {/* FAQ */}
      {(activeSection === "faq" || search) && (
        <div className="space-y-3">
          {search && (
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">FAQ</h3>
          )}
          {filteredFaqs.length > 0 ? (
            <Card>
              <CardContent className="p-0 divide-y">
                {filteredFaqs.map((item) => (
                  <div key={item.q} className="px-5">
                    <FAQItem q={item.q} a={item.a} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : search ? (
            <p className="text-sm text-muted-foreground">No matching FAQs found.</p>
          ) : null}
        </div>
      )}

      {/* Still stuck */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between gap-4 p-5 flex-wrap">
          <div className="flex items-start gap-3">
            <LifeBuoy className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Still stuck?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Our support team responds to every ticket. Describe what you were trying to do and what error you saw.</p>
            </div>
          </div>
          <Link
            href="/support"
            className="inline-flex items-center gap-2 rounded-xl gradient-bg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity shrink-0"
          >
            Open a ticket
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function LifeBuoy({ className }: { className?: string }) {
  return <HelpCircle className={className} />;
}
