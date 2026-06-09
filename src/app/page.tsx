import { FaqSection } from "@/components/sections/faq-section";
import { FinalCtaSection } from "@/components/sections/final-cta-section";
import { HeroSection } from "@/components/sections/hero-section";
import { HowItWorksSection } from "@/components/sections/how-it-works-section";
import { SolutionEngineSection } from "@/components/sections/solution-engine-section";
import { HelpSection } from "@/components/sections/trust-section";
import { PopularProblemsSection } from "@/components/sections/popular-problems-section";

export const metadata = {
  title: "SkillDrop | Get help with almost any problem in a short 1:1 call",
  description:
    "SkillDrop helps you find real people for short 1:1 calls when you need advice, explanation, teaching, practical guidance or clear next steps.",
};

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <SolutionEngineSection />
      <PopularProblemsSection />
      <HowItWorksSection />
      <HelpSection />
      <FaqSection />
      <FinalCtaSection />
    </main>
  );
}
