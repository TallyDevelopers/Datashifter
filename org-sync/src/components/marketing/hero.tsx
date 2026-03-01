"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
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
          <div className="mt-4 grid grid-cols-3 gap-4">
            <DashboardCard label="Connected Orgs" value="4" color="primary" />
            <DashboardCard label="Active Syncs" value="12" color="chart-2" />
            <DashboardCard label="Records Synced" value="48.2K" color="chart-3" />
          </div>
          <div className="mt-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md gradient-bg" />
                <div>
                  <div className="text-sm font-medium">Account → Account</div>
                  <div className="text-xs text-muted-foreground">Production → Sandbox</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-600">Syncing</span>
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
            Now in Beta — Start syncing for free
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-8 max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
        >
          Sync your Salesforce orgs{" "}
          <span className="gradient-text">in real time</span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
        >
          Connect multiple Salesforce orgs, map fields visually, set filters,
          and keep your data perfectly synchronized — no code required.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <Button size="lg" className="gradient-bg border-0 text-white hover:opacity-90 transition-opacity h-12 px-8 text-base" asChild>
            <Link href="/signup">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
            <Link href="#demo">Watch Demo</Link>
          </Button>
        </motion.div>
      </div>

      <FloatingDashboard />
    </section>
  );
}
