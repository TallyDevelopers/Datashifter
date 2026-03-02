import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OrgSync — Sync Data Between Salesforce Orgs, Automatically",
  description:
    "OrgSync connects two or more Salesforce orgs and keeps your data in sync automatically — bidirectionally, every 2 minutes. Visual field mapping, AI-powered error detection, built-in retry logic. No code, no Connected App setup required.",
  keywords: [
    "sync two Salesforce orgs",
    "bidirectional Salesforce org sync",
    "Salesforce data synchronization tool",
    "connect multiple Salesforce orgs",
    "Salesforce no-code integration",
    "real-time Salesforce sync",
    "Salesforce field mapping",
    "Salesforce cross org data sync",
  ],
  openGraph: {
    title: "OrgSync — Bidirectional Salesforce Org Sync",
    description:
      "Connect two Salesforce orgs and keep their data synchronized automatically. No code, no Connected App, AI-powered field mapping.",
    url: "https://orgsync.io",
  },
  alternates: {
    canonical: "https://orgsync.io",
  },
};

import { Hero } from "@/components/marketing/hero";
import { TrustBar } from "@/components/marketing/trust-bar";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ProductShowcase } from "@/components/marketing/product-showcase";
import { PainPoints } from "@/components/marketing/pain-points";
import { AISection } from "@/components/marketing/ai-section";
import { Features } from "@/components/marketing/features";
import { Testimonials } from "@/components/marketing/testimonials";
import { CTASection } from "@/components/marketing/cta-section";

export default function Home() {
  return (
    <>
      <Hero />
      <TrustBar />
      <HowItWorks />
      <ProductShowcase />
      <PainPoints />
      <AISection />
      <Features />
      <Testimonials />
      <CTASection />
    </>
  );
}
