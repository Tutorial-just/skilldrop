import Link from "next/link";
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
  MessageCircleHeart,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Video,
  WalletCards,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const popularSearches = [
  "CV review",
  "Translator",
  "Documents",
  "Moving abroad",
  "Career help",
  "Life guidance",
  "Business advice",
  "Language practice",
];

const categories = [
  {
    title: "Career & Jobs",
    description:
      "Get help with CV reviews, LinkedIn profiles, interviews and job search decisions.",
    icon: BriefcaseBusiness,
    tag: "Career",
  },
  {
    title: "Translation & Languages",
    description:
      "Get help with translation, language practice, messages or documents.",
    icon: Languages,
    tag: "Languages",
  },
  {
    title: "Documents & Admin Help",
    description:
      "Understand forms, letters, applications and everyday admin tasks.",
    icon: FileText,
    tag: "Documents",
  },
  {
    title: "Moving Abroad",
    description: "Ask people who already moved and know what to expect.",
    icon: Globe2,
    tag: "Relocation",
  },
  {
    title: "Life Guidance",
    description:
      "Talk to someone with relevant experience and get practical perspective.",
    icon: HeartHandshake,
    tag: "Guidance",
  },
  {
    title: "Business & Freelance",
    description:
      "Get advice about clients, pricing, freelancing and small business.",
    icon: WalletCards,
    tag: "Business",
  },
  {
    title: "Study & Applications",
    description:
      "Get help with applications, motivation letters, study plans and choices.",
    icon: FileText,
    tag: "Study",
  },
  {
    title: "Local Help",
    description:
      "Find people who can explain local rules, services, culture or practical steps.",
    icon: Globe2,
    tag: "Local",
  },
  {
    title: "Other Practical Help",
    description:
      "Create or find useful short-call services based on real experience.",
    icon: Sparkles,
    tag: "More",
  },
];

const steps = [
  {
    icon: Search,
    title: "Search your problem",
    text: "Find help by topic, language, category or keyword.",
  },
  {
    icon: BadgeCheck,
    title: "Choose a provider",
    text: "Compare profiles, services, prices, reviews and availability.",
  },
  {
    icon: Video,
    title: "Book a short call",
    text: "Pay safely, join the call and leave with clear next steps.",
  },
];

const helpers = [
  {
    name: "Anna Keller",
    role: "CV & Interview Advisor",
    tag: "Career",
    price: "€26.25",
    rating: "4.9",
  },
  {
    name: "Mira Ivanova",
    role: "French/Russian Translator",
    tag: "Translation",
    price: "€21",
    rating: "4.8",
  },
  {
    name: "Daniel Moreau",
    role: "Relocation & Documents Helper",
    tag: "Relocation",
    price: "€18.90",
    rating: "4.7",
  },
];

