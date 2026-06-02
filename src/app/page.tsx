import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Globe2,
  HeartHandshake,
  Languages,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Video,
  WalletCards,
  Zap,
  Code2,
  GraduationCap,
  MessageCircle,
  MapPinned,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const popularSearches = [
  "Improve my CV",
  "Understand a document",
  "Practice French",
  "Moving to France",
  "Prepare interview",
  "Translate a message",
  "Fix a tech problem",
  "Study application",
];

const problemCards = [
  {
    title: "Improve my CV",
    description:
      "Book a short call with someone who can review your CV and give clear next steps.",
    icon: BriefcaseBusiness,
    tag: "Career",
    query: "CV review",
  },
  {
    title: "Prepare for an interview",
    description:
      "Practice questions, improve your answers and feel more confident before the real interview.",
    icon: MessageCircle,
    tag: "Career",
    query: "interview preparation",
  },
  {
    title: "Understand a document",
    description:
      "Get help reading, understanding or preparing a form, letter or official message.",
    icon: FileText,
    tag: "Documents",
    query: "documents",
  },
  {
    title: "Translate or correct a message",
    description:
      "Find someone who can help you translate, correct or write a message in another language.",
    icon: Languages,
    tag: "Languages",
    query: "translation",
  },
  {
    title: "Ask about moving abroad",
    description:
      "Talk with someone who already moved and can explain practical steps, documents and local rules.",
    icon: MapPinned,
    tag: "Relocation",
    query: "moving abroad",
  },
  {
    title: "Get help with tech",
    description:
      "Ask someone about code, tools, websites, IT problems or digital projects.",
    icon: Code2,
    tag: "Tech",
    query: "tech help",
  },
  {
    title: "Prepare a study application",
    description:
      "Get help with motivation letters, school choices, applications and study plans.",
    icon: GraduationCap,
    tag: "Study",
    query: "study application",
  },
  {
    title: "Ask someone with experience",
    description:
      "When you need practical advice from a real person who has already faced a similar situation.",
    icon: HeartHandshake,
    tag: "Guidance",
    query: "life guidance",
  },
];

const steps = [
  {
    icon: Search,
    title: "Describe what you need",
    text: "Search by problem, topic, language or keyword.",
  },
  {
    icon: BadgeCheck,
    title: "Choose the right person",
    text: "Compare profiles, prices, reviews, languages and availability.",
  },
  {
    icon: Video,
    title: "Book a short call",
    text: "Pay safely, join the call and leave with practical next steps.",
  },
];

const trustItems = [
  "Clear total price before checkout",
  "Short calls from 15 to 60 minutes",
  "Reviews after completed calls",
  "Verification earned through successful calls",
];

