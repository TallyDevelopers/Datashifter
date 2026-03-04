"use client";

import { Sparkles, FlaskConical, MessageSquareText, BrainCircuit, TrendingUp } from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

const aiFeatures = [
  {
    icon: FlaskConical,
    title: "Test before anything goes live",
    tagline: "No more crossing your fingers.",
    description:
      "Before you activate a sync, click \"Run Test.\" OrgSync uses a real record from your org, runs it through your configuration, and tells you if everything would work — or exactly what would break. Nothing gets written to your other org.",
    bullets: [
      "Uses a real record from your org",
      "Checks permissions and field compatibility",
      "Shows you what would actually sync",
      "Stops if something would fail",
      "Safe — nothing is written during the test",
    ],
  },
  {
    icon: Sparkles,
    title: "Catch setup mistakes before they cause failures",
    tagline: "A second pair of eyes on every sync.",
    description:
      "When you're setting up which fields to sync, AI reviews your choices and flags anything that looks wrong — a field that's the wrong type, a required field you haven't mapped, a field that can't be written to, or a picklist with values that don't exist in the other org. It also suggests fields you might have missed.",
    bullets: [
      "Flags type mismatches (e.g. Currency → Text)",
      "Catches required fields you haven't mapped",
      "Detects picklist value mismatches between orgs",
      "Warns when source values will be rejected by target",
      "One-click to accept any suggestion",
    ],
  },
  {
    icon: MessageSquareText,
    title: "Understand errors without being a developer",
    tagline: "Plain English. Every time.",
    description:
      "When a record fails to sync, Salesforce gives you a cryptic error code. OrgSync translates it into plain English — what went wrong, why, and what you should do to fix it. No Googling, no guessing.",
    bullets: [
      "\"This field is required but wasn't mapped\"",
      "\"You don't have permission to write to this field\"",
      "\"This record already exists in the target org\"",
      "Specific fix suggestion for each error",
      "Available on any failed record",
    ],
  },
  {
    icon: BrainCircuit,
    title: "Set up a sync just by describing it",
    tagline: "If you can say it, we can build it.",
    description:
      "Not sure where to start? Just type what you want — \"sync Accounts from Production to Sandbox when they're created or updated\" — and OrgSync pre-fills the entire setup for you. You review it, adjust if needed, and save.",
    bullets: [
      "Type in plain English",
      "OrgSync fills in the full configuration",
      "Review and adjust before saving",
      "Works for any object or trigger",
      "Takes 30 seconds",
    ],
  },
  {
    icon: TrendingUp,
    title: "Know the moment something stops working",
    tagline: "Problems caught before you have to ask.",
    description:
      "OrgSync watches your sync activity over time and tells you if something looks wrong — a sync that normally moves hundreds of records suddenly moving none, a drop in how many records are succeeding, or a sync that's been inactive when it shouldn't be.",
    bullets: [
      "Compares today's activity to your normal baseline",
      "Alerts you when a sync goes quiet",
      "Flags sudden drops in success rate",
      "Shows up on your dashboard the moment something's off",
      "Gives you a plain English description of what changed",
    ],
  },
];

export function AISection() {
  return (
    <section id="ai" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary mb-4">
            <Sparkles className="h-4 w-4" />
            Built-in AI
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            It does the technical checking{" "}
            <span className="gradient-text">so you don&apos;t have to</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Syncing data between Salesforce orgs has a hundred ways to go wrong quietly.
            OrgSync uses AI to catch them before they become problems — and explain them in plain English when they do.
          </p>
        </FadeIn>

        <StaggerContainer className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3" staggerDelay={0.1}>
          {aiFeatures.map((feature) => (
            <StaggerItem key={feature.title}>
              <div className="group relative h-full rounded-2xl border border-primary/15 bg-card p-8 transition-all duration-300 hover:shadow-xl hover:shadow-primary/8 hover:-translate-y-1 hover:border-primary/30">
                {/* AI badge */}
                <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                  <Sparkles className="h-2.5 w-2.5 text-primary" />
                  <span className="text-[10px] font-semibold text-primary">AI</span>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-bg text-white shadow-lg shadow-primary/20">
                  <feature.icon className="h-6 w-6" />
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">{feature.tagline}</p>
                  <h3 className="mt-1 text-lg font-bold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>

                <ul className="mt-5 space-y-2">
                  {feature.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
