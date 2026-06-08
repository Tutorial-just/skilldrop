import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  ChefHat,
  Clock3,
  FileText,
  HeartHandshake,
  Languages,
  MessageCircleHeart,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createHelpRequestAction } from "@/server/actions/help-request.actions";

export const metadata = {
  title: "Describe your problem | SkillDrop",
  description:
    "Tell SkillDrop what you need help with and get guided toward the right helpers, category and type of short 1:1 call.",
};

const helpTypes = [
  {
    value: "ADVICE",
    label: "Advice",
    text: "I need a clear opinion or direction.",
  },
  {
    value: "EXPLANATION",
    label: "Explanation",
    text: "I need someone to explain something simply.",
  },
  {
    value: "TEACHING",
    label: "Teaching",
    text: "I want to learn a skill, topic or method.",
  },
  {
    value: "PRACTICAL_GUIDANCE",
    label: "Practical guidance",
    text: "I want step-by-step help and next actions.",
  },
  {
    value: "PERSONAL_EXPERIENCE",
    label: "Personal experience",
    text: "I want to talk to someone who has been through it.",
  },
  {
    value: "EMOTIONAL_SUPPORT",
    label: "Emotional support",
    text: "I want a calm and respectful conversation.",
  },
  {
    value: "RELIGIOUS_DISCUSSION",
    label: "Religious discussion",
    text: "I want to ask or learn about faith respectfully.",
  },
  {
    value: "BUSINESS_MENTORING",
    label: "Business mentoring",
    text: "I want help with ideas, clients, pricing or launch.",
  },
];

const categories = [
  {
    value: "relationships",
    label: "Relationships",
    icon: MessageCircleHeart,
  },
  {
    value: "business",
    label: "Business",
    icon: BriefcaseBusiness,
  },
  {
    value: "documents-admin",
    label: "Documents",
    icon: FileText,
  },
  {
    value: "cooking-skills",
    label: "Cooking",
    icon: ChefHat,
  },
  {
    value: "faith-religion",
    label: "Faith & religion",
    icon: BookOpen,
  },
  {
    value: "languages-culture",
    label: "Languages",
    icon: Languages,
  },
  {
    value: "life-everyday",
    label: "Life advice",
    icon: HeartHandshake,
  },
];

const examples = [
  "I want advice about how to start a conversation with a girl",
  "I need someone to explain a French document",
  "I want to learn a simple recipe step by step",
  "I want to understand a religious topic respectfully",
  "I need help finding first clients for my business",
  "I need to prepare for a job interview",
];

export default function HelpMePage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-50" />
        <div className="absolute left-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[420px] w-[420px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

        <div className="container-page relative py-8 md:py-10 lg:py-14">
          <Link
            href="/buyer"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to buyer dashboard
          </Link>

          <div className="mt-7 max-w-4xl">
            <Badge variant="primary">
              <Sparkles size={14} />
              Problem intake
            </Badge>

            <h1 className="heading-lg mt-5 text-balance">
              Tell SkillDrop what you need help with.
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
              Do not start by guessing the right expert. Start with your real
              problem, choose the type of help you want, and SkillDrop will send
              you to matching helpers.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="grid gap-6 xl:grid-cols-[1fr_380px] xl:items-start">
          <Card className="p-5 md:p-6">
            <Badge variant="accent">
              <Search size={14} />
              Describe the problem
            </Badge>

            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
              What are you trying to solve?
            </h2>

            <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
              Write it naturally. It can be practical, personal, religious,
              business, cooking, documents, tech, relationships or anything that
              needs a human explanation.
            </p>

            <form action={createHelpRequestAction} className="mt-6 grid gap-6">
              <div>
                <label
                  htmlFor="q"
                  className="text-sm font-black text-[var(--foreground)]"
                >
                  Your problem
                </label>

                <textarea
                  id="q"
                  name="q"
                  required
                  minLength={3}
                  maxLength={220}
                  rows={5}
                  placeholder="Example: I want to understand a religious topic and ask someone knowledgeable for 30 minutes..."
                  className="mt-2 w-full rounded-[24px] border border-[var(--border)] bg-[var(--background-soft)] p-4 text-sm font-medium leading-7 outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]/50 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.11)]"
                />
              </div>

              <div>
                <p className="text-sm font-black text-[var(--foreground)]">
                  What type of help do you want?
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {helpTypes.map((type, index) => (
                    <label
                      key={type.value}
                      className="cursor-pointer rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)] p-4 transition hover:border-[var(--border-strong)] hover:bg-[var(--background-soft)]"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="helpType"
                          value={type.value}
                          defaultChecked={index === 0}
                          className="mt-1 h-4 w-4 shrink-0"
                        />

                        <div>
                          <p className="font-black tracking-[-0.02em]">
                            {type.label}
                          </p>

                          <p className="mt-1 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                            {type.text}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-black text-[var(--foreground)]">
                  Optional category
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="cursor-pointer rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2 text-sm font-black text-[var(--muted-foreground)]">
                    <input
                      type="radio"
                      name="category"
                      value=""
                      defaultChecked
                      className="mr-2"
                    />
                    Not sure
                  </label>

                  {categories.map((category) => {
                    const Icon = category.icon;

                    return (
                      <label
                        key={category.value}
                        className="cursor-pointer rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2 text-sm font-black text-[var(--muted-foreground)]"
                      >
                        <input
                          type="radio"
                          name="category"
                          value={category.value}
                          className="mr-2"
                        />
                        <span className="inline-flex items-center gap-2">
                          <Icon size={14} />
                          {category.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Urgency">
                  <select name="urgency" className="input mt-2" defaultValue="flexible">
                    <option value="today">Today</option>
                    <option value="week">This week</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </Field>

                <Field label="Preferred language">
                  <input
                    name="language"
                    type="text"
                    placeholder="English, French..."
                    className="input mt-2"
                  />
                </Field>

                <Field label="Max budget (€)">
                  <input
                    name="maxPrice"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="30"
                    className="input mt-2"
                  />
                </Field>
              </div>

              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
                <div className="flex gap-3">
                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-[var(--primary-dark)]"
                  />

                  <p className="text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                    SkillDrop will show matching helpers. If no one fits your
                    problem, you can request that help so the platform learns
                    what category or helper is missing.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="submit" className="btn btn-primary">
                  Find matching helpers
                  <ArrowRight size={18} />
                </button>

                <ButtonLink href="/help-request" variant="secondary">
                  Request missing help
                </ButtonLink>
              </div>
            </form>
          </Card>

          <div className="grid gap-6">
            <Card soft className="p-5 md:p-6">
              <Badge variant="primary">
                <Clock3 size={14} />
                Best for short calls
              </Badge>

              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                A good request is specific.
              </h2>

              <div className="mt-5 grid gap-3">
                <Tip text="Explain the situation in one or two sentences." />
                <Tip text="Say what result you want after the call." />
                <Tip text="Choose advice, explanation, teaching or practical guidance." />
                <Tip text="Avoid asking for illegal, dangerous or guaranteed outcomes." />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <Sparkles size={14} />
                Examples
              </Badge>

              <div className="mt-5 grid gap-3">
                {examples.map((example) => (
                  <Link
                    key={example}
                    href={`/experts?q=${encodeURIComponent(example)}`}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3 text-sm font-bold leading-6 text-[var(--muted-foreground)] transition hover:border-[var(--border-strong)] hover:bg-[var(--background-soft)]"
                  >
                    {example}
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[var(--foreground)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
      <ArrowRight size={16} className="mt-0.5 shrink-0 text-[var(--primary-dark)]" />
      {text}
    </div>
  );
}
