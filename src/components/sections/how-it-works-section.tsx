import {
  ArrowRight,
  BadgeCheck,
  FileText,
  Search,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const steps = [
  {
    icon: Search,
    title: "Find the right helper",
    text: "Search by topic, situation, goal, language or practical keyword.",
  },
  {
    icon: BadgeCheck,
    title: "Choose the right helper",
    text: "Compare profiles, services, prices, reviews, languages and availability.",
  },
  {
    icon: Video,
    title: "Book a short call",
    text: "Pick a time, pay safely and join the call when the session opens.",
  },
  {
    icon: FileText,
    title: "Keep your next steps",
    text: "After a completed call, the helper can create an action plan for you.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="section-page">
      <div className="container-page">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div>
            <Badge variant="primary">How it works</Badge>

            <h2 className="heading-xl mt-5 text-balance">
              One short call can make the next step clear.
            </h2>

            <p className="mt-5 text-lg leading-8 text-[var(--muted-foreground)]">
              SkillDrop turns a broad problem into a focused human conversation.
              The goal is simple: understand the situation, talk to the right
              person and leave with something useful.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/experts">
                Browse helpers
                <ArrowRight size={18} />
              </ButtonLink>

              <ButtonLink href="/help" variant="secondary">
                How to use SkillDrop
              </ButtonLink>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <Card key={step.title} className="relative p-6">
                  <p className="absolute right-6 top-6 text-sm font-bold text-[var(--border-strong)]">
                    0{index + 1}
                  </p>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-white shadow-sm">
                    <Icon size={20} />
                  </div>

                  <h3 className="mt-7 text-xl font-black tracking-[-0.03em] text-[var(--foreground)]">
                    {step.title}
                  </h3>

                  <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
                    {step.text}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <ReasonCard
            title="When Google is too generic"
            text="Search results can be useful, but they do not always understand your exact situation."
          />

          <ReasonCard
            title="When AI is not human enough"
            text="Sometimes you need human experience, empathy, examples and real conversation."
          />

          <ReasonCard
            title="When friends do not know"
            text="SkillDrop helps you find people with relevant knowledge or experience outside your circle."
          />
        </div>
      </div>
    </section>
  );
}

function ReasonCard({ title, text }: { title: string; text: string }) {
  return (
    <Card soft className="p-6">
      <h3 className="text-xl font-black tracking-[-0.03em] text-[var(--foreground)]">
        {title}
      </h3>

      <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
        {text}
      </p>
    </Card>
  );
}
