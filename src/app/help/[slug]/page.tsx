import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  ChefHat,
  CheckCircle2,
  Code2,
  FileText,
  HelpCircle,
  MessageCircleHeart,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type HelpLandingPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const pages = {
  "relationship-advice": {
    title: "Relationship advice in a short 1:1 call",
    eyebrow: "Relationships",
    description:
      "Talk to a real person about communication, confidence, dating, first conversations or a social situation where generic advice is not enough.",
    icon: MessageCircleHeart,
    query: "relationship advice dating confidence communication first date",
    category: "relationships",
    helpType: "ADVICE",
    examples: [
      "I do not know how to start a conversation naturally.",
      "I want advice before a first date.",
      "I need help understanding a social situation.",
      "I want to communicate more confidently.",
    ],
    outcomes: [
      "A clearer view of the situation",
      "Simple next steps you can try",
      "A calm outside perspective",
      "Communication ideas adapted to you",
    ],
    caution:
      "SkillDrop does not support manipulation, harassment, pressure or unsafe relationship advice.",
  },
  "business-first-clients": {
    title: "Get practical help finding your first clients",
    eyebrow: "Business",
    description:
      "Discuss your idea, offer, pricing, positioning, website or first-client strategy with someone who can give practical next steps.",
    icon: BriefcaseBusiness,
    query: "business startup first clients pricing marketing company",
    category: "business",
    helpType: "BUSINESS_MENTORING",
    examples: [
      "I have an idea but do not know how to validate it.",
      "I need help finding my first clients.",
      "I do not know how to price my service.",
      "I want feedback on my website or offer.",
    ],
    outcomes: [
      "A clearer first-client plan",
      "Pricing or positioning ideas",
      "Simple validation steps",
      "A short action plan after the call",
    ],
    caution:
      "Calls can provide business guidance, not guaranteed revenue, investment advice or legal/tax guarantees.",
  },
  "french-documents": {
    title: "Understand a French document with human help",
    eyebrow: "Documents & admin",
    description:
      "Get help understanding a French letter, form, message or administrative document before deciding what to do next.",
    icon: FileText,
    query: "French documents forms admin letter application official message",
    category: "documents-admin",
    helpType: "EXPLANATION",
    examples: [
      "I received a French letter and do not understand what it asks.",
      "I need someone to explain an admin form.",
      "I want help writing a clear reply.",
      "I need to understand the next step for a file.",
    ],
    outcomes: [
      "Plain-language explanation",
      "Important points to check",
      "Possible next steps",
      "A better prepared message or question",
    ],
    caution:
      "SkillDrop can help explain documents, but it is not a substitute for official legal, immigration or administrative advice.",
  },
  "cv-review": {
    title: "Improve your CV with a short review call",
    eyebrow: "Career",
    description:
      "Book a short call to improve your CV, resume, LinkedIn profile, application message or interview preparation.",
    icon: BadgeCheck,
    query: "CV review resume LinkedIn job career application interview",
    category: "career-studies",
    helpType: "PRACTICAL_GUIDANCE",
    examples: [
      "I want someone to review my CV before applying.",
      "I need help presenting my experience clearly.",
      "I want to prepare for an interview.",
      "I need feedback on my motivation letter.",
    ],
    outcomes: [
      "Concrete CV improvement points",
      "Better wording ideas",
      "Interview preparation tips",
      "Next application steps",
    ],
    caution:
      "SkillDrop can help you improve applications, but no helper can guarantee a job offer.",
  },
  "learn-cooking": {
    title: "Learn a recipe or cooking skill step by step",
    eyebrow: "Cooking",
    description:
      "Talk to someone who can explain a recipe, meal idea, technique or beginner cooking process in a simple way.",
    icon: ChefHat,
    query: "cooking recipe meal food beginner step by step",
    category: "cooking-skills",
    helpType: "TEACHING",
    examples: [
      "I want to learn a family-style recipe.",
      "I need help planning a simple meal.",
      "I do not understand a cooking technique.",
      "I want beginner-friendly kitchen advice.",
    ],
    outcomes: [
      "Recipe explained step by step",
      "Ingredient or timing tips",
      "A realistic cooking plan",
      "Confidence before trying it alone",
    ],
    caution:
      "For allergies, medical diets or health conditions, follow qualified medical guidance.",
  },
  "religion-questions": {
    title: "Ask religion questions respectfully",
    eyebrow: "Faith & religion",
    description:
      "Speak with a knowledgeable person about faith, practices, traditions or spiritual questions in a respectful short call.",
    icon: BookOpen,
    query: "religion faith spiritual questions practices islam christianity judaism",
    category: "faith-religion",
    helpType: "RELIGIOUS_DISCUSSION",
    examples: [
      "I want to learn more about a religion respectfully.",
      "I have questions about a practice or tradition.",
      "I want someone to explain a concept simply.",
      "I need a calm discussion about faith.",
    ],
    outcomes: [
      "Clearer understanding",
      "Respectful answers",
      "Useful references or next questions",
      "A human conversation instead of generic search",
    ],
    caution:
      "SkillDrop does not allow hate, extremism, coercion, harassment or radicalization.",
  },
  "tech-help": {
    title: "Get help with a tech or digital problem",
    eyebrow: "Tech & digital",
    description:
      "Find someone who can help you understand a website, code, IT issue, digital tool or practical tech problem.",
    icon: Code2,
    query: "tech help coding website IT support digital tools",
    category: "tech-digital",
    helpType: "PRACTICAL_GUIDANCE",
    examples: [
      "I need help understanding a bug.",
      "I want feedback on a website.",
      "I have an IT or network question.",
      "I want someone to explain a tool or setup.",
    ],
    outcomes: [
      "Problem explanation",
      "Debugging direction",
      "Next technical steps",
      "Practical advice for your setup",
    ],
    caution:
      "SkillDrop does not allow hacking, credential theft, malware, bypassing security or other harmful technical help.",
  },
} as const;

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: HelpLandingPageProps) {
  const { slug } = await params;
  const page = pages[slug as keyof typeof pages];

  if (!page) {
    return {
      title: "Help topic not found | SkillDrop",
    };
  }

  return {
    title: `${page.title} | SkillDrop`,
    description: page.description,
  };
}

