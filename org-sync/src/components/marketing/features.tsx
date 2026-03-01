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
} from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

const features = [
  {
    icon: ArrowLeftRight,
    title: "True Bidirectional Sync",
    description:
      "One-way or two-way — you decide. Changes in either org flow to the other without loops or duplicates.",
  },
  {
    icon: LayoutGrid,
    title: "Visual Field Mapper",
    description:
      "See every field from both orgs side by side. Auto-match by name or map manually. What you configure is exactly what syncs.",
  },
  {
    icon: Filter,
    title: "Precision Filters",
    description:
      "Only sync records that meet your conditions. Set rules on any field so only the right data moves.",
  },
  {
    icon: RotateCcw,
    title: "Per-Record Retry",
    description:
      "Every failed record shows the exact error. Retry one record or an entire batch — no rebuilding required.",
  },
  {
    icon: Bell,
    title: "Flexible Triggers",
    description:
      "Sync on create, update, delete — or all three. You control what events move data between orgs.",
  },
  {
    icon: Shield,
    title: "Secure by Design",
    description:
      "OAuth 2.0 with PKCE, AES-256 encrypted token storage, and complete data isolation between accounts.",
  },
  {
    icon: Gauge,
    title: "Full Audit Logs",
    description:
      "Every sync execution is logged. See records processed, errors encountered, timing, and status — all in one place.",
  },
  {
    icon: Users,
    title: "Unlimited Org Connections",
    description:
      "Production, Sandbox, Developer Edition — connect as many orgs as your plan allows with one click each.",
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
            Everything you need. Nothing you don&apos;t.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Built specifically for Salesforce teams who need reliable data synchronization
            with full visibility — not a generic tool bolted together.
          </p>
        </FadeIn>

        <StaggerContainer
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          staggerDelay={0.08}
        >
          {features.map((feature) => (
            <StaggerItem key={feature.title}>
              <div className="group relative h-full rounded-2xl border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:gradient-bg group-hover:text-white">
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
