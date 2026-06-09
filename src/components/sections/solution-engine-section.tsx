import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  FileText,
  MessageCircle,
  Search,
  Sparkles,
  Target,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const flowSteps = [
  {
    icon: MessageCircle,
    title: "Describe the real problem",
    text: "Write the situation in normal words instead of guessing the perfect category.",
  },
  {
    icon: Target,
    title: "Get matched by fit",
    text: "Helpers are ranked by topic, category, help type, language, budget and availability.",
  },
  {
    icon: Video,
    title: "Book a focused call",
    text: "Choose a clear service, duration, time slot and total price before checkout.",
  },
  {
    icon: ClipboardList,
    title: "Leave with next steps",
    text: "After the call, the helper can create an action plan so the answer does not disappear.",
  },
];

const briefItems = [
  "What is happening?",
  "What do you want by the end of the call?",
  "What have you already tried?",
  "What language, budget and urgency fit you?",
];

export function SolutionEngineSection() {
  return (
    <section className="section-page-sm relative overflow-hidden">
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[var(--border-strong)] to-transparent" />

      <div className="container-page relative">
        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr] xl:items-center">
          <div>
            <Badge variant="primary">
              <Sparkles size={14} />
              Problem-first marketplace
            </Badge>

            <h2 className="heading-xl mt-5 max-w-3xl text-balance">
              SkillDrop is built around solving the problem, not just browsing profiles.
            </h2>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
              The strongest flow is simple: describe the problem, compare the
              most relevant helpers, book a short call and keep a written action
              plan after the session.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/help-me">
                Describe a problem
                <ArrowRight size={18} />
              </ButtonLink>

              <ButtonLink href="/experts" variant="secondary">
                Browse helpers
                <Search size={18} />
              </ButtonLink>
            </div>
          </div>

          <Card className="overflow-hidden p-4 md:p-5">
            <div className="rounded-[30px] border border-[var(--border)] bg-[var(--card-soft)] p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <Badge variant="accent">
                  <FileText size={14} />
                  Problem brief
                </Badge>

                <span className="rounded-full bg-[var(--success-soft)] px-3 py-1 text-xs font-black text-[var(--success)]">
                  before booking
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                {briefItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background-soft)] p-3 text-sm font-bold text-[var(--muted-foreground)]"
                  >
                    <BadgeCheck size={16} className="shrink-0 text-[var(--success)]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {flowSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div
                    key={step.title}
                    className="rounded-[24px] border border-[var(--border)] bg-[var(--background-soft)] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                        <Icon size={18} />
                      </div>

                      <span className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                        Step {index + 1}
                      </span>
                    </div>

                    <h3 className="mt-4 font-black tracking-[-0.02em]">
                      {step.title}
                    </h3>

                    <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                      {step.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
