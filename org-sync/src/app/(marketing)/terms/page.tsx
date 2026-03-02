import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to home
      </Link>

      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-muted-foreground">Last updated: February 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3">
        <p>
          These Terms of Service govern your use of the OrgSync platform. By accessing or using OrgSync, you agree to be bound by these terms.
        </p>

        <h2>1. The Service</h2>
        <p>
          OrgSync is a SaaS platform that enables synchronization of data between Salesforce organizations. You are responsible for the sync configurations you create and the data they affect.
        </p>

        <h2>2. Account Responsibilities</h2>
        <p>You are responsible for:</p>
        <ul className="list-disc pl-5 space-y-1.5 mt-2">
          <li>Maintaining the security of your account credentials</li>
          <li>All activity that occurs under your account</li>
          <li>Ensuring you have permission from your organization to connect Salesforce orgs to OrgSync</li>
          <li>The accuracy and legality of data you sync</li>
        </ul>

        <h2>3. Salesforce Authorization</h2>
        <p>
          By connecting a Salesforce org to OrgSync, you represent that you have the authority to authorize OrgSync to access that org on behalf of your organization. OrgSync will only access Salesforce data as directed by your sync configurations.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>You may not use OrgSync to:</p>
        <ul className="list-disc pl-5 space-y-1.5 mt-2">
          <li>Violate any applicable laws or regulations</li>
          <li>Infringe on third-party intellectual property rights</li>
          <li>Sync data you do not have permission to access or transfer</li>
          <li>Attempt to circumvent security controls or access other customers&apos; data</li>
          <li>Perform bulk data exports for purposes other than legitimate business sync operations</li>
        </ul>

        <h2>5. Billing and Subscriptions</h2>
        <p>
          Paid plans are billed monthly or annually as selected. Subscriptions renew automatically unless cancelled before the renewal date. Refunds are issued at our discretion for prepaid unused periods. We reserve the right to change pricing with 30 days&apos; notice.
        </p>

        <h2>6. Service Availability</h2>
        <p>
          We aim for high availability but do not guarantee uninterrupted service. We are not liable for sync failures caused by Salesforce API outages, network interruptions, or scheduled maintenance windows.
        </p>

        <h2>7. Data and Privacy</h2>
        <p>
          Your use of OrgSync is subject to our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. You retain ownership of all data processed through OrgSync. We process your Salesforce data solely as a data processor on your behalf.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          OrgSync is not liable for any indirect, incidental, or consequential damages arising from your use of the platform, including but not limited to data loss, sync errors, or business disruption. Our total liability is limited to the amount you paid us in the 3 months preceding the claim.
        </p>

        <h2>9. Termination</h2>
        <p>
          You may cancel your account at any time. We may suspend or terminate accounts that violate these terms. Upon termination, your data will be retained for 30 days for recovery purposes, then deleted.
        </p>

        <h2>10. Changes to Terms</h2>
        <p>
          We may update these terms with 14 days&apos; notice. Continued use after the effective date constitutes acceptance of the updated terms.
        </p>

        <h2>11. Contact</h2>
        <p>
          For questions about these terms, contact us via <Link href="/about#contact" className="text-primary hover:underline">our contact page</Link>.
        </p>
      </div>
    </div>
  );
}
