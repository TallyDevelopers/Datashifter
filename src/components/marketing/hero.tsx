"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InteractiveDemo } from "@/components/marketing/interactive-demo";

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.92_0.005_270)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.92_0.005_270)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute top-20 right-1/4 h-[400px] w-[400px] rounded-full bg-chart-2/5 blur-3xl" />
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-16">
      <GridBackground />
      <div className="relative mx-auto max-w-7xl px-6 text-center lg:px-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="secondary" className="gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Now in Beta — Start syncing free
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-8 max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
        >
          Keep your Salesforce orgs{" "}
          <span className="gradient-text">in sync — automatically</span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
        >
          OrgSync connects two or more Salesforce orgs and automatically copies records between them — 
          whenever something is created, updated, or deleted. You choose what syncs, where it goes, 
          and who owns it. We handle everything else.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <Button size="lg" className="gradient-bg border-0 text-white hover:opacity-90 transition-opacity h-12 px-8 text-base" asChild>
            <Link href="/signup">
              Start Free — No credit card
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
            <Link href="#product">See it in action</Link>
          </Button>
        </motion.div>

        {/* Identity pill row */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground"
        >
          {[
            "Connects any two Salesforce orgs",
            "No code, no setup, no admin required",
            "Works with Production & Sandbox",
            "Records sync every 2 minutes",
            "Full error visibility & retry",
          ].map((pill) => (
            <span key={pill} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1">
              <span className="h-1 w-1 rounded-full bg-primary/60" />
              {pill}
            </span>
          ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="relative mt-16 px-4 sm:px-6 lg:px-8"
      >
        <InteractiveDemo />
      </motion.div>
    </section>
  );
}
