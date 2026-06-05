import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  HeartHandshake,
  MessageCircleHeart,
  Search,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const popularSearches = [
  "relationship advice",
  "business idea",
  "understand a document",
  "learn a recipe",
  "religion questions",
  "CV review",
  "tech help",
  "practice French",
];

const heroTopics = [
  {
    icon: MessageCircleHeart,
    label: "Relationships",
  },
  {
    icon: BookOpen,
    label: "Faith & Religion",
  },
  {
    icon: BriefcaseBusiness,
    label: "Business",
  },
  {
    icon: FileText,
    label: "Documents",
  },
  {
    icon: HeartHandshake,
    label: "Life advice",
  },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="surface-grid absolute inset-0 opacity-70" />
      <div className="absolute left-[-160px] top-[-180px] h-[460px] w-[460px] rounded-full bg-[var(--primary)]/15 blur-3xl" />
      <div className="absolute right-[-180px] top-[110px] h-[500px] w-[500px] rounded-full bg-[var(--accent)]/14 blur-3xl" />
      <div className="absolute bottom-[-240px] left-[28%] h-[440px] w-[440px] rounded-full bg-[var(--rose)]/10 blur-3xl" />

      <div className="container-page relative grid min-h-[calc(100vh-76px)] items-center gap-12 py-16 lg:grid-cols-[1fr_0.92fr] lg:py-20">
        <div>
          <Badge variant="primary">
            <Sparkles size={14} />
            Real people. Real answers. Short calls.
          </Badge>

          <h1 className="heading-display mt-7 max-w-5xl text-balance">
            Get help with almost any problem in a short 1:1 call.
          </h1>

          <p className="mt-7 max-w-2xl text-xl leading-8 text-[var(--muted-foreground)]">
            SkillDrop helps you find real people who can explain, advise, teach
            or guide you — from everyday questions to bigger life decisions.
            Book a short call and leave with clearer next steps.
          </p>

          <form action="/experts" className="mt-8 max-w-2xl">
            <div className="rounded-[30px] border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-md)] backdrop-blur">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <input
                    name="q"
                    type="search"
                    placeholder="Describe your problem..."
                    className="input min-h-[56px] border-transparent bg-[var(--background-soft)] pl-5 pr-12 shadow-none"
                  />

                  <Search
                    size={19}
                    className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                  />
                </div>

                <button type="submit" className="btn btn-primary min-h-[56px]">
                  Find help
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
            <HeroStat value="15–60 min" label="focused human calls" />
            <HeroStat value="Action plan" label="next steps after call" />
            <HeroStat value="Clear price" label="before checkout" />
          </div>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      <Card className="relative overflow-hidden p-4 shadow-[var(--shadow-lg)]">
        <div className="relative overflow-hidden rounded-[34px] bg-[#211a42]">
          <div className="relative h-[390px] overflow-hidden rounded-t-[34px] sm:h-[430px] lg:h-[460px]">
            <Image
              src="/images/home-hero.png"
              alt="Person using SkillDrop to find practical help"
              fill
              priority
              sizes="(min-width: 1024px) 44vw, 100vw"
              className="object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#171124]/35 via-transparent to-transparent" />

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
                  Problem → person → call → outcome
                </p>

                <h2 className="mt-2 max-w-xl text-3xl font-black leading-tight tracking-[-0.055em]">
                  Book a short call with someone who can help you move forward.
                </h2>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {heroTopics.map((topic) => {
                const Icon = topic.icon;

                return (
                  <span
                    key={topic.label}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white/80"
                  >
                    <Icon size={13} />
                    {topic.label}
                  </span>
                );
              })}
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
              Protected booking
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Safety, refunds and action plan
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
      <div className="flex items-center gap-2">
        <CheckCircle2 size={17} className="text-[var(--success)]" />
        <p className="text-2xl font-black tracking-tight text-[var(--foreground)]">
          {value}
        </p>
      </div>

      <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">
        {label}
      </p>
    </div>
  );
}