const trustItems = [
  "Clear total price before checkout",
  "Provider payout status checked before booking",
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
              Get unstuck with a short 1:1 call from someone who can help.
            </h1>

            <p className="mt-7 max-w-2xl text-xl leading-8 text-muted">
              SkillDrop helps you find people for practical questions: CVs,
              documents, translation, relocation, career choices, business,
              language practice and everyday problems.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/experts">
                Find an expert
                <Search size={18} />
              </ButtonLink>

              <ButtonLink href="/sign-up?role=expert" variant="secondary">
                Offer help
                <ArrowRight size={18} />
              </ButtonLink>
            </div>

            <form action="/experts" className="mt-8 max-w-2xl">
              <div className="rounded-[30px] border border-[var(--border)] bg-white/80 p-3 shadow-[var(--shadow-md)] backdrop-blur">
                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="relative flex-1">
                    <Search
                      size={19}
                      className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted"
                    />

                    <input
                      name="q"
                      type="search"
                      placeholder="Try “CV review”, “documents”, “moving abroad”..."
                      className="input min-h-[56px] border-transparent bg-white pl-12 shadow-none"
                    />
                  </div>

                  <button type="submit" className="btn btn-primary min-h-[56px]">
                    Search
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap gap-2">
              {popularSearches.map((item) => (
                <Link
                  key={item}
                  href={`/experts?q=${encodeURIComponent(item)}`}
                  className="rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm font-black text-[var(--muted-foreground)] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:text-[var(--primary-dark)]"
                >
                  {item}
                </Link>
              ))}
            </div>

            <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
              <HeroStat value="15–60 min" label="focused calls" />
              <HeroStat value="Transparent" label="price before checkout" />
              <HeroStat value="Global" label="practical human help" />
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
              text="No long courses, no complicated process. Search, choose, book and talk."
            />
            <ValueCard
              icon={MessageSquareText}
              title="Human and practical"
              text="Ask someone who has experience, context or useful knowledge for your situation."
            />
            <ValueCard
              icon={ShieldCheck}
              title="Clear and safer"
              text="Profiles, prices, payout readiness, booking status and reviews are shown clearly."
            />
          </div>
        </div>
      </section>

      <section className="section-page bg-white/35">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <Badge variant="primary">
                <Sparkles size={14} />
                Why SkillDrop
              </Badge>

              <h2 className="heading-xl mt-5 text-balance">
                Built for small questions that still matter.
              </h2>

              <p className="mt-5 text-lg leading-8 text-muted">
                Sometimes you do not need a full course, a big freelance project
                or a long coaching program. You just need a useful conversation
                with the right person.
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
                text="Profiles, reviews, availability and prices help you choose carefully."
              />

              <ReasonCard
                title="Not complicated"
                text="One service, one time slot, one checkout, one call."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section-page">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Badge variant="accent">Categories</Badge>

              <h2 className="heading-xl mt-5 max-w-3xl text-balance">
                Help for career, documents, language, relocation and everyday
                questions.
              </h2>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
                SkillDrop is built for useful short-call services. If someone
                has relevant knowledge or real experience, they can offer help.
              </p>
            </div>

            <ButtonLink href="/experts" variant="secondary">
              Explore experts
              <ArrowRight size={18} />
            </ButtonLink>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <CategoryCard key={category.title} category={category} />
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section-page bg-white/35">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <Badge variant="primary">How it works</Badge>

              <h2 className="heading-xl mt-5 text-balance">
                One short call can make the next step clear.
              </h2>

              <p className="mt-5 text-lg leading-8 text-muted">
                Search for your problem, choose a person with relevant
                experience, book a time and talk directly.
              </p>

              <div className="mt-7">
                <ButtonLink href="/experts">
                  Browse experts
                  <ArrowRight size={18} />
                </ButtonLink>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {steps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <Card key={step.title} className="relative p-6">
                    <p className="absolute right-6 top-6 text-sm font-black text-[var(--border-strong)]">
                      0{index + 1}
                    </p>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-white shadow-sm">
                      <Icon size={20} />
                    </div>

                    <h3 className="mt-7 text-xl font-black tracking-[-0.03em]">
                      {step.title}
                    </h3>

                    <p className="mt-3 leading-7 text-muted">{step.text}</p>
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
              text="Use SkillDrop when you need practical advice, translation, preparation, document help or real-life guidance."
              href="/sign-up?role=buyer"
              action="I need help"
              points={[
                "Search by topic, language or need",
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
                "Create services in your own category",
                "Set your own price and availability",
                "Connect payouts securely",
              ]}
            />
          </div>
        </div>
      </section>

      <section className="section-page bg-white/35">
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

              <p className="mt-5 text-lg leading-8 text-muted">
                SkillDrop shows clear prices, booking status, reviews and payout
                readiness before people pay.
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
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/72 p-4 text-sm font-bold text-[var(--muted-foreground)]"
                  >
                    <CheckCircle2 size={17} className="text-[var(--success)]" />
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

              <p className="mt-5 text-lg leading-8 text-muted">
                Providers set their service price. Buyers see the service price,
                SkillDrop fee and total before payment. Providers also see an
                estimate of their net earnings.
              </p>
            </div>

            <Card className="overflow-hidden p-6 md:p-8">
              <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr] md:items-center">
                <div className="rounded-[28px] bg-gradient-to-br from-[#31265f] via-[#2b275f] to-[#1f2937] p-6 text-white">
                  <p className="text-sm font-bold text-white/55">
                    Example service
                  </p>

                  <p className="mt-4 text-5xl font-black tracking-[-0.06em]">
                    €30
                  </p>

                  <p className="mt-2 text-sm text-white/60">
                    Provider service price
                  </p>
                </div>

                <div className="grid gap-3">
                  <CommissionRow
                    icon={CreditCard}
                    title="Buyer service price"
                    value="€30"
                  />
                  <CommissionRow
                    icon={ShieldCheck}
                    title="Buyer service fee"
                    value="€1.50"
                  />
                  <CommissionRow
                    icon={WalletCards}
                    title="Total before payment"
                    value="€31.50"
                  />
                </div>
              </div>

              <p className="mt-5 rounded-2xl border border-[var(--border)] bg-white/64 p-4 text-sm font-bold leading-6 text-muted">
                Example based on a 5% buyer service fee. Provider commission is
                handled separately in the expert earnings flow.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="section-page bg-white/35">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Badge variant="success">Marketplace preview</Badge>

              <h2 className="heading-xl mt-5 max-w-3xl text-balance">
                Many people. Many skills. One simple call.
              </h2>
            </div>

            <ButtonLink href="/experts" variant="secondary">
              See marketplace
              <ArrowRight size={18} />
            </ButtonLink>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {helpers.map((helper) => (
              <HelperPreviewCard key={helper.name} helper={helper} />
            ))}
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

                <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
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
  return (
    <div className="relative">
      <div className="absolute -left-8 top-8 hidden rounded-3xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-md)] lg:block">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Clock3 size={20} />
          </div>

          <div>
            <p className="text-sm font-black">Next available</p>
            <p className="text-xs text-muted">Today · 18:30</p>
          </div>
        </div>
      </div>

      <Card className="relative overflow-hidden p-5 shadow-[var(--shadow-lg)]">
        <div className="rounded-[28px] bg-gradient-to-br from-[#31265f] via-[#2b275f] to-[#1f2937] p-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <Badge variant="primary">Marketplace preview</Badge>

            <div className="flex -space-x-2">
              <Avatar label="A" />
              <Avatar label="M" />
              <Avatar label="D" />
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm font-bold text-white/50">Example request</p>
            <h2 className="mt-2 text-4xl font-black leading-none tracking-[-0.055em]">
              I need help with documents before moving abroad
            </h2>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MiniPanel label="Format" value="1:1 call" />
            <MiniPanel label="Time" value="15 min" />
            <MiniPanel label="Result" value="Next steps" />
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {helpers.map((helper) => (
            <MiniHelper key={helper.name} helper={helper} />
          ))}
        </div>
      </Card>

      <div className="absolute -bottom-7 right-6 hidden rounded-3xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-md)] sm:block">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--success-soft)] text-[var(--success)]">
            <ShieldCheck size={20} />
          </div>

          <div>
            <p className="text-sm font-black">Clear checkout</p>
            <p className="text-xs text-muted">Price shown before payment</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-white/70 p-4 shadow-sm backdrop-blur">
      <p className="text-2xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-sm leading-5 text-muted">{label}</p>
    </div>
  );
}

function ValueCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Zap;
  title: string;
  text: string;
}) {
  return (
    <Card soft className="p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-md)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={21} />
      </div>

      <h3 className="mt-5 text-xl font-black tracking-tight">{title}</h3>
      <p className="mt-3 leading-7 text-muted">{text}</p>
    </Card>
  );
}

function ReasonCard({ title, text }: { title: string; text: string }) {
  return (
    <Card className="p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <CheckCircle2 size={18} />
      </div>

      <h3 className="mt-5 text-xl font-black tracking-[-0.03em]">{title}</h3>

      <p className="mt-2 text-sm font-semibold leading-6 text-muted">{text}</p>
    </Card>
  );
}

function CategoryCard({
  category,
}: {
  category: {
    title: string;
    description: string;
    icon: typeof MessageCircleHeart;
    tag: string;
  };
}) {
  const Icon = category.icon;

  return (
    <Link href={`/experts?q=${encodeURIComponent(category.title)}`} className="group">
      <Card className="h-full p-6 transition group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-md)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
            <Icon size={21} />
          </div>

          <Badge>{category.tag}</Badge>
        </div>

        <h3 className="mt-7 text-2xl font-black tracking-[-0.04em]">
          {category.title}
        </h3>

        <p className="mt-3 leading-7 text-muted">{category.description}</p>

        <div className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]">
          Explore
          <ArrowRight size={16} className="transition group-hover:translate-x-1" />
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
  icon: typeof UserRound;
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

      <h3 className="mt-5 text-3xl font-black tracking-[-0.05em]">{title}</h3>

      <p className="mt-4 leading-7 text-muted">{text}</p>

      <div className="mt-6 grid gap-3">
        {points.map((point) => (
          <div
            key={point}
            className="flex items-center gap-3 text-sm font-bold text-[var(--muted-foreground)]"
          >
            <CheckCircle2 size={17} className="text-[var(--success)]" />
            {point}
          </div>
        ))}
      </div>

      <Link
        href={href}
        className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
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
      <p className="text-3xl font-black tracking-[-0.05em]">{value}</p>
      <p className="mt-2 text-sm font-bold text-muted">{label}</p>
    </div>
  );
}

