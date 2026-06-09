import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HelpCircle,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Video,
  WalletCards,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const buyerSteps = [
  {
    icon: Search,
    title: "Find a helper",
    text: "Search by topic, language, category or practical problem.",
  },
  {
    icon: UserRound,
    title: "Open a profile",
    text: "Check offers, prices, reviews, languages and availability.",
  },
  {
    icon: CalendarDays,
    title: "Choose a time",
    text: "Pick an available slot that works for you.",
  },
  {
    icon: WalletCards,
    title: "Pay securely",
    text: "Complete checkout to confirm your booking.",
  },
  {
    icon: Video,
    title: "Join the call",
    text: "Prepare one clear question and join the 1:1 session.",
  },
  {
    icon: Star,
    title: "Leave a review",
    text: "After the call, share feedback to help other buyers choose safely.",
  },
];

const helperSteps = [
  {
    icon: UserRound,
    title: "Create your profile",
    text: "Add your headline, bio, country, timezone, languages and skills.",
  },
  {
    icon: WalletCards,
    title: "Create offers",
    text: "Add clear offers with title, description, duration and price.",
  },
  {
    icon: CalendarDays,
    title: "Add availability",
    text: "Open time slots so buyers can book calls.",
  },
  {
    icon: ShieldCheck,
    title: "Complete payout setup",
    text: "Connect Stripe so paid bookings can be accepted.",
  },
  {
    icon: Video,
    title: "Attend calls",
    text: "Join on time and give practical, useful help.",
  },
  {
    icon: BadgeCheck,
    title: "Build quality",
    text: "Earn reviews and verification after successful sessions.",
  },
];

const problemLandingLinks = [
  {
    label: "Relationship advice",
    href: "/help/relationship-advice",
  },
  {
    label: "Business first clients",
    href: "/help/business-first-clients",
  },
  {
    label: "French documents",
    href: "/help/french-documents",
  },
  {
    label: "CV review",
    href: "/help/cv-review",
  },
  {
    label: "Learn cooking",
    href: "/help/learn-cooking",
  },
  {
    label: "Religion questions",
    href: "/help/religion-questions",
  },
  {
    label: "Tech help",
    href: "/help/tech-help",
  },
];

const faqs = [
  {
    question: "What is SkillDrop?",
    answer:
      "SkillDrop is a marketplace for short 1:1 calls with people who can help with practical questions like career, documents, languages, relocation, business and everyday decisions.",
  },
  {
    question: "When is a booking confirmed?",
    answer:
      "A booking is confirmed only after payment succeeds. Before payment, the slot is only temporarily reserved.",
  },
  {
    question: "Can I book without an account?",
    answer:
      "You can browse helpers, but you need an account to save helpers, create bookings and complete payment.",
  },
  {
    question: "Can helpers set their own prices?",
    answer:
      "Yes. Helpers create their own offers, durations, prices and availability.",
  },
  {
    question: "How does verification work?",
    answer:
      "Verification is earned after successful calls and a minimum rating threshold. Admins can also review quality and safety signals.",
  },
  {
    question: "What if something goes wrong?",
    answer:
      "Bookings can be reviewed by admins if there is a no-show, payment problem, dispute, abuse report or serious service issue.",
  },
];