export default function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="surface-grid absolute inset-0 opacity-70" />
        <div className="absolute left-[-160px] top-[-180px] h-[460px] w-[460px] rounded-full bg-[var(--primary)]/15 blur-3xl" />
        <div className="absolute right-[-180px] top-[110px] h-[500px] w-[500px] rounded-full bg-[var(--accent)]/14 blur-3xl" />
        <div className="absolute bottom-[-240px] left-[28%] h-[440px] w-[440px] rounded-full bg-[var(--rose)]/10 blur-3xl" />

        <div className="container-page relative grid min-h-[calc(100vh-76px)] items-center gap-12 py-16 lg:grid-cols-[1fr_0.92fr] lg:py-20">
          <div>
            <Badge variant="primary">
              <Sparkles size={14} />
              Real people. Practical help. Short paid calls.
            </Badge>

            <h1 className="heading-display mt-7 max-w-5xl text-balance">
              Need help with something? Find someone who already knows.
            </h1>

            <p className="mt-7 max-w-2xl text-xl leading-8 text-[var(--muted-foreground)]">
              SkillDrop helps you find real people who can help with documents,
              career, languages, tech, relocation, studies and everyday
              decisions — in focused 15–60 minute calls.
            </p>

            <form action="/experts" className="mt-8 max-w-2xl">
              <div className="rounded-[30px] border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-md)] backdrop-blur">
                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="relative flex-1">
                    <input
                      name="q"
                      type="search"
                      placeholder="What do you need help with?"
                      className="input min-h-[56px] border-transparent bg-[var(--background-soft)] pl-5 pr-12 shadow-none"
                    />

                    <Search
                      size={19}
                      className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                    />
                  </div>

                  <button type="submit" className="btn btn-primary min-h-[56px]">
                    Search
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/experts">
                Find help now
                <Search size={18} />
              </ButtonLink>

              <ButtonLink href="/sign-up?role=expert" variant="secondary">
                Become a helper
                <ArrowRight size={18} />
              </ButtonLink>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {popularSearches.map((item) => (
                <Link
                  key={item}
                  href={`/experts?q=${encodeURIComponent(item)}`}
                  className="rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2 text-sm font-bold text-[var(--muted-foreground)] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-dark)] hover:shadow-[var(--shadow-sm)]"
                >
                  {item}
                </Link>
              ))}
            </div>

            <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
              <HeroStat value="15–60 min" label="focused calls" />
              <HeroStat value="1:1" label="human practical help" />
              <HeroStat value="Clear" label="price before checkout" />
            </div>
          </div>

          <HeroMarketplacePreview />
        </div>
      </section>

      <section className="section-page-sm">
        <div className="container-page">
          <div className="grid gap-4 md:grid-cols-3">
            <ValueCard
              icon={Zap}
              title="Fast to start"
              text="No long courses and no complicated process. Search, choose, book and talk."
            />

            <ValueCard
              icon={CheckCircle2}
              title="Focused on your problem"
              text="You do not browse random services. You search for the help you actually need."
            />

            <ValueCard
              icon={ShieldCheck}
              title="Clear before payment"
              text="Profiles, prices, reviews, duration and booking status are shown before checkout."
            />
          </div>
        </div>
      </section>

      <section className="section-page bg-[var(--background-soft)]">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Badge variant="accent">Popular problems</Badge>

              <h2 className="heading-xl mt-5 max-w-3xl text-balance">
                Start with the problem, not with a complicated category.
              </h2>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                SkillDrop is built for real situations where a short
                conversation with the right person can save time, reduce stress
                and make the next step clear.
              </p>
            </div>

            <ButtonLink href="/experts" variant="secondary">
              Explore help
              <ArrowRight size={18} />
            </ButtonLink>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {problemCards.map((problem) => (
              <ProblemCard key={problem.title} problem={problem} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-page">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <Badge variant="primary">
                <Sparkles size={14} />
                Why SkillDrop
              </Badge>

              <h2 className="heading-xl mt-5 text-balance">
                For small questions that still matter.
              </h2>

              <p className="mt-5 text-lg leading-8 text-[var(--muted-foreground)]">
                Sometimes you do not need a full course, a big freelance project
                or a long coaching program. You just need a useful conversation
                with someone who has the right knowledge or experience.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ReasonCard
                title="Not a course"
                text="You ask about your real situation and get direct practical help."
              />

              <ReasonCard
                title="Not a freelance project"
                text="You book a short call instead of negotiating a large task."
              />

              <ReasonCard
                title="Not anonymous advice"
                text="Profiles, reviews, languages, prices and availability help you choose."
              />

              <ReasonCard
                title="Not complicated"
                text="One problem, one person, one time slot, one checkout, one call."
              />
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="section-page bg-[var(--background-soft)]"
      >
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <Badge variant="primary">How it works</Badge>

              <h2 className="heading-xl mt-5 text-balance">
                One short call can make the next step clear.
              </h2>

              <p className="mt-5 text-lg leading-8 text-[var(--muted-foreground)]">
                Tell SkillDrop what you need help with, choose someone with
                relevant experience, book a time and talk directly.
              </p>

              <div className="mt-7">
                <ButtonLink href="/experts">
                  Browse help
                  <ArrowRight size={18} />
                </ButtonLink>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
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
        </div>
      </section>

      <section className="section-page">
        <div className="container-page">
          <div className="grid gap-6 lg:grid-cols-2">
            <AudiencePanel
              icon={UserRound}
              badge="For people who need help"
              title="Find someone who can help with your next step."
              text="Use SkillDrop when you need practical advice, translation, preparation, document help, technical help or real-life guidance."
              href="/sign-up?role=buyer"
              action="I need help"
              points={[
                "Search by problem, language or topic",
                "Compare profiles, prices and ratings",
                "Book a short 1:1 call",
              ]}
            />

            <AudiencePanel
              icon={BriefcaseBusiness}
              badge="For people who offer help"
              title="Turn your knowledge into short paid calls."
              text="Offer help as a specialist, translator, mentor, relocation helper or someone with useful real-life experience."
              href="/sign-up?role=expert"
              action="I want to offer help"
              points={[
                "Create services around problems you can solve",
                "Set your own price and availability",
                "Receive bookings and build your reputation",
              ]}
            />
          </div>
        </div>
      </section>

      <section className="section-page bg-[var(--background-soft)]">
        <div className="container-page">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Badge variant="primary">
                <BadgeCheck size={14} />
                Trust layer
              </Badge>

              <h2 className="heading-xl mt-5 text-balance">
                Trust is built into the booking flow.
              </h2>

              <p className="mt-5 text-lg leading-8 text-[var(--muted-foreground)]">
                SkillDrop shows clear prices, booking details, reviews,
                verification status and availability before people pay.
              </p>
            </div>

            <Card className="overflow-hidden p-6 md:p-8">
              <div className="grid gap-4 md:grid-cols-3">
                <VerificationStep value="3" label="successful calls" />
                <VerificationStep value="3.8+" label="minimum rating" />
                <VerificationStep value="Verified" label="earned badge" />
              </div>

              <div className="mt-6 grid gap-3">
                {trustItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 text-sm font-medium text-[var(--muted-foreground)]"
                  >
                    <CheckCircle2
                      size={17}
                      className="shrink-0 text-[var(--success)]"
                    />
                    {item}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="section-page">
        <div className="container-page">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Badge variant="primary">
                <WalletCards size={14} />
                Transparent pricing
              </Badge>

              <h2 className="heading-xl mt-5 text-balance">
                Everyone sees the price before checkout.
              </h2>

              <p className="mt-5 text-lg leading-8 text-[var(--muted-foreground)]">
                Helpers set their price. Buyers choose a short call, see the
                service price, SkillDrop fee and total before payment.
              </p>
            </div>

            <Card className="overflow-hidden p-6 md:p-8">
              <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr] md:items-center">
                <div className="rounded-[28px] bg-gradient-to-br from-[#31265f] via-[#2b275f] to-[#1f2937] p-6 text-white">
                  <p className="text-sm font-bold text-white/55">
                    Example call
                  </p>

                  <p className="mt-4 text-5xl font-black tracking-[-0.06em]">
                    €30
                  </p>

                  <p className="mt-2 text-sm text-white/60">
                    Helper service price
                  </p>
                </div>

                <div className="grid gap-3">
                  <CommissionRow
                    icon={Clock3}
                    title="Selected duration"
                    value="30 min"
                  />

                  <CommissionRow
                    icon={CreditCard}
                    title="Service price"
                    value="€30"
                  />

                  <CommissionRow
                    icon={ShieldCheck}
                    title="SkillDrop fee"
                    value="€1.50"
                  />

                  <CommissionRow
                    icon={WalletCards}
                    title="Total before payment"
                    value="€31.50"
                  />
                </div>
              </div>

              <p className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                This is a pricing example. The final total is always shown
                clearly before payment.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="section-page-sm">
        <div className="container-page">
          <Card className="relative overflow-hidden p-8 md:p-10 lg:p-12">
            <div className="absolute right-[-80px] top-[-80px] h-[240px] w-[240px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
            <div className="absolute bottom-[-90px] left-[-90px] h-[260px] w-[260px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <Badge variant="accent">Start with one short call</Badge>

                <h2 className="heading-lg mt-5 max-w-3xl text-balance">
                  Need help or want to offer help?
                </h2>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                  Create your account and choose the workspace that fits you.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <ButtonLink href="/sign-up?role=buyer">
                  I need help
                  <ArrowRight size={18} />
                </ButtonLink>

                <ButtonLink href="/sign-up?role=expert" variant="secondary">
                  I want to offer help
                </ButtonLink>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function HeroMarketplacePreview() {
  const seoKeywords = [
    "CV help",
    "Interview",
    "Documents",
    "Translation",
    "Language",
    "Tech help",
    "Relocation",
    "Study",
  ];

  return (
    <div className="relative">
      <Card className="relative overflow-hidden p-4 shadow-[var(--shadow-lg)]">
        <div className="relative overflow-hidden rounded-[34px] bg-[#211a42]">
          <div className="relative h-[390px] overflow-hidden rounded-t-[34px] sm:h-[430px] lg:h-[460px]">
            <Image
              src="/images/home-hero.png"
              alt="Freelancer working on a laptop"
              fill
              priority
              sizes="(min-width: 1024px) 44vw, 100vw"
              className="object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#171124]/20 via-transparent to-transparent" />

            <div className="absolute left-5 right-5 top-5 flex items-center justify-between gap-4">
              <Badge variant="primary">
                <Sparkles size={14} />
                SkillDrop
              </Badge>

              <div className="rounded-full bg-white/20 px-4 py-2 text-xs font-black text-white backdrop-blur-xl">
                Real people · 1:1 calls
              </div>
            </div>
          </div>

          <div className="rounded-b-[34px] border-t border-white/10 bg-[#171124] p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white sm:flex">
                <Video size={21} />
              </div>

              <div>
                <p className="text-sm font-bold text-white/65">
                  Find practical help online
                </p>

                <h2 className="mt-2 max-w-xl text-3xl font-black leading-tight tracking-[-0.055em]">
                  Book short video calls with people who can help you move
                  forward.
                </h2>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {seoKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white/80"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="absolute -bottom-7 right-6 hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-md)] sm:block">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--success-soft)] text-[var(--success)]">
            <ShieldCheck size={20} />
          </div>

          <div>
            <p className="text-sm font-bold text-[var(--foreground)]">
              Secure booking
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Clear price before payment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)] p-4 shadow-sm backdrop-blur">
      <p className="text-2xl font-black tracking-tight text-[var(--foreground)]">
        {value}
      </p>
      <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">
        {label}
      </p>
    </div>
  );
}

