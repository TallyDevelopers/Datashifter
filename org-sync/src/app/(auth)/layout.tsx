import Link from "next/link";
import { Zap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 lg:flex lg:flex-col lg:justify-between gradient-bg p-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold text-white">OrgSync</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold text-white">
            Keep your Salesforce orgs perfectly in sync
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Connect, map, and synchronize data across orgs in real time — no
            code required.
          </p>
        </div>
        <p className="text-sm text-white/50">
          &copy; {new Date().getFullYear()} OrgSync. All rights reserved.
        </p>
      </div>
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