function CommissionRow({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof CreditCard;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/72 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
          <Icon size={18} />
        </div>

        <p className="font-black">{title}</p>
      </div>

      <p className="text-lg font-black">{value}</p>
    </div>
  );
}

function HelperPreviewCard({
  helper,
}: {
  helper: {
    name: string;
    role: string;
    tag: string;
    price: string;
    rating: string;
  };
}) {
  return (
    <Card className="p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-lg font-black text-white shadow-sm">
          {helper.name.charAt(0)}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black tracking-tight">{helper.name}</h3>
            <Badge variant="success">Verified</Badge>
          </div>

          <p className="mt-1 text-sm text-muted">{helper.role}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl bg-[var(--card-soft)] p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
            Rating
          </p>
          <p className="mt-1 flex items-center gap-1 text-lg font-black">
            <Star size={16} fill="currentColor" />
            {helper.rating}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
            From
          </p>
          <p className="mt-1 text-lg font-black">{helper.price}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Badge>{helper.tag}</Badge>

        <Link
          href="/experts"
          className="text-sm font-black text-[var(--primary-dark)]"
        >
          Book →
        </Link>
      </div>
    </Card>
  );
}

function MiniHelper({
  helper,
}: {
  helper: {
    name: string;
    role: string;
    tag: string;
    price: string;
    rating: string;
  };
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] border border-[var(--border)] bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] font-black text-[var(--primary-dark)]">
          {helper.name.charAt(0)}
        </div>

        <div>
          <p className="font-black leading-tight">{helper.name}</p>
          <p className="text-sm text-muted">{helper.role}</p>
        </div>
      </div>

      <div className="text-right">
        <Badge>{helper.tag}</Badge>
        <p className="mt-2 text-sm font-black">{helper.price}</p>
      </div>
    </div>
  );
}

function MiniPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function Avatar({ label }: { label: string }) {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#2b275f] bg-white text-xs font-black text-[#2b275f]">
      {label}
    </div>
  );
}