function ValueCard({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <Card soft className="p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-md)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={21} />
      </div>

      <h3 className="mt-5 text-xl font-black tracking-tight text-[var(--foreground)]">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-[var(--muted-foreground)]">{text}</p>
    </Card>
  );
}

function ReasonCard({ title, text }: { title: string; text: string }) {
  return (
    <Card className="p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <CheckCircle2 size={18} />
      </div>

      <h3 className="mt-5 text-xl font-black tracking-[-0.03em] text-[var(--foreground)]">
        {title}
      </h3>

      <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
        {text}
      </p>
    </Card>
  );
}

function ProblemCard({
  problem,
}: {
  problem: {
    title: string;
    description: string;
    icon: LucideIcon;
    tag: string;
    query: string;
  };
}) {
  const Icon = problem.icon;

  return (
    <Link
      href={`/experts?q=${encodeURIComponent(problem.query)}`}
      className="group"
    >
      <Card className="h-full p-6 transition group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-md)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
            <Icon size={21} />
          </div>

          <Badge>{problem.tag}</Badge>
        </div>

        <h3 className="mt-7 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
          {problem.title}
        </h3>

        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
          {problem.description}
        </p>

        <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]">
          Find your help
          <ArrowRight
            size={16}
            className="transition group-hover:translate-x-1"
          />
        </div>
      </Card>
    </Link>
  );
}

