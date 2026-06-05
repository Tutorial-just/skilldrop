import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  ChefHat,
  Code2,
  FileText,
  GraduationCap,
  HeartHandshake,
  Languages,
  MessageCircle,
  MessageCircleHeart,
  Plane,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const problemCards = [
  {
    title: "Relationship advice",
    description:
      "Talk about communication, confidence, first dates or a social situation with someone who can guide you calmly.",
    icon: MessageCircleHeart,
    tag: "Relationships",
    query: "relationship advice dating communication confidence",
  },
  {
    title: "Faith & religion",
    description:
      "Ask questions, learn practices or talk with someone knowledgeable about a religious topic.",
    icon: BookOpen,
    tag: "Faith",
    query: "religion faith spiritual questions",
  },
  {
    title: "Start a company",
    description:
      "Discuss your idea, pricing, first clients, positioning or first realistic next step.",
    icon: BriefcaseBusiness,
    tag: "Business",
    query: "start a company business idea first clients",
  },
  {
    title: "Learn a recipe",
    description:
      "Call someone who can explain a dish, cooking technique or meal plan in a simple way.",
    icon: ChefHat,
    tag: "Cooking",
    query: "recipe cooking help",
  },
  {
    title: "Understand a document",
    description:
      "Get help reading, understanding or preparing a form, letter or official message.",
    icon: FileText,
    tag: "Documents",
    query: "documents forms admin letter application",
  },
  {
    title: "Improve my CV",
    description:
      "Book a short call with someone who can review your CV and give clear next steps.",
    icon: GraduationCap,
    tag: "Career",
    query: "CV resume LinkedIn job career",
  },
  {
    title: "Translate a message",
    description:
      "Find someone who can help you translate, correct or write a message in another language.",
    icon: Languages,
    tag: "Languages",
    query: "translation language message correction",
  },
  {
    title: "Fix a tech problem",
    description:
      "Ask someone about code, websites, IT problems, tools or digital projects.",
    icon: Code2,
    tag: "Tech",
    query: "tech coding website IT support",
  },
  {
    title: "Moving abroad",
    description:
      "Talk with someone who already moved and can explain practical steps, documents and local life.",
    icon: Plane,
    tag: "Relocation",
    query: "moving abroad relocation housing local guidance",
  },
  {
    title: "Ask someone with experience",
    description:
      "When you need practical advice from a real person who has already faced a similar situation.",
    icon: HeartHandshake,
    tag: "Guidance",
    query: "life guidance practical advice personal experience",
  },
  {
    title: "Prepare for an interview",
    description:
      "Practice questions, improve your answers and feel more confident before the real interview.",
    icon: MessageCircle,
    tag: "Career",
    query: "interview preparation mock interview",
  },
  {
    title: "Study application",
    description:
      "Get help with motivation letters, school choices, applications and study plans.",
    icon: GraduationCap,
    tag: "Study",
    query: "study application university motivation letter",
  },
];

export function PopularProblemsSection() {
  return (
    <section className="section-page bg-[var(--background-soft)]">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Badge variant="accent">Popular problems</Badge>

            <h2 className="heading-xl mt-5 max-w-3xl text-balance">
              Start with your problem, not with a complicated category.
            </h2>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
              SkillDrop is built for real situations where one useful
              conversation with the right person can save time, reduce stress
              and make the next step clear.
            </p>
          </div>

          <ButtonLink href="/experts" variant="secondary">
            Explore all helpers
            <ArrowRight size={18} />
          </ButtonLink>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {problemCards.map((problem) => (
            <ProblemCard key={problem.title} problem={problem} />
          ))}
        </div>
      </div>
    </section>
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
          Find help
          <ArrowRight
            size={16}
            className="transition group-hover:translate-x-1"
          />
        </div>
      </Card>
    </Link>
  );
}
