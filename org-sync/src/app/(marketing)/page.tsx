import { Hero } from "@/components/marketing/hero";
import { TrustBar } from "@/components/marketing/trust-bar";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Features } from "@/components/marketing/features";
import { Testimonials } from "@/components/marketing/testimonials";
import { CTASection } from "@/components/marketing/cta-section";

export default function Home() {
  return (
    <>
      <Hero />
      <TrustBar />
      <HowItWorks />
      <Features />
      <Testimonials />
      <CTASection />
    </>
  );
}
