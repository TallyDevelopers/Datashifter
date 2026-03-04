"use client";

import { X, Check } from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

const pains = [
  {
    problem: "Keeping records in sync across two orgs is a full-time manual job",
    solution: "OrgSync does it automatically every 2 minutes — no manual work, no scripts.",
  },
  {
    problem: "You go live and have no idea if it's actually working until something breaks",
    solution: "AI dry runs test your setup with a real record before anything goes live. Every failure explained in plain English.",
  },
  {
    problem: "You needed an IT person or Salesforce admin just to connect your orgs",
    solution: "Click Authorize, log in to Salesforce, and you're done. No IT involved, no Connected App config.",
  },
  {
    problem: "Your integration tool stores your Salesforce data on their servers while it processes it",
    solution: "OrgSync never stores your records. Data flows directly org to org — we orchestrate it, we never hold it.",
  },
  {
    problem: "Other tools charge per record — your bill explodes as you grow",
    solution: "Flat monthly pricing. Sync a hundred records or ten million — the price doesn't change.",
  },
];

export function PainPoints() {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Sound familiar?
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            These are the problems{" "}
            <span className="gradient-text">OrgSync was built to fix</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Built by people who have dealt with every one of these frustrations — and got tired of there being no simple solution for Salesforce teams.
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
