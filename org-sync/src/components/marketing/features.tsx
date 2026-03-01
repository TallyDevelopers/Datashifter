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
    title: "Bidirectional Sync",
    description:
      "Sync data one-way or both ways between any number of connected orgs. Full control over direction.",
  },
  {
    icon: LayoutGrid,
    title: "Visual Field Mapping",
    description:
      "Drag-and-drop field mapper with auto-matching. Map any field to any field across objects.",
  },
  {
    icon: Filter,
    title: "Smart Filters",
    description:
      "Only sync what matters. Build filters with conditions so only qualifying records flow through.",
  },
  {
    icon: RotateCcw,
    title: "One-Click Retry",
    description:
      "See exactly why a record failed. Fix it and retry individually or in bulk with a single click.",
  },
  {
    icon: Bell,
    title: "Event Triggers",
    description:
      "Choose what starts a sync — record creation, updates, deletions, or all of the above.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "OAuth 2.0 authentication, encrypted token storage, and SOC 2 compliant infrastructure.",
  },
  {
    icon: Gauge,
    title: "Real-Time Monitoring",
    description:
      "Live dashboards showing sync progress, success rates, and detailed error logs.",
  },
  {
    icon: Users,
    title: "Multi-Org Support",
    description:
      "Connect as many orgs as your plan allows. Production, Sandbox, Developer — all supported.",
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
            Everything you need to keep orgs in sync
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Built for Salesforce admins and developers who need reliable,
            real-time data synchronization without the complexity.
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
