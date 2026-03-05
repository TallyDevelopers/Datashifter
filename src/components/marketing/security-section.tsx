"use client";

import Link from "next/link";
import { Shield, ServerOff, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";

export function SecuritySection() {
  return (
    <section className="relative py-24 lg:py-32 border-t overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-primary/4 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">

          {/* Left — copy */}
          <FadeIn>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Security & Trust
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Your data goes org to org.{" "}
              <span className="gradient-text">Not through us.</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              Most integration tools route your Salesforce records through their own servers to process them.
              SwiftPort doesn&apos;t. Your data flows directly from one org to another — we orchestrate it, we never hold it.
            </p>
            <div className="mt-8 space-y-3">
              {[
                "Records never stored on our servers — not even temporarily",
                "AES-256-GCM encrypted credentials at rest",
                "OAuth 2.0 with PKCE — your password never touches us",
                "Row-level data isolation between every customer",
              ].map((point) => (
                <div key={point} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-sm font-medium">{point}</p>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <Link
                href="/security"
                className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                <Shield className="h-4 w-4" />
                Read our full security overview
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeIn>

          {/* Right — visual comparison card */}
          <FadeIn className="lg:pl-8">
            <div className="rounded-2xl border bg-card overflow-hidden shadow-xl shadow-primary/5">
              {/* Header */}
              <div className="border-b px-6 py-4 flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">Data flow comparison</span>
              </div>

              {/* Other tools */}
              <div className="px-6 py-5 border-b bg-destructive/3">
                <p className="text-xs font-semibold uppercase tracking-widest text-destructive/60 mb-4">Other tools</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {["Your Salesforce Org", "Their servers", "Target Org"].map((node, i, arr) => (
                    <div key={node} className="flex items-center gap-3">
                      <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${i === 1 ? "border-destructive/30 bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                        {node}
                        {i === 1 && <span className="ml-1 text-[10px]">⚠ data stored here</span>}
                      </div>
                      {i < arr.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* SwiftPort */}
              <div className="px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">SwiftPort</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {["Your Salesforce Org", "SwiftPort\n(orchestrates only)", "Target Org"].map((node, i, arr) => (
                    <div key={node} className="flex items-center gap-3">
                      <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${i === 1 ? "border-primary/30 bg-primary/5 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {node.split("\n")[0]}
                        {node.split("\n")[1] && <span className="block text-[10px] opacity-70">{node.split("\n")[1]}</span>}
                      </div>
                      {i < arr.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs font-medium text-primary">Zero record data stored. Ever.</p>
                </div>
              </div>

              {/* Footer stat strip */}
              <div className="border-t grid grid-cols-3 divide-x">
                {[
                  { icon: ServerOff, label: "Zero data stored" },
                  { icon: Lock, label: "AES-256 encrypted" },
                  { icon: Shield, label: "OAuth 2.0 + PKCE" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 px-4 py-4">
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="text-[11px] font-medium text-center text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
