import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OrgSync — Move Salesforce Data Any Way You Need It",
  description:
    "Live bidirectional sync between orgs. Bulk migrations for any object. CPQ and Revenue Cloud Accelerator templates. AI that catches problems before they happen. No code, no engineers required.",
  keywords: [
    "sync two Salesforce orgs",
    "bidirectional Salesforce org sync",
    "Salesforce data synchronization tool",
    "connect multiple Salesforce orgs",
    "Salesforce no-code integration",
    "real-time Salesforce sync",
    "Salesforce field mapping",
    "Salesforce cross org data sync",
    "Salesforce CPQ migration",
    "Revenue Cloud Accelerator migration",
    "Salesforce RCA migration",
    "Salesforce bulk data migration",
    "Salesforce org migration tool",
    "Salesforce mass data migration",
  ],
  openGraph: {
    title: "OrgSync — Move Salesforce Data Any Way You Need It",
    description:
      "Live sync, bulk migrations, CPQ & RCA templates, and AI pre-flight — all in one platform. No code, no engineers required.",
    url: "https://orgsync.io",
  },
  alternates: {
    canonical: "https://orgsync.io",
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
