"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";

export function CTASection() {
  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl gradient-bg px-8 py-16 text-center sm:px-16 lg:py-24">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                If you have data in two Salesforce orgs,<br className="hidden sm:block" /> SwiftPort keeps them in sync.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
                Connect your orgs in minutes. Choose what syncs and where it goes.
                Test before anything goes live. Watch it run. Retry anything that fails.
                No developers. No consultants. No guessing.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button
                  size="lg"
                  className="h-12 bg-white px-8 text-base font-semibold text-primary hover:bg-white/90"
                  asChild
                >
                  <Link href="/signup">
                    Start Free — No credit card
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-white/30 bg-transparent px-8 text-base text-white hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <Link href="/pricing">View Pricing</Link>
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
