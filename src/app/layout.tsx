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
    default: "SwiftPort — Move Data Between Salesforce Orgs, No Code Required",
    template: "%s | SwiftPort",
  },
  description:
    "SwiftPort is the Salesforce data movement platform. Live bidirectional org sync, mass migrations for any object, CPQ and Revenue Cloud Accelerator templates, and AI-powered pre-flight analysis. No code, no engineers required.",
  keywords: [
    "move data between Salesforce orgs",
    "Salesforce org to org migration",
    "Salesforce mass data migration",
    "sync two Salesforce orgs",
    "bidirectional Salesforce org sync",
    "Salesforce data migration tool",
    "Salesforce CPQ migration",
    "Salesforce Revenue Cloud migration",
    "Revenue Cloud Accelerator migration",
    "Salesforce RCA migration",
    "Salesforce sandbox to production sync",
    "Salesforce bulk data transfer",
    "Salesforce no-code integration",
    "Salesforce cross org data sync",
    "Salesforce field mapping tool",
    "Salesforce org consolidation",
    "Salesforce data movement platform",
    "migrate Salesforce objects between orgs",
  ],
  openGraph: {
    title: "SwiftPort — Move Data Between Salesforce Orgs, No Code Required",
    description:
      "Live sync, mass migrations, CPQ & Revenue Cloud templates, and AI pre-flight — all in one Salesforce data movement platform.",
    type: "website",
    url: "https://swiftport.io",
    siteName: "SwiftPort",
  },
  twitter: {
    card: "summary_large_image",
    title: "SwiftPort — Salesforce Data Movement Platform",
    description:
      "Move data between Salesforce orgs your way. Live sync, mass migrations, CPQ & RCA templates, AI analysis. No code.",
    creator: "@swiftportio",
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
    canonical: "https://swiftport.io",
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
