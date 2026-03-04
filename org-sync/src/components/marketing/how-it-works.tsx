"use client";

import { Link2, MousePointerClick, PlayCircle, Eye } from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

const steps = [
  {
    step: "01",
    icon: Link2,
    title: "Connect your orgs",
    description: "Click \"Connect Org,\" log in to Salesforce like you normally would, and hit Authorize. No IT ticket, no setup, no special configuration.",
    highlight: null,
    example: "Production and Sandbox connected in under 2 minutes.",
  },
  {
    step: "02",
    icon: MousePointerClick,
    title: "Pick what to sync",
    description: "Choose your object (Accounts, Contacts, Leads…), map the fields you want to copy, and set filters — like \"only when a record is created\" or \"only in California.\"",
    highlight: null,
    example: "\"Sync Accounts from Production → Sandbox on create or update.\"",
  },
  {
    step: "03",
    icon: PlayCircle,
    title: "Test before going live",
    description: "AI runs a dry test with a real record and tells you if anything would fail — permissions, field types, missing values. Nothing gets written during the test.",
    highlight: "Zero risk — nothing gets written",
    example: "\"1 field may cause an issue — here's why.\"",
  },
  {
    step: "04",
    icon: Eye,
    title: "Activate and monitor",
    description: "Turn it on. Records flow every 2 minutes. Every run is logged — failures explained in plain English, one-click retry on anything that didn't make it.",
    highlight: null,
    example: "\"3 records failed: 'Rating' is required in target.\" → Retry All",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            How It Works
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Up and running in under 10 minutes
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            No developers. No consultants. No Salesforce configuration.
            Just connect, set up what you want synced, and go live.
          </p>
        </FadeIn>

        <StaggerContainer className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4" staggerDelay={0.12}>
          {steps.map((step, i) => (
            <StaggerItem key={step.step}>
              <div className="group relative h-full rounded-2xl border bg-card p-8 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-bg text-white shadow-lg shadow-primary/25">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-4xl font-bold text-muted-foreground/20">
                    {step.step}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed text-sm">
                  {step.description}
                </p>
                <div className="mt-4 rounded-lg bg-muted/50 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground italic">{step.example}</p>
                </div>
                {step.highlight && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                    {step.highlight}
                  </div>
                )}
                {i < steps.length - 1 && (
                  <div className="absolute -right-4 top-1/2 hidden h-0.5 w-8 bg-border lg:block" />
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