export default function HelpPage() {
  return (
    <main className="container-page py-10 md:py-14">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]"
      >
        <ArrowLeft size={16} />
        Back home
      </Link>

      <section className="mt-8">
        <Badge variant="primary">
          <HelpCircle size={14} />
          Help center
        </Badge>

        <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
          <div>
            <h1 className="heading-lg max-w-4xl text-balance">
              How to use SkillDrop
            </h1>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--muted-foreground)]">
              Learn how to find help, book short calls, offer services, manage
              bookings and stay safe on the marketplace. You can also start
              from a specific problem page and go directly to matching helpers.
            </p>
          </div>

          <Card className="p-5">
            <Badge variant="accent">
              <Sparkles size={14} />
              Quick start
            </Badge>

            <p className="mt-4 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
              Start with one clear problem. Search for a helper, choose an
              offer, pick a time and complete payment to confirm the call.
            </p>
          </Card>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/experts">
            Find help
            <ArrowRight size={18} />
          </ButtonLink>

          <ButtonLink href="/sign-up?role=expert" variant="secondary">
            Offer help
          </ButtonLink>

          <ButtonLink href="/legal/safety" variant="secondary">
            Safety
          </ButtonLink>
        </div>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-3">
        <TopCard
          icon={Search}
          title="For buyers"
          text="Find the right person, choose an offer and book a practical call."
        />

        <TopCard
          icon={WalletCards}
          title="For helpers"
          text="Create offers, set availability and earn from short useful calls."
        />

        <TopCard
          icon={ShieldCheck}
          title="For help & safety"
          text="Use reviews, verification, safe payments and support guides."
        />
      </section>


      <section className="mt-12">
        <Card className="p-6 md:p-8">
          <Badge variant="primary">
            <Sparkles size={14} />
            Problem guides
          </Badge>

          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                Start from a real problem
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                These pages explain common situations and send buyers directly
                toward matching helpers or a missing-help request.
              </p>
            </div>

            <ButtonLink href="/help-me" variant="secondary">
              Guided problem intake
            </ButtonLink>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {problemLandingLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 text-sm font-black text-[var(--muted-foreground)] transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--background-soft)] hover:text-[var(--primary-dark)] hover:shadow-[var(--shadow-sm)]"
              >
                {item.label}
                <ArrowRight size={16} className="ml-2 inline" />
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <Card className="p-6 md:p-8">
          <Badge variant="primary">
            <Search size={14} />
            Buyer guide
          </Badge>

          <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
            I need help
          </h2>

          <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            Follow these steps to book a useful short call.
          </p>

          <div className="mt-6 grid gap-4">
            {buyerSteps.map((step, index) => (
              <GuideStep key={step.title} step={step} number={index + 1} />
            ))}
          </div>
        </Card>

        <Card className="p-6 md:p-8">
          <Badge variant="accent">
            <WalletCards size={14} />
            Helper guide
          </Badge>

          <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
            I want to offer help
          </h2>

          <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            Follow these steps to make your profile bookable.
          </p>

          <div className="mt-6 grid gap-4">
            {helperSteps.map((step, index) => (
              <GuideStep key={step.title} step={step} number={index + 1} />
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-12">
        <Card className="p-6 md:p-8">
          <Badge variant="success">
            <CheckCircle2 size={14} />
            Best practices
          </Badge>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Practice
              title="Prepare one clear question"
              text="Short calls work best when the buyer knows what they want to solve."
            />

            <Practice
              title="Keep offers specific"
              text="Helpers should explain exactly what the buyer gets from the call."
            />

            <Practice
              title="Join on time"
              text="Both sides should be ready a few minutes before the scheduled time."
            />

            <Practice
              title="Leave honest feedback"
              text="Reviews help good helpers grow and help buyers choose safely."
            />

            <Practice
              title="Use the platform flow"
              text="Create bookings, payments, reviews and disputes inside SkillDrop for traceability."
            />

            <Practice
              title="Report serious problems"
              text="No-shows, abuse, fraud or misleading offers should be reviewed by admins."
            />
          </div>
        </Card>
      </section>

      <section className="mt-12">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Badge variant="primary">
              <MessageCircle size={14} />
              FAQ
            </Badge>

            <h2 className="heading-lg mt-4">Common questions</h2>
          </div>

          <ButtonLink href="/legal/terms" variant="secondary">
            View terms
          </ButtonLink>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {faqs.map((faq) => (
            <FaqCard key={faq.question} faq={faq} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <Card soft className="p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Badge variant="accent">
                <Clock3 size={14} />
                Start now
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                Ready to use SkillDrop?
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                Browse helpers or create your account to offer practical help.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <ButtonLink href="/experts">
                Find help
                <ArrowRight size={18} />
              </ButtonLink>

              <ButtonLink href="/sign-up?role=expert" variant="secondary">
                Offer help
              </ButtonLink>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}

function TopCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Search;
  title: string;
  text: string;
}) {
  return (
    <Card className="p-6 hover-lift">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={22} />
      </div>

      <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
        {title}
      </h2>

      <p className="mt-3 text-sm font-medium leading-7 text-[var(--muted-foreground)]">
        {text}
      </p>
    </Card>
  );
}

function GuideStep({
  step,
  number,
}: {
  step: {
    icon: typeof Search;
    title: string;
    text: string;
  };
  number: number;
}) {
  const Icon = step.icon;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-sm font-bold text-[var(--primary-dark)]">
          {number}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon size={16} className="text-[var(--primary-dark)]" />

            <h3 className="font-bold tracking-[-0.02em] text-[var(--foreground)]">
              {step.title}
            </h3>
          </div>

          <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            {step.text}
          </p>
        </div>
      </div>
    </div>
  );
}

function Practice({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <h3 className="font-bold tracking-[-0.02em] text-[var(--foreground)]">
        {title}
      </h3>

      <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
        {text}
      </p>
    </div>
  );
}

function FaqCard({
  faq,
}: {
  faq: {
    question: string;
    answer: string;
  };
}) {
  return (
    <Card className="p-5 hover-lift">
      <h3 className="text-xl font-black tracking-[-0.03em] text-[var(--foreground)]">
        {faq.question}
      </h3>

      <p className="mt-3 text-sm font-medium leading-7 text-[var(--muted-foreground)]">
        {faq.answer}
      </p>
    </Card>
  );
}