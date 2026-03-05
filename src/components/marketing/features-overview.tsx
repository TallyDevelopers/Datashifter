"use client";

import Link from "next/link";
import { RefreshCw, MoveRight, Package, Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

const features = [
  {
    icon: RefreshCw,
    badge: "Live Sync",
    title: "Real-time bidirectional sync",
    description:
      "Keep two orgs in sync automatically. Records created or updated in one org appear in the other within 2 minutes. Bidirectional, filterable, with visual field mapping.",
    href: "/features/live-sync",
    bullets: ["Every 2 minutes", "Bidirectional", "Filters & field mapping", "Record Type support"],
  },
  {
    icon: MoveRight,
    badge: "Migrations",
    title: "Bulk data movement on demand",
    description:
      "Move any object — Accounts, Contacts, custom objects, Orders — from one org to another in bulk. Multi-step jobs with dependency ordering, deduplication, and full run history.",
    href: "/features/migrations",
    bullets: ["Any Salesforce object", "Multi-step, ordered", "Match strategy for deduplication", "Save & re-run"],
  },
  {
    icon: Package,
    badge: "CPQ & RCA",
    title: "CPQ and Revenue Cloud migrations",
    description:
      "Pre-built templates for Salesforce CPQ and Revenue Cloud Accelerator (RCA) migrations. Handles the complex dependency chains — Price Books before Entries, Assets before Subscriptions — automatically.",
    href: "/features/cpq",
    bullets: ["CPQ product catalog", "RCA billing objects", "Dependency-aware ordering", "Critical-fail stops"],
  },
  {
    icon: Sparkles,
    badge: "AI",
    title: "AI that understands your setup",
    description:
      "Pre-flight analysis catches type mismatches and unmapped required fields before you activate. The Sync Assistant chatbot knows your field mappings, logs, and errors — and explains everything in plain English.",
    href: "/features/ai",
    bullets: ["Pre-flight mapping analysis", "Sync Assistant chatbot", "Plain English summaries", "Anomaly detection"],
  },
];

export function FeaturesOverview() {
  return (
    <section className="py-24" id="features">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center mb-16">
            <Badge variant="outline" className="text-primary border-primary/30 mb-4">Platform</Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Everything you need to move Salesforce data
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              One platform. Live sync, bulk migrations, CPQ/RCA templates, and AI — all connected.
            </p>
          </div>
        </FadeIn>
        <StaggerContainer className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {features.map((f) => (
            <StaggerItem key={f.title}>
              <Link
                href={f.href}
                className="group flex flex-col rounded-2xl border bg-card p-8 hover:border-primary/40 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-bg-subtle group-hover:gradient-bg transition-all duration-200">
                    <f.icon className="h-6 w-6 text-primary group-hover:text-white transition-colors duration-200" />
                  </div>
                  <Badge variant="outline" className="text-xs text-primary border-primary/30">
                    {f.badge}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">{f.description}</p>
                <ul className="space-y-1.5 mb-5">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all duration-200">
                  Learn more <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
