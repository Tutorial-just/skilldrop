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
  UsersRound,
  Video,
  WalletCards,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const popularSearches = [
  "Psychologist",
  "Translator",
  "Life advice",
  "Career help",
  "Family advice",
  "Documents",
  "Moving abroad",
  "And much more",
];

const categories = [
  {
    title: "Psychology & Support",
    description: "Talk to someone who can listen, support and guide.",
    icon: MessageCircleHeart,
    tag: "Support",
  },
  {
    title: "Translation & Languages",
    description: "Get help with translation, language practice or documents.",
    icon: Languages,
    tag: "Languages",
  },
  {
    title: "Life Advice",
    description: "Speak with people who can share real experience and perspective.",
    icon: HeartHandshake,
    tag: "Life",
  },
  {
    title: "Career & Jobs",
    description: "Prepare for interviews, CV reviews and career decisions.",
    icon: BriefcaseBusiness,
    tag: "Career",
  },
  {
    title: "Family & Relationships",
    description: "Get calm advice for personal, family or relationship questions.",
    icon: UsersRound,
    tag: "Family",
  },
  {
    title: "Documents & Admin Help",
    description: "Understand forms, letters, applications and practical tasks.",
    icon: FileText,
    tag: "Admin",
  },
  {
    title: "Moving Abroad",
    description: "Ask people who already moved and know what to expect.",
    icon: Globe2,
    tag: "Relocation",
  },
  {
    title: "Business & Freelance",
    description: "Get advice about clients, pricing, freelancing and small business.",
    icon: WalletCards,
    tag: "Business",
  },
  {
    title: "Anything you want",
    description: "Create or find almost any useful short-call service.",
    icon: Sparkles,
    tag: "More",
  },
];

const steps = [
  {
    icon: Search,
    title: "Describe your need",
    text: "Search by problem, language, topic or category.",
  },
  {
    icon: BadgeCheck,
    title: "Choose a person",
    text: "Compare profiles, ratings, services and prices.",
  },
  {
    icon: Video,
    title: "Book a short call",
    text: "Talk 1:1 and leave with practical next steps.",
  },
];

const helpers = [
  {
    name: "Anna Keller",
    role: "Career & CV Advisor",
    tag: "Career",
    price: "€25",
    rating: "4.9",
  },
  {
    name: "Mira Ivanova",
    role: "Translator · French/Russian",
    tag: "Translation",
    price: "€20",
    rating: "4.8",
  },
  {
    name: "Daniel Moreau",
    role: "Life Advice & Support",
    tag: "Life advice",
    price: "€18",
    rating: "4.7",
  },
];

const trustItems = [
  "Clear prices before booking",
  "Reviews after completed calls",
  "Verified after 3 successful calls and 3.8+ rating",
];

