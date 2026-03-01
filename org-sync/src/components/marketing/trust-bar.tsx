"use client";

import { motion } from "framer-motion";
import { FadeIn } from "@/components/motion/fade-in";

const companies = [
  "Acme Corp",
  "TechFlow",
  "CloudBase",
  "DataBridge",
  "SyncLabs",
  "NexGen",
  "Innovate",
  "ScaleUp",
];

function CompanyLogo({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 px-8 text-muted-foreground/40">
      <div className="h-6 w-6 rounded-md bg-muted-foreground/10" />
      <span className="text-lg font-semibold whitespace-nowrap">{name}</span>
    </div>
  );
}

export function TrustBar() {
  return (
    <section className="py-16 border-y">
      <FadeIn className="text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Trusted by forward-thinking Salesforce teams
        </p>
      </FadeIn>
      <div className="relative mt-8 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 z-10 w-32 bg-gradient-to-r from-background to-transparent" />
        <div className="absolute right-0 top-0 bottom-0 z-10 w-32 bg-gradient-to-l from-background to-transparent" />
        <motion.div
          className="flex"
          animate={{ x: [0, -1200] }}
          transition={{
            x: { repeat: Infinity, repeatType: "loop", duration: 30, ease: "linear" },
          }}
        >
          {[...companies, ...companies, ...companies].map((company, i) => (
            <CompanyLogo key={`${company}-${i}`} name={company} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
