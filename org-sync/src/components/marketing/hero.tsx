"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, FlaskConical, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.92_0.005_270)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.92_0.005_270)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute top-20 right-1/4 h-[400px] w-[400px] rounded-full bg-chart-2/5 blur-3xl" />
    </div>
  );
}

function FloatingDashboard() {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="relative mx-auto mt-16 max-w-5xl px-6"
    >
      <div className="rounded-xl border bg-card p-2 shadow-2xl shadow-primary/10">
        <div className="rounded-lg border bg-background p-6">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 text-center">
              <div className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
                app.orgsync.io/dashboard
              </div>
            </div>
          </div>
          <div className="mt-1 mb-4 text-left">
            <p className="text-xs font-medium text-muted-foreground">Acme Corp — Salesforce Sync Dashboard</p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <DashboardCard label="Orgs Connected" value="4" color="primary" />
            <DashboardCard label="Active Syncs" value="12" color="chart-2" />
            <DashboardCard label="Records Synced" value="48.2K" color="chart-3" />
            <DashboardCard label="Success Rate" value="99.8%" color="chart-4" />
          </div>
          {/* Active sync row */}
          <div className="mt-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md gradient-bg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">SF</span>
                </div>
                <div>
                  <div className="text-sm font-medium">Accounts syncing: Production → Sandbox</div>
                  <div className="text-xs text-muted-foreground">New or updated accounts copy over automatically · 6 fields mapped</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-600">Live</span>
              </div>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full gradient-bg"
                initial={{ width: "0%" }}
                animate={{ width: "73%" }}
                transition={{ duration: 2, delay: 1, ease: "easeOut" }}
              />
            </div>
          </div>
          {/* AI verdict strip */}
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50/60 px-4 py-2.5">
            <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-green-800">Pre-flight passed — </span>
              <span className="text-xs text-green-700">All 12 fields validated. 1 sample record simulated. Nothing written.</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium text-primary">AI</span>
            </div>
          </div>
          {/* AI anomaly row */}
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50/60 px-4 py-2.5">
            <Sparkles className="h-4 w-4 text-yellow-600 shrink-0" />
            <span className="text-xs text-yellow-800">
              <strong>AI detected:</strong> &ldquo;Opportunity Sync&rdquo; moved 0 records in the last 48h — was averaging 200/day.
            </span>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-4 left-1/2 h-8 w-3/4 -translate-x-1/2 rounded-xl bg-primary/5 blur-2xl" />
    </motion.div>
  );
}

function DashboardCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      <div className={`mt-2 h-1 w-12 rounded-full bg-${color}`} />
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

      <FloatingDashboard />
    </section>
  );
}
