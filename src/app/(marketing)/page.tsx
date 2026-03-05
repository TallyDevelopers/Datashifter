import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SwiftPort — The Salesforce Data Movement Platform",
  description:
    "Move data between Salesforce orgs your way. Live bidirectional sync every 2 minutes. Mass migrations for any object. CPQ and Revenue Cloud Accelerator templates. AI that catches problems before they happen. No code.",
  keywords: [
    "move data between Salesforce orgs",
    "Salesforce org to org migration",
    "Salesforce mass data migration tool",
    "sync two Salesforce orgs automatically",
    "bidirectional Salesforce org sync",
    "Salesforce CPQ data migration",
    "Salesforce Revenue Cloud Accelerator migration",
    "Salesforce sandbox to production data migration",
    "Salesforce bulk record migration",
    "Salesforce no-code data movement",
    "Salesforce org consolidation tool",
    "migrate Salesforce objects between orgs",
    "Salesforce data transfer tool",
    "Salesforce field mapping no code",
  ],
  openGraph: {
    title: "SwiftPort — The Salesforce Data Movement Platform",
    description:
      "Live sync, mass migrations, CPQ & Revenue Cloud templates, and AI pre-flight. Move Salesforce data any way you need it — no code.",
    url: "https://swiftport.io",
  },
  alternates: {
    canonical: "https://swiftport.io",
  },
};

import { Hero } from "@/components/marketing/hero";
import { TrustBar } from "@/components/marketing/trust-bar";
import { FeaturesOverview } from "@/components/marketing/features-overview";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PainPoints } from "@/components/marketing/pain-points";
import { AITeaser } from "@/components/marketing/ai-teaser";
import { SecuritySection } from "@/components/marketing/security-section";
import { Testimonials } from "@/components/marketing/testimonials";
import { CTASection } from "@/components/marketing/cta-section";

export default function Home() {
  return (
    <>
      <Hero />
      <TrustBar />
      <FeaturesOverview />
      <HowItWorks />
      <PainPoints />
      <AITeaser />
      <SecuritySection />
      <Testimonials />
      <CTASection />
    </>
  );
}
