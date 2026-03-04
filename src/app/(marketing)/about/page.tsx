import type { Metadata } from "next";
import { AboutClient } from "./_about-client";

export const metadata: Metadata = {
  title: "About — Built for Salesforce Teams",
  description:
    "OrgSync was built by Salesforce experts who were tired of syncing data the hard way. Learn about our mission: making Salesforce org synchronization simple, reliable, and accessible to every team.",
  keywords: [
    "about OrgSync",
    "Salesforce org sync company",
    "Salesforce integration team",
    "Salesforce data sync mission",
  ],
  openGraph: {
    title: "About OrgSync — Built for Salesforce Teams, By Salesforce Experts",
    description:
      "We built OrgSync because syncing Salesforce orgs shouldn't require custom Apex, middleware, or manual exports. Learn about our mission.",
    url: "https://orgsync.io/about",
  },
  alternates: {
    canonical: "https://orgsync.io/about",
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
