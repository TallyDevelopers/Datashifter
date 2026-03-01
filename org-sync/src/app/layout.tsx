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
    default: "OrgSync — Real-Time Salesforce Org Synchronization",
    template: "%s | OrgSync",
  },
  description:
    "Connect multiple Salesforce orgs, map fields visually, set filters, and keep your data perfectly synchronized in real time. No code required.",
  keywords: [
    "Salesforce",
    "org sync",
    "data synchronization",
    "Salesforce integration",
    "field mapping",
    "real-time sync",
  ],
  openGraph: {
    title: "OrgSync — Real-Time Salesforce Org Synchronization",
    description:
      "Connect multiple Salesforce orgs, map fields visually, set filters, and keep your data perfectly synchronized in real time.",
    type: "website",
    url: "https://orgsync.io",
  },
  twitter: {
    card: "summary_large_image",
    title: "OrgSync — Real-Time Salesforce Org Synchronization",
    description:
      "Connect multiple Salesforce orgs and keep your data perfectly synchronized in real time.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