export default function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="surface-grid absolute inset-0 opacity-70" />
        <div className="absolute left-[-140px] top-[-160px] h-[430px] w-[430px] rounded-full bg-[var(--primary)]/15 blur-3xl" />
        <div className="absolute right-[-160px] top-[120px] h-[460px] w-[460px] rounded-full bg-[var(--accent)]/14 blur-3xl" />
        <div className="absolute bottom-[-220px] left-[28%] h-[420px] w-[420px] rounded-full bg-[var(--rose)]/10 blur-3xl" />

        <div className="container-page relative grid min-h-[calc(100vh-76px)] items-center gap-12 py-16 lg:grid-cols-[1fr_0.92fr] lg:py-20">
          <div>
            <Badge variant="primary">
              <Sparkles size={14} />
              Real people. Useful advice. Short calls.
            </Badge>

            <h1 className="heading-display mt-7 max-w-5xl text-balance">
              Find the right person to help you move forward.
            </h1>

            <p className="mt-7 max-w-2xl text-xl leading-8 text-muted">
              Book short 1:1 calls with people who can advise, translate,
              support, explain or help you solve practical life problems.
            </p>

            <form action="/experts" className="mt-9 max-w-2xl">
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
                      placeholder="What do you need help with?"
                      className="input min-h-[56px] border-transparent bg-white pl-12 shadow-none"
                    />
                  </div>

                  <button type="submit" className="btn btn-primary min-h-[56px]">
                    Search experts
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
              <HeroStat value="15 min" label="short focused calls" />
              <HeroStat value="3.8+" label="rating for verification" />
              <HeroStat value="Global" label="people who can help" />
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
              text="Find help without long forms, courses or complicated steps."
            />
            <ValueCard
              icon={MessageSquareText}
              title="Human advice"
              text="Talk to people with knowledge, experience or a useful perspective."
            />
            <ValueCard
              icon={ShieldCheck}
              title="Built for trust"
              text="Clear profiles, prices, reviews and earned verification."
            />
          </div>
        </div>
      </section>

      <section className="section-page bg-white/35">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Badge variant="accent">Categories</Badge>

              <h2 className="heading-xl mt-5 max-w-3xl text-balance">
                Help for work, life, language, family and more.
              </h2>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
                SkillDrop is open to many useful services. If someone can help
                through a short call, they can create a profile.
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

      <section id="how-it-works" className="section-page">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <Badge variant="primary">How it works</Badge>

              <h2 className="heading-xl mt-5 text-balance">
                A simple call can save days of confusion.
              </h2>

              <p className="mt-5 text-lg leading-8 text-muted">
                Search for what you need, choose a person, book a time and talk
                directly.
              </p>
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

      <section className="section-page bg-white/35">
        <div className="container-page">
          <div className="grid gap-6 lg:grid-cols-2">
            <AudiencePanel
              icon={UserRound}
              badge="For people who need help"
              title="Find someone who understands your problem."
              text="Use SkillDrop when you need advice, support, translation, preparation or practical guidance."
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
              title="Create any useful profile you want."
              text="Offer short paid calls as a specialist, translator, mentor, helper or someone with real life experience."
              href="/sign-up?role=expert"
              action="I want to offer help"
              points={[
                "Create services in your own category",
                "Set your own price and availability",
                "Get verified after 3 successful calls and 3.8+ rating",
              ]}
            />
          </div>
        </div>
      </section>

      <section className="section-page">
        <div className="container-page">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Badge variant="primary">
                <BadgeCheck size={14} />
                Earned verification
              </Badge>

              <h2 className="heading-xl mt-5 text-balance">
                Verification is earned through real calls.
              </h2>

              <p className="mt-5 text-lg leading-8 text-muted">
                A provider becomes verified after completing 3 successful calls
                and maintaining a rating of at least 3.8.
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

      <section className="section-page bg-white/35">
        <div className="container-page">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Badge variant="primary">
                <WalletCards size={14} />
                Provider commission
              </Badge>

              <h2 className="heading-xl mt-5 text-balance">
                Transparent commission for each paid booking.
              </h2>

              <p className="mt-5 text-lg leading-8 text-muted">
                Providers set their own prices. During launch, SkillDrop keeps only a
                5% platform commission to support payments, safety, product and marketplace
                growth.
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
                    Client booking price
                  </p>
                </div>

                <div className="grid gap-3">
                  <CommissionRow
                    icon={CreditCard}
                    title="Client pays"
                    value="€30"
                  />
                  <CommissionRow
                    icon={ShieldCheck}
                    title="Platform commission"
                    value="5%"
                  />
                  <CommissionRow
                    icon={WalletCards}
                    title="Provider receives"
                    value="€28.50"
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="section-page">
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
                <Badge variant="accent">Start with a short call</Badge>

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
            <p className="text-sm font-black">Next call</p>
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
            <p className="text-sm font-bold text-white/50">Popular need</p>
            <h2 className="mt-2 text-4xl font-black leading-none tracking-[-0.055em]">
              I need advice before moving abroad
            </h2>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MiniPanel label="Format" value="1:1 call" />
            <MiniPanel label="Time" value="15 min" />
            <MiniPanel label="Result" value="Clarity" />
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
            <BadgeCheck size={20} />
          </div>

          <div>
            <p className="text-sm font-black">Earned verification</p>
            <p className="text-xs text-muted">3 calls · 3.8+ rating</p>
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