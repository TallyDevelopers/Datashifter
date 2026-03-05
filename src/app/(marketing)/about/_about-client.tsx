"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2, Zap, Target, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";

const values = [
  {
    icon: Zap,
    title: "Speed First",
    description:
      "We believe sync should be instant. Every architectural decision we make optimizes for speed and reliability.",
  },
  {
    icon: Target,
    title: "Simplicity Wins",
    description:
      "Complex integrations shouldn't require complex tools. We make powerful sync accessible to everyone.",
  },
  {
    icon: Shield,
    title: "Trust is Everything",
    description:
      "Your data is your business. We never store it, always encrypt it, and give you full visibility and control.",
  },
];

const team = [
  { name: "Alex Thompson", role: "CEO & Co-Founder", initials: "AT" },
  { name: "Jordan Lee", role: "CTO & Co-Founder", initials: "JL" },
  { name: "Priya Patel", role: "Head of Engineering", initials: "PP" },
  { name: "Chris Martinez", role: "Head of Product", initials: "CM" },
];

export function AboutClient() {
  const [formState, setFormState] = useState<"idle" | "sending" | "sent">("idle");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState("sending");
    setTimeout(() => setFormState("sent"), 1500);
  }

  return (
    <div className="pt-32 pb-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Built for Salesforce teams,{" "}
            <span className="gradient-text">by Salesforce experts</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            We&apos;ve spent years building Salesforce integrations the hard way — custom
            Apex, middleware, manual CSV exports. SwiftPort is the tool we wished
            existed. So we built it.
          </p>
        </FadeIn>

        <FadeIn className="mx-auto mt-16 max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl gradient-bg p-12 text-center text-white">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
            <div className="relative">
              <h2 className="text-2xl font-bold sm:text-3xl">Our Mission</h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80 leading-relaxed">
                To make Salesforce data synchronization so simple and reliable
                that organizations never have to worry about their data being
                out of sync again.
              </p>
            </div>
          </div>
        </FadeIn>

        <StaggerContainer className="mt-24 grid gap-8 md:grid-cols-3" staggerDelay={0.1}>
          {values.map((value) => (
            <StaggerItem key={value.title}>
              <Card className="h-full border transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-bg text-white">
                    <value.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{value.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <section className="mt-24">
          <FadeIn className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Our Team
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">
              The people behind SwiftPort
            </h2>
          </FadeIn>
          <StaggerContainer className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" staggerDelay={0.08}>
            {team.map((member) => (
              <StaggerItem key={member.name}>
                <div className="group rounded-2xl border bg-card p-6 text-center transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full gradient-bg text-2xl font-bold text-white">
                    {member.initials}
                  </div>
                  <h3 className="mt-4 font-semibold">{member.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {member.role}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        <section id="contact" className="mt-24 scroll-mt-24">
          <FadeIn className="mx-auto max-w-2xl">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                Contact Us
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Get in touch
              </h2>
              <p className="mt-4 text-muted-foreground">
                Have questions? Want a demo? We&apos;d love to hear from you.
              </p>
            </div>

            <Card className="mt-8">
              <CardContent className="p-8">
                {formState === "sent" ? (
                  <div className="flex flex-col items-center gap-4 py-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold">Message sent!</h3>
                    <p className="text-muted-foreground">
                      We&apos;ll get back to you within 24 hours.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setFormState("idle")}
                      className="mt-2"
                    >
                      Send another message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium" htmlFor="name">
                          Name
                        </label>
                        <input
                          id="name"
                          type="text"
                          required
                          className="mt-2 w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium" htmlFor="email">
                          Email
                        </label>
                        <input
                          id="email"
                          type="email"
                          required
                          className="mt-2 w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                          placeholder="you@company.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium" htmlFor="subject">
                        Subject
                      </label>
                      <input
                        id="subject"
                        type="text"
                        required
                        className="mt-2 w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="How can we help?"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium" htmlFor="message">
                        Message
                      </label>
                      <textarea
                        id="message"
                        required
                        rows={5}
                        className="mt-2 w-full resize-none rounded-lg border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="Tell us more..."
                      />
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full gradient-bg border-0 text-white hover:opacity-90"
                      disabled={formState === "sending"}
                    >
                      {formState === "sending" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <Send className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </section>
      </div>
    </div>
  );
}
