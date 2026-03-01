"use client";

import { Link2, MousePointerClick, RefreshCw } from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

const steps = [
  {
    step: "01",
    icon: Link2,
    title: "Connect Your Orgs",
    description:
      "One-click OAuth connection — no Connected App setup needed. Just log in and authorize. Works with Production and Sandbox orgs.",
  },
  {
    step: "02",
    icon: MousePointerClick,
    title: "Map Your Data",
    description:
      "Select objects, map fields visually with our drag-and-drop builder. Set filters and choose which events trigger a sync.",
  },
  {
    step: "03",
    icon: RefreshCw,
    title: "Sync in Real Time",
    description:
      "Activate your sync and watch data flow between orgs instantly. Monitor progress, catch errors, and retry with one click.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            How It Works
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Three steps to perfect sync
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Get up and running in minutes, not days. No complex configuration or
            technical expertise required.
          </p>
        </FadeIn>

        <StaggerContainer className="mt-16 grid gap-8 md:grid-cols-3" staggerDelay={0.15}>
          {steps.map((step, i) => (
            <StaggerItem key={step.step}>
              <div className="group relative rounded-2xl border bg-card p-8 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-bg text-white shadow-lg shadow-primary/25">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-4xl font-bold text-muted-foreground/20">
                    {step.step}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
                {i < steps.length - 1 && (
                  <div className="absolute -right-4 top-1/2 hidden h-0.5 w-8 bg-border md:block" />
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
