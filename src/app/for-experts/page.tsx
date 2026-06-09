import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, CheckCircle2, CircleDollarSign, ClipboardCheck, Eye, ShieldCheck, Sparkles, Star, Target, Video, WalletCards } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Become a SkillDrop helper | Earn with short 1:1 calls",
  description:
    "Create services, set availability and earn by helping people solve practical problems through short SkillDrop calls.",
};

const steps = [
  { title: "Create your helper profile", text: "Add your headline, skills, languages, proof and what kind of problems you solve.", icon: BadgeCheck },
  { title: "Publish focused offers", text: "Turn your knowledge into clear 15, 30, 45 or 60 minute services with a price and category.", icon: ClipboardCheck },
  { title: "Set bookable availability", text: "Open time windows. Buyers book call slots inside them when you are really available.", icon: CalendarDays },
  { title: "Leave an outcome", text: "After each call, give the buyer a practical action plan so SkillDrop is more than a video call.", icon: Target },
];

const qualityRules = [
  "Clear profile and at least one active offer",
  "Availability visible for real booking windows",
  "Stripe Connect ready for secure payouts",
  "Manual review before public trust badges",
  "Quality score based on completed calls, reviews, disputes and repeat bookings",
];

export default async function ForExpertsPage() {
  const [approvedExperts, completedCalls, reviews] = await Promise.all([
    prisma.expertProfile.count({ where: { status: "APPROVED" } }),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.review.count(),
  ]);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />
        <div className="absolute left-[-180px] top-[-180px] h-[420px] w-[420px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-140px] h-[420px] w-[420px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

        <div className="relative container-page grid gap-10 py-12 lg:grid-cols-[1fr_420px] lg:items-center lg:py-16">
          <div>
            <Badge variant="primary">
              <Sparkles size={14} />
              For helpers
            </Badge>

            <h1 className="heading-xl mt-6 max-w-4xl text-balance">
              Earn money by helping people solve real problems in short calls.
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
              SkillDrop is built for practical helpers: teachers, admins, developers, career advisors, founders, language speakers and people with useful experience. Create offers, set availability and leave buyers with clear next steps.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/become-expert" variant="primary">
                Start as a helper
                <ArrowRight size={18} />
              </ButtonLink>
              <ButtonLink href="/experts" variant="secondary">
                See public helpers
              </ButtonLink>
            </div>
          </div>

          <Card className="p-5 md:p-6">
            <Badge variant="success">
              <ShieldCheck size={14} />
              Marketplace quality
            </Badge>
            <div className="mt-6 grid gap-3">
              <Stat label="Approved helpers" value={String(approvedExperts)} />
              <Stat label="Completed calls" value={String(completedCalls)} />
              <Stat label="Reviews collected" value={String(reviews)} />
            </div>
            <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
              <p className="font-black tracking-[-0.02em]">Your advantage</p>
              <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                Helpers who create clear outcomes, avoid disputes and get repeat bookings can earn stronger visibility over time.
              </p>
            </div>
          </Card>
        </div>
      </section>

      <section className="container-page py-10 md:py-14">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.title} className="p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                  <Icon size={22} />
                </div>
                <h2 className="mt-5 text-xl font-black tracking-[-0.04em]">{step.title}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">{step.text}</p>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card soft className="p-6 md:p-7">
            <Badge variant="accent">
              <Star size={14} />
              Expert levels
            </Badge>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">Build trust by doing good work.</h2>
            <div className="mt-5 grid gap-3">
              <Level title="New helper" text="Profile is live and building reputation." />
              <Level title="Verified helper" text="Manual approval or successful calls with strong reviews." />
              <Level title="Top helper" text="Reliable sessions, high ratings, low dispute rate and repeat buyers." />
            </div>
          </Card>

          <Card className="p-6 md:p-7">
            <Badge variant="primary">
              <Eye size={14} />
              What improves your visibility
            </Badge>
            <div className="mt-5 grid gap-3">
              {qualityRules.map((rule) => (
                <div key={rule} className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--success)]" />
                  <p className="text-sm font-bold leading-6 text-[var(--muted-foreground)]">{rule}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <p className="text-sm font-bold text-[var(--muted-foreground)]">{label}</p>
      <p className="text-2xl font-black tracking-[-0.04em]">{value}</p>
    </div>
  );
}

function Level({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background-soft)] p-4">
      <p className="font-black tracking-[-0.02em]">{title}</p>
      <p className="mt-1 text-sm font-medium leading-6 text-[var(--muted-foreground)]">{text}</p>
    </div>
  );
}
