import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OrgSync — Bidirectional Salesforce Org Sync, No Code Required",
    template: "%s | OrgSync",
  },
  description:
    "OrgSync connects two or more Salesforce orgs and syncs data between them automatically — bidirectionally, every 2 minutes, with AI-powered field mapping and built-in retry logic. No code, no Connected App setup.",
  keywords: [
    "Salesforce org sync",
    "sync two Salesforce orgs",
    "bidirectional Salesforce sync",
    "Salesforce data synchronization",
    "Salesforce integration no code",
    "connect multiple Salesforce orgs",
    "Salesforce field mapping tool",
    "Salesforce cross org data",
    "Salesforce sandbox to production sync",
    "real-time Salesforce sync",
    "Salesforce AppExchange sync tool",
  ],
  openGraph: {
    title: "OrgSync — Sync Data Between Salesforce Orgs, Automatically",
    description:
      "Connect two Salesforce orgs, map fields visually, set filters, and sync data bidirectionally every 2 minutes. No code. No Connected App. AI-powered error detection.",
    type: "website",
    url: "https://orgsync.io",
    siteName: "OrgSync",
  },
  twitter: {
    card: "summary_large_image",
    title: "OrgSync — Bidirectional Salesforce Org Sync",
    description:
      "Connect two Salesforce orgs and keep their data in sync automatically. Bidirectional, no-code, AI-powered.",
    creator: "@orgsyncio",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://orgsync.io",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
