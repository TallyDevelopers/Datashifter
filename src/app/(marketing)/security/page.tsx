import type { Metadata } from "next";
import { SecurityPageClient } from "./_security-client";

export const metadata: Metadata = {
  title: "Security & Trust — OrgSync",
  description:
    "OrgSync never stores your Salesforce records. Data flows directly between your orgs in memory — AES-256 encrypted credentials, OAuth 2.0 with PKCE, and row-level data isolation between every customer.",
  alternates: { canonical: "https://orgsync.io/security" },
};

export default function SecurityPage() {
  return <SecurityPageClient />;
}