function AudiencePanel({
  icon: Icon,
  badge,
  title,
  text,
  href,
  action,
  points,
}: {
  icon: LucideIcon;
  badge: string;
  title: string;
  text: string;
  href: string;
  action: string;
  points: string[];
}) {
  return (
    <Card className="p-6 md:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={24} />
      </div>

      <Badge variant="primary" className="mt-6">
        {badge}
      </Badge>

      <h3 className="mt-5 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
        {title}
      </h3>

      <p className="mt-4 leading-7 text-[var(--muted-foreground)]">{text}</p>

      <div className="mt-6 grid gap-3">
        {points.map((point) => (
          <div
            key={point}
            className="flex items-center gap-3 text-sm font-medium text-[var(--muted-foreground)]"
          >
            <CheckCircle2 size={17} className="shrink-0 text-[var(--success)]" />
            {point}
          </div>
        ))}
      </div>

      <Link
        href={href}
        className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]"
      >
        {action}
        <ArrowRight size={16} />
      </Link>
    </Card>
  );
}

function VerificationStep({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-5">
      <p className="text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
        {value}
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--muted-foreground)]">
        {label}
      </p>
    </div>
  );
}

function CommissionRow({
  icon: Icon,
  title,
  value,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
          <Icon size={18} />
        </div>

        <p className="font-bold text-[var(--foreground)]">{title}</p>
      </div>

      <p className="text-lg font-black text-[var(--foreground)]">{value}</p>
    </div>
  );
}