"use client";

import {
  ArrowLeftRight,
  Shield,
  Filter,
  LayoutGrid,
  RotateCcw,
  Bell,
  Gauge,
  Users,
  Sparkles,
  FlaskConical,
  MessageSquareText,
  BrainCircuit,
  TrendingUp,
  Link2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

const features = [
  {
    icon: Link2,
    title: "Connect in one click",
    description:
      "Log in to Salesforce like normal and click Authorize. Your org is connected — no IT ticket, no special setup, no Salesforce admin needed.",
    ai: false,
  },
  {
    icon: ArrowLeftRight,
    title: "Sync in both directions",
    description:
      "Records can flow one way, or both ways. Changes in either org copy to the other automatically — without creating duplicates or getting stuck in a loop.",
    ai: false,
  },
  {
    icon: LayoutGrid,
    title: "Choose exactly what copies over",
    description:
      "See every field from both orgs side by side. Pick which fields move between orgs and match them up. OrgSync syncs exactly what you configure — nothing more, nothing less.",
    ai: false,
  },
  {
    icon: Filter,
    title: "Only sync the records you want",
    description:
      "Set conditions like \"only sync accounts in New York\" or \"only when the status is Active.\" Records that don't match your rules stay put.",
    ai: false,
  },
  {
    icon: Bell,
    title: "Control when syncs happen",
    description:
      "Choose whether records sync when they're created, when they're updated, or both. You decide which events trigger a sync — not us.",
    ai: false,
  },
  {
    icon: RotateCcw,
    title: "Retry any failed record instantly",
    description:
      "When a record fails, it shows up in your dashboard with the reason. Click retry on one record or an entire failed batch — no rebuilding, no starting over.",
    ai: false,
  },
  {
    icon: Sparkles,
    title: "AI checks your setup before you go live",
    description:
      "Before you activate a sync, AI reviews your configuration and flags anything that would cause records to fail — incompatible fields, missing required data, permission issues.",
    ai: true,
  },
  {
    icon: FlaskConical,
    title: "Test with a real record before activating",
    description:
      "Run a live test using an actual record from your org. OrgSync shows you exactly what would happen — and stops if something would break. Nothing gets written until you're ready.",
    ai: true,
  },
  {
    icon: MessageSquareText,
    title: "Errors explained in plain English",
    description:
      "When something fails, you don't get a raw error code. You get a clear explanation of what went wrong and what to do about it.",
    ai: true,
  },
  {
    icon: BrainCircuit,
    title: "Set up a sync by describing it",
    description:
      "Type what you want — \"sync Accounts to my Sandbox when they're created\" — and OrgSync pre-fills the entire setup. You just review and save.",
    ai: true,
  },
  {
    icon: TrendingUp,
    title: "Get alerted when something looks wrong",
    description:
      "OrgSync watches your sync activity and tells you if something seems off — like a sync that normally moves 200 records a day suddenly going quiet.",
    ai: true,
  },
  {
    icon: Gauge,
    title: "See everything that happened",
    description:
      "Every sync run is logged. Every record that moved, every record that failed, every error — all in one place, filterable by success or failure.",
    ai: false,
  },
  {
    icon: Users,
    title: "Connect as many orgs as you need",
    description:
      "Connect your Production org, Sandbox, a partner org, a client org — as many as your plan allows. Each one independent, all managed from one dashboard.",
    ai: false,
  },
  {
    icon: Shield,
    title: "Your data stays yours",
    description:
      "OrgSync never stores your Salesforce records. It reads, maps, and writes — in memory only. Your data never touches our database.",
    ai: false,
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-24 lg:py-32 gradient-bg-subtle">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Features
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Everything you need to{" "}
            <span className="gradient-text">sync with confidence</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Built for Salesforce teams who need data moving reliably between orgs — 
            with full control over what syncs, when it syncs, and what happens when something goes wrong.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              AI-assisted features highlighted
            </div>
          </div>
        </FadeIn>

        <StaggerContainer
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          staggerDelay={0.06}
        >
          {features.map((feature) => (
            <StaggerItem key={feature.title}>
              <div className={`group relative h-full rounded-2xl border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 ${feature.ai ? "border-primary/20" : ""}`}>
                {feature.ai && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="gap-1 text-[10px] py-0.5 px-1.5 border-primary/20 bg-primary/5 text-primary">
                      <Sparkles className="h-2.5 w-2.5" />AI
                    </Badge>
                  </div>
                )}
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${feature.ai ? "gradient-bg text-white" : "bg-primary/10 text-primary group-hover:gradient-bg group-hover:text-white"}`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
