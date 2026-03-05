"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

const plans = [
  {
    name: "Starter",
    description: "For small teams making their first org connection",
    monthlyPrice: 49,
    yearlyPrice: 39,
    popular: false,
    cta: "Start Free Trial",
    features: [
      { text: "2 connected Salesforce orgs", included: true },
      { text: "3 sync configurations", included: true },
      { text: "10,000 records/month", included: true },
      { text: "Visual field mapping", included: true },
      { text: "Sync error logs + retry", included: true },
      { text: "30-day log history", included: true },
      { text: "Email support", included: true },
      { text: "Smart filters", included: false },
      { text: "Bidirectional sync", included: false },
      { text: "AI field mapping assistant", included: false },
    ],
  },
  {
    name: "Growth",
    description: "For teams that need full sync power and AI assistance",
    monthlyPrice: 149,
    yearlyPrice: 119,
    popular: true,
    cta: "Start Free Trial",
    features: [
      { text: "5 connected Salesforce orgs", included: true },
      { text: "Unlimited sync configurations", included: true },
      { text: "100,000 records/month", included: true },
      { text: "Visual field mapping", included: true },
      { text: "Smart filters", included: true },
      { text: "Bidirectional sync", included: true },
      { text: "AI mapping analysis (type + picklist checks)", included: true },
      { text: "AI error explanation + fix suggestions", included: true },
      { text: "90-day log history", included: true },
      { text: "Priority support", included: true },
    ],
  },
  {
    name: "Enterprise",
    description: "Unlimited scale, dedicated support, and custom SLAs",
    monthlyPrice: null,
    yearlyPrice: null,
    popular: false,
    cta: "Contact Sales",
    features: [
      { text: "Unlimited connected orgs", included: true },
      { text: "Unlimited sync configurations", included: true },
      { text: "Unlimited records/month", included: true },
      { text: "Visual field mapping", included: true },
      { text: "Smart filters", included: true },
      { text: "Bidirectional sync", included: true },
      { text: "AI mapping analysis (type + picklist checks)", included: true },
      { text: "AI error explanation + fix suggestions", included: true },
      { text: "1-year log history", included: true },
      { text: "Dedicated support + SLA", included: true },
      { text: "Custom onboarding", included: true },
    ],
  },
];

const faqs = [
  {
    question: "How does the free trial work?",
    answer:
      "You get 14 days of full access to Growth plan features. No credit card required. At the end of the trial, choose the plan that fits — or stay on Starter.",
  },
  {
    question: "What is the difference between Starter and Growth?",
    answer:
      "Starter is for teams connecting two orgs with basic one-way sync. Growth unlocks bidirectional sync, smart filters, AI-powered field mapping analysis, and 10× the record volume. If you're syncing in both directions or using filters, you need Growth.",
  },
  {
    question: "Can I change plans at any time?",
    answer:
      "Yes — upgrade instantly or downgrade at the end of your billing cycle. Plan changes sync your log retention immediately.",
  },
  {
    question: "What counts as a 'record' in the monthly limit?",
    answer:
      "Each record created or updated through a sync counts as one. If a record is updated three times in a month, that's three records. Retry attempts do not count toward your limit.",
  },
  {
    question: "Do you support Salesforce Sandbox orgs?",
    answer:
      "Yes. Production, Sandbox, and Developer Edition orgs all work. Each connected org counts toward your plan's org limit.",
  },
  {
    question: "Is my Salesforce data ever stored on your servers?",
    answer:
      "No — zero record data ever leaves your Salesforce orgs. SwiftPort uses Salesforce's native External ID mechanism to track synced records: a lightweight custom field (SwiftPort_Source_Id__c) is created on your target object, and Salesforce itself handles find-or-create upserts. We store only sync configuration, execution logs, and timestamps — never field values.",
  },
  {
    question: "What happens when a sync fails?",
    answer:
      "You'll see the failure in your logs with the exact Salesforce error. The AI analyzer explains what went wrong and suggests a fix. You can retry individual records or all failures in one click — and configure automatic retries.",
  },
  {
    question: "How long are sync logs retained?",
    answer:
      "Starter: 30 days. Growth: 90 days. Enterprise: 1 year. Logs are automatically purged on a rolling basis so you're never paying for unnecessary storage.",
  },
];

export function PricingClient() {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="pt-32 pb-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>

          <div className="mt-10 inline-flex items-center gap-3 rounded-full border bg-muted/50 p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                !annual ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                annual ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Annual
              <Badge variant="secondary" className="ml-2 rounded-full bg-green-100 text-green-700 text-xs">
                Save 20%
              </Badge>
            </button>
          </div>
        </FadeIn>

        <StaggerContainer className="mt-16 grid gap-8 lg:grid-cols-3" staggerDelay={0.1}>
          {plans.map((plan) => (
            <StaggerItem key={plan.name}>
              <Card
                className={`relative h-full transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular
                    ? "border-primary shadow-xl shadow-primary/10 scale-[1.02]"
                    : "hover:shadow-lg hover:shadow-primary/5"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-bg border-0 text-white px-4">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2 pt-8">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                  <div className="mt-6">
                    {plan.monthlyPrice !== null ? (
                      <div className="flex items-baseline gap-1">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={annual ? "yearly" : "monthly"}
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 10, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-5xl font-bold tracking-tight"
                          >
                            ${annual ? plan.yearlyPrice : plan.monthlyPrice}
                          </motion.span>
                        </AnimatePresence>
                        <span className="text-muted-foreground">/mo</span>
                      </div>
                    ) : (
                      <div className="text-5xl font-bold tracking-tight">
                        Custom
                      </div>
                    )}
                    {plan.monthlyPrice !== null && annual && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Billed annually
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "gradient-bg border-0 text-white hover:opacity-90"
                        : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                    asChild
                  >
                    <Link href="/signup">
                      {plan.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <ul className="mt-8 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature.text} className="flex items-center gap-3">
                        {feature.included ? (
                          <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                        ) : (
                          <Minus className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
                        )}
                        <span
                          className={`text-sm ${
                            feature.included
                              ? "text-foreground"
                              : "text-muted-foreground/50"
                          }`}
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeIn className="mx-auto mt-32 max-w-3xl">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeIn>
      </div>
    </div>
  );
}
