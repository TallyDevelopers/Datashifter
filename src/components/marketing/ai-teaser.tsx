"use client";

import Link from "next/link";
import { Sparkles, FlaskConical, MessageSquareText, TrendingUp, ArrowRight } from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

const highlights = [
  {
    icon: FlaskConical,
    title: "Dry run before you go live",
    description: "AI simulates your sync with a real record and tells you exactly what would fail — before anything touches your other org.",
  },
  {
    icon: MessageSquareText,
    title: "Errors in plain English",
    description: "No cryptic Salesforce error codes. Every failure gets translated into what went wrong, why, and how to fix it.",
  },
  {
    icon: TrendingUp,
    title: "Catches problems you'd never notice",
    description: "Mismatched field types, missing required fields, picklist values that don't exist in the target org — flagged before they cause failures.",
  },
];

export function AITeaser() {
  return (
    <section id="ai" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
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
            Syncing data between orgs has a hundred ways to go wrong quietly.
            SwiftPort catches them before they become your problem.
          </p>
        </FadeIn>

        <StaggerContainer className="mt-14 grid gap-6 md:grid-cols-3" staggerDelay={0.1}>
          {highlights.map((item) => (
            <StaggerItem key={item.title}>
              <div className="group h-full rounded-2xl border border-primary/15 bg-card p-7 transition-all duration-300 hover:shadow-xl hover:shadow-primary/8 hover:-translate-y-1 hover:border-primary/30">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-bg text-white shadow-lg shadow-primary/20">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeIn className="mt-10 text-center">
          <Link
            href="/docs#ai"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            See all AI features
            <ArrowRight className="h-4 w-4" />
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}
