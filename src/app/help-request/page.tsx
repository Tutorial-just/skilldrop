import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  Compass,
  Lightbulb,
  MessageCircle,
  Search,
  Sparkles,
} from "lucide-react";

import { createCategoryRequestAction } from "@/server/actions/category-request.actions";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type HelpRequestPageProps = {
  searchParams?: Promise<{
    query?: string;
    saved?: string;
    duplicate?: string;
    error?: string;
  }>;
};

const exampleRequests = [
  "I need help learning a family recipe",
  "I want to understand a religious topic",
  "I need advice before starting a company",
  "I need help with a relationship situation",
  "I need someone to explain a French document",
  "I want to learn how to fix a small tech problem",
];

export default async function HelpRequestPage({
  searchParams,
}: HelpRequestPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialQuery = resolvedSearchParams.query ?? "";

  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        name: "asc",
      },
    ],
    select: {
      id: true,
      name: true,
      description: true,
    },
  });

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />
        <div className="absolute left-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[420px] w-[420px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <Link
            href="/experts"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to helpers
          </Link>

          <div className="mt-6 max-w-4xl">
            <Badge variant="primary">
              <Sparkles size={14} />
              Request new help
            </Badge>

            <h1 className="heading-lg mt-5 text-balance">
              We do not have the right helper for this problem yet.
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
              Tell us what you were looking for. SkillDrop will use these
              requests to understand demand, create clean categories and bring
              the right helpers to the platform.
            </p>
          </div>

          {resolvedSearchParams.saved ? (
            <div className="mt-7 max-w-3xl rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]">
              {resolvedSearchParams.duplicate
                ? "You already sent this request. It is still waiting for review."
                : "Request saved. We will use it to improve SkillDrop categories and helpers."}
            </div>
          ) : null}

          {resolvedSearchParams.error ? (
            <div className="mt-7 max-w-3xl rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
              {formatHelpRequestError(resolvedSearchParams.error)}
            </div>
          ) : null}
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
          <Card className="p-5 md:p-6">
            <Badge variant="accent">
              <MessageCircle size={14} />
              Your request
            </Badge>

            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
              Describe the problem you wanted to solve.
            </h2>

            <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
              Keep it practical. Write what you searched for, what kind of
              person could help, and what result you wanted after the call.
            </p>

            <form action={createCategoryRequestAction} className="mt-6 grid gap-5">
              <Field label="What did you need help with?" htmlFor="query">
                <div className="relative mt-2">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                  />

                  <input
                    id="query"
                    name="query"
                    type="text"
                    required
                    minLength={3}
                    maxLength={160}
                    defaultValue={initialQuery}
                    placeholder="Example: I need help understanding a religious topic"
                    className="input min-h-[54px] pl-12"
                  />
                </div>
              </Field>

              <Field
                label="Suggested category name"
                htmlFor="suggestedName"
                hint="Optional. Example: Faith & Religion, Cooking, Car repair, Business."
              >
                <input
                  id="suggestedName"
                  name="suggestedName"
                  type="text"
                  maxLength={80}
                  placeholder="Optional category name"
                  className="input mt-2"
                />
              </Field>

              <Field
                label="Closest existing category"
                htmlFor="categoryId"
                hint="Optional. This helps us merge requests without creating messy duplicate categories."
              >
                <select id="categoryId" name="categoryId" className="input mt-2" defaultValue="">
                  <option value="">No close category / not sure</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="More details"
                htmlFor="description"
                hint="Optional. Explain what result you wanted from the short call."
              >
                <textarea
                  id="description"
                  name="description"
                  rows={6}
                  maxLength={900}
                  placeholder="Example: I wanted to talk to someone knowledgeable for 15–30 minutes and leave with clear next steps..."
                  className="mt-2 w-full rounded-[24px] border border-[var(--border)] bg-[var(--background-soft)] p-4 text-sm font-medium leading-7 outline-none transition focus:border-[var(--primary)]/50 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.11)]"
                />
              </Field>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="submit" className="btn btn-primary">
                  Send request
                  <ArrowRight size={18} />
                </button>

                <ButtonLink href="/experts" variant="secondary">
                  Browse other helpers
                </ButtonLink>
              </div>
            </form>
          </Card>

          <div className="grid gap-6">
            <Card soft className="p-5 md:p-6">
              <Badge variant="primary">
                <Lightbulb size={14} />
                Why this matters
              </Badge>

              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                This turns “no results” into useful demand.
              </h2>

              <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                SkillDrop is built for almost any problem, but categories must
                stay clean. Requests help us decide what to add next instead of
                letting the marketplace become messy.
              </p>

              <div className="mt-5 grid gap-3">
                <Step
                  icon={Search}
                  title="You search"
                  text="If no helper matches, you can leave a request."
                />
                <Step
                  icon={Compass}
                  title="SkillDrop learns"
                  text="Admin sees repeated demand and missing topics."
                />
                <Step
                  icon={CheckCircle2}
                  title="New categories appear"
                  text="Useful categories can be approved, merged or rejected."
                />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <Bell size={14} />
                Example requests
              </Badge>

              <div className="mt-5 grid gap-3">
                {exampleRequests.map((request) => (
                  <Link
                    key={request}
                    href={`/help-request?query=${encodeURIComponent(request)}`}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3 text-sm font-bold text-[var(--muted-foreground)] transition hover:border-[var(--border-strong)] hover:bg-[var(--background-soft)]"
                  >
                    {request}
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
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-bold text-[var(--foreground)]">
        {label}
      </label>
      {hint ? (
        <p className="mt-1 text-xs font-medium leading-5 text-[var(--muted-foreground)]">
          {hint}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function Step({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Search;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={18} />
      </div>

      <div>
        <p className="font-bold tracking-[-0.02em] text-[var(--foreground)]">
          {title}
        </p>

        <p className="mt-1 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
          {text}
        </p>
      </div>
    </div>
  );
}

function formatHelpRequestError(error: string) {
  if (error === "invalid-query") {
    return "Please describe the help you need in 3 to 160 characters.";
  }

  if (error === "invalid-suggested-name") {
    return "Suggested category name is too long.";
  }

  if (error === "invalid-description") {
    return "Description is too long.";
  }

  if (error === "invalid-category") {
    return "Selected category does not exist anymore.";
  }

  return "Something went wrong. Please try again.";
}
