import type { Metadata } from "next";
import { PricingClient } from "./_pricing-client";

export const metadata: Metadata = {
  title: "Pricing — Salesforce Org Sync Plans",
  description:
    "Simple pricing for syncing Salesforce orgs. Connect production, sandbox, and custom orgs bidirectionally. Start free, upgrade as you grow. No hidden fees.",
  keywords: [
    "Salesforce sync pricing",
    "Salesforce org sync cost",
    "Salesforce integration pricing",
    "bidirectional Salesforce sync plans",
    "Salesforce SaaS pricing",
  ],
  openGraph: {
    title: "SwiftPort Pricing — Sync Salesforce Orgs Starting Free",
    description:
      "Start syncing your Salesforce orgs for free. Upgrade to Professional for bidirectional sync, smart filters, and unlimited configurations.",
    url: "https://swiftport.io/pricing",
  },
  alternates: {
    canonical: "https://swiftport.io/pricing",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
