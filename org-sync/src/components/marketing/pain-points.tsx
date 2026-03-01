"use client";

import { X, Check } from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

const pains = [
  {
    problem: "You set up a sync and it fails silently — you find out days later when a customer complains",
    solution: "Every failed record is logged with the exact reason. You see it the moment it happens.",
  },
  {
    problem: "Your bill doubles every month because you're charged per record synced",
    solution: "Flat monthly pricing. Sync 100 records or 10 million — your cost stays the same.",
  },
  {
    problem: "Syncing in both directions creates duplicate records and infinite loops",
    solution: "True bidirectional sync with built-in loop prevention and record mapping.",
  },
  {
    problem: "A record fails and there's no way to push it through without rebuilding the whole flow",
    solution: "One-click retry per record, or bulk retry an entire failed batch instantly.",
  },
  {
    problem: "You have no idea which fields are actually moving between orgs",
    solution: "Visual field mapper shows exactly what flows where — no guessing, no surprises.",
  },
  {
    problem: "Every org connection requires someone to build and manage a Connected App",
    solution: "One-click OAuth. Log in, authorize, done. No setup on your Salesforce side.",
  },
];

export function PainPoints() {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Built for the real world
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            We&apos;ve heard the frustrations.{" "}
            <span className="gradient-text">We fixed them.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            OrgSync was designed around the problems that actually keep Salesforce teams up at night.
          </p>
        </FadeIn>

        <StaggerContainer className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3" staggerDelay={0.07}>
          {pains.map((item, i) => (
            <StaggerItem key={i}>
              <div className="group relative h-full rounded-2xl border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/10 mt-0.5">
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.problem}</p>
                </div>
                <div className="h-px w-full bg-border mb-4" />
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{item.solution}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