export default async function HelpLandingPage({ params }: HelpLandingPageProps) {
  const { slug } = await params;
  const page = pages[slug as keyof typeof pages];

  if (!page) {
    notFound();
  }

  const Icon = page.icon;
  const expertsHref = `/experts?q=${encodeURIComponent(page.query)}&category=${encodeURIComponent(page.category)}&helpType=${encodeURIComponent(page.helpType)}`;
  const requestHref = `/help-request?query=${encodeURIComponent(page.query)}`;

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-50" />
        <div className="absolute left-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[420px] w-[420px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

        <div className="container-page relative py-8 md:py-10 lg:py-14">
          <Link
            href="/help"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to help center
          </Link>

          <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
            <div>
              <Badge variant="primary">
                <Icon size={14} />
                {page.eyebrow}
              </Badge>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                {page.title}
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                {page.description}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={expertsHref}>
                  Find matching helpers
                  <Search size={18} />
                </ButtonLink>

                <ButtonLink href={requestHref} variant="secondary">
                  Request this help
                  <ArrowRight size={18} />
                </ButtonLink>
              </div>
            </div>

            <Card className="p-5">
              <Badge variant="accent">
                <Sparkles size={14} />
                Short-call outcome
              </Badge>

              <p className="mt-4 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                The goal is not just to book time. The goal is to leave with a
                clearer answer, useful explanation or next steps.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-5 md:p-6">
            <Badge variant="primary">
              <HelpCircle size={14} />
              Common situations
            </Badge>

            <div className="mt-5 grid gap-3">
              {page.examples.map((example) => (
                <div
                  key={example}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 text-sm font-bold leading-6 text-[var(--muted-foreground)]"
                >
                  {example}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 md:p-6">
            <Badge variant="success">
              <CheckCircle2 size={14} />
              What you can get
            </Badge>

            <div className="mt-5 grid gap-3">
              {page.outcomes.map((outcome) => (
                <div
                  key={outcome}
                  className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 text-sm font-bold leading-6 text-[var(--muted-foreground)]"
                >
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0 text-[var(--success)]"
                  />
                  {outcome}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <Card soft className="p-5 md:p-6">
            <Badge variant="accent">
              <ShieldCheck size={14} />
              Safety boundary
            </Badge>

            <p className="mt-4 text-sm font-black leading-6 text-[var(--muted-foreground)]">
              {page.caution}
            </p>

            <div className="mt-5">
              <ButtonLink href="/trust" variant="secondary">
                How trust works
              </ButtonLink>
            </div>
          </Card>

          <Card className="p-5 md:p-6">
            <Badge variant="primary">
              <Star size={14} />
              Best result
            </Badge>

            <p className="mt-4 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
              Prepare one clear question before the call. Share enough context,
              choose a helper with the right category and ask for concrete next
              steps at the end.
            </p>
          </Card>
        </div>
      </section>

      <section className="container-page pb-10 md:pb-14">
        <Card className="p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Badge variant="primary">
                <BadgeCheck size={14} />
                Ready to start?
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Find a helper or request this help.
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                If matching helpers exist, book a short call. If SkillDrop does
                not have the right helper yet, leave a request so the platform
                can learn what is missing.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <ButtonLink href={expertsHref}>
                Find helpers
                <ArrowRight size={18} />
              </ButtonLink>

              <ButtonLink href={requestHref} variant="secondary">
                Request help
              </ButtonLink>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}
