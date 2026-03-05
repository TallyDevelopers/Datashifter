"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    quote:
      "SwiftPort replaced a custom Apex solution that took us 6 months to build. We set it up in an afternoon.",
    name: "Sarah Chen",
    title: "Salesforce Architect",
    company: "TechFlow Inc.",
    initials: "SC",
  },
  {
    quote:
      "The field mapping UI is incredible. Our team could configure syncs without any developer involvement.",
    name: "Marcus Johnson",
    title: "VP of Operations",
    company: "CloudBase",
    initials: "MJ",
  },
  {
    quote:
      "We sync 50K+ records daily between our production and analytics orgs. Zero downtime, zero data loss.",
    name: "Emily Rodriguez",
    title: "Data Engineering Lead",
    company: "ScaleUp",
    initials: "ER",
  },
];

export function Testimonials() {
  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Testimonials
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by Salesforce teams
          </h2>
        </FadeIn>

        <StaggerContainer
          className="mt-16 grid gap-8 md:grid-cols-3"
          staggerDelay={0.12}
        >
          {testimonials.map((t) => (
            <StaggerItem key={t.name}>
              <Card className="h-full border bg-card transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 text-muted-foreground leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <div className="mt-6 flex items-center gap-3 border-t pt-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-bg text-sm font-bold text-white">
                      {t.initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.title}, {t.company}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
