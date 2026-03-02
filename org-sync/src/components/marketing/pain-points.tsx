"use client";

import { X, Check } from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

const pains = [
  {
    problem: "You have records in two Salesforce orgs and keeping them manually in sync is a full-time job",
    solution: "OrgSync does it automatically. The moment a record is created or updated in one org, it copies to the other — no manual work.",
  },
  {
    problem: "You turn something on and have no idea if it's actually working until a customer calls you",
    solution: "Before you go live, we test your setup using a real record. If something would fail, we tell you exactly why — before it becomes a problem.",
  },
  {
    problem: "Something failed and now you have to dig through Salesforce logs to figure out what happened",
    solution: "Every failed record shows up in your dashboard with a plain English explanation of what went wrong, and a button to try again.",
  },
  {
    problem: "You needed an IT person or Salesforce admin just to connect your orgs",
    solution: "You log in to Salesforce like normal, click Authorize, and you're connected. No IT involved. No special setup required.",
  },
  {
    problem: "You sync both ways and end up with duplicate records or data going in circles",
    solution: "OrgSync tracks every record it's moved so it knows when it's already handled something — no duplicates, no loops.",
  },
  {
    problem: "A record didn't sync and you have to rebuild the whole thing to push it through again",
    solution: "One-click retry on any record or group of failed records. Nothing gets rebuilt — it just runs again.",
  },
  {
    problem: "The sync stopped working at some point and nobody noticed for days",
    solution: "OrgSync monitors itself. If your sync suddenly goes quiet when it usually moves hundreds of records, you'll know immediately.",
  },
  {
    problem: "Other tools charge you per record, so your bill grows as your business grows",
    solution: "Flat monthly pricing. You can sync a hundred records or ten million — the price doesn't change.",
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

        <StaggerContainer className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-4" staggerDelay={0.07}>
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
