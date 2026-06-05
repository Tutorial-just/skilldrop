import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Euro,
  Globe2,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
} from "lucide-react";

import { createProviderProfileAction } from "@/server/actions/expert.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { FormDraft } from "@/components/forms/form-draft";
import { TextareaWithCounter } from "@/components/forms/textarea-with-counter";
import { TagInput } from "@/components/expert/tag-input";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type BecomeExpertPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const categories = [
  "Psychology & Support",
  "Translation & Languages",
  "Life Advice",
  "Career & Jobs",
  "Family & Relationships",
  "Documents & Admin Help",
  "Moving Abroad",
  "Business & Freelance",
  "Anything you want",
];

const durationOptions = [15, 30, 45, 60];

const profileTips = [
  "Explain clearly who you can help.",
  "Write what buyers will get after the call.",
  "Add real skills, languages and topics.",
  "Start with one simple offer.",
];

const fallbackLanguageSuggestions = [
  "English",
  "French",
  "Spanish",
  "German",
  "Italian",
  "Russian",
  "Ukrainian",
  "Arabic",
  "Portuguese",
  "Turkish",
  "Polish",
  "Romanian",
  "Dutch",
];

const fallbackSkillSuggestions = [
  "Translation",
  "Document help",
  "Career advice",
  "CV review",
  "Interview preparation",
  "Moving abroad",
  "Visa documents",
  "Admin help",
  "Emotional support",
  "Life advice",
  "Relationship advice",
  "Family advice",
  "Business advice",
  "Freelance advice",
  "Language practice",
  "French paperwork",
  "Job search",
  "Study abroad",
  "Housing advice",
  "Personal finance basics",
  "Small business",
  "Buyer communication",
  "Conflict resolution",
  "Mental support",
];

const fallbackTagSuggestions = [
  "support",
  "advice",
  "translation",
  "documents",
  "career",
  "jobs",
  "relocation",
  "family",
  "relationships",
  "business",
  "freelance",
  "language",
  "interview",
  "cv",
  "visa",
  "housing",
  "confidence",
  "communication",
  "beginner-friendly",
  "fast-help",
  "practical",
  "friendly",
  "experienced",
  "remote",
];

export default async function BecomeExpertPage({
  searchParams,
}: BecomeExpertPageProps) {
  const { user } = await requireRole(["expert", "admin"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const email = user.email?.toLowerCase() ?? "";
  const name = user.name?.trim() || user.email || "Helper";

  const existingProfile = email
    ? await prisma.expertProfile.findFirst({
        where: {
          user: {
            email,
          },
        },
        include: {
          services: {
            where: {
              isActive: true,
            },
            take: 1,
          },
        },
      })
    : null;

  if (existingProfile) {
    return (
      <main className="section-page">
        <div className="container-page">
          <Card className="mx-auto max-w-4xl overflow-hidden p-8 md:p-10">
            <Badge variant="success">
              <BadgeCheck size={14} />
              Profile already created
            </Badge>

            <h1 className="heading-lg mt-5 max-w-3xl text-balance">
              Your helper profile is ready.
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
              You already created your helper profile. You can manage offers,
              availability and bookings from your dashboard.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/expert">
                Open dashboard
                <ArrowRight size={18} />
              </ButtonLink>

              <ButtonLink
                href={`/experts/${existingProfile.id}`}
                variant="secondary"
              >
                View public profile
              </ButtonLink>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  const suggestionProfiles = await prisma.expertProfile.findMany({
    select: {
      languages: true,
      skills: true,
      tags: true,
    },
    take: 300,
    orderBy: {
      createdAt: "desc",
    },
  });

  const languageSuggestions = mergeSuggestions(
    getPopularItems(
      suggestionProfiles.flatMap((profile) => profile.languages),
    ),
    fallbackLanguageSuggestions,
  );

  const skillSuggestions = mergeSuggestions(
    getPopularItems(suggestionProfiles.flatMap((profile) => profile.skills)),
    fallbackSkillSuggestions,
  );

  const tagSuggestions = mergeSuggestions(
    getPopularItems(suggestionProfiles.flatMap((profile) => profile.tags)),
    fallbackTagSuggestions,
  );

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-70" />
        <div className="absolute left-[-120px] top-[-160px] h-[360px] w-[360px] rounded-full bg-[var(--primary)]/14 blur-3xl" />
        <div className="absolute right-[-120px] top-[80px] h-[380px] w-[380px] rounded-full bg-[var(--accent)]/13 blur-3xl" />

        <div className="container-page relative grid gap-10 py-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-end lg:py-16">
          <div>
            <Badge variant="primary">
              <Sparkles size={14} />
              Create your helper profile
            </Badge>

            <h1 className="heading-lg mt-5 max-w-4xl text-balance">
              Tell people who you are and how you can help.
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
              Create a clear profile, add your first offer and become visible
              in the marketplace after setup. SkillDrop works best when helpers
              offer clear, safe and practical help around real problems.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStep icon={UserRound} title="Profile" text="About you" />
            <MiniStep icon={WalletCards} title="Offer" text="Price & time" />
            <MiniStep icon={ShieldCheck} title="Trust" text="Earn verification" />
          </div>
        </div>
      </section>

      <section className="section-page">
        <div className="container-page">
          <div className="grid gap-8 lg:grid-cols-[0.76fr_1.24fr]">
            <div className="grid content-start gap-5">
              <Card className="p-6">
                <Badge variant="accent">
                  <BadgeCheck size={14} />
                  Verification rule
                </Badge>

                <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
                  Verification is earned
                </h2>

                <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
                  New helpers start without a verified badge. The badge appears
                  after 3 successful calls and a rating of 3.8 or higher.
                </p>

                <div className="mt-6 grid gap-3">
                  <RuleItem value="3" label="successful calls" />
                  <RuleItem value="3.8+" label="minimum rating" />
                  <RuleItem value="Verified" label="earned badge" />
                </div>
              </Card>

              <Card soft className="p-6">
                <Badge variant="primary">
                  <CheckCircle2 size={14} />
                  Tips
                </Badge>

                <div className="mt-5 grid gap-3">
                  {profileTips.map((tip) => (
                    <div
                      key={tip}
                      className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 text-sm font-medium leading-6 text-[var(--muted-foreground)]"
                    >
                      <CheckCircle2
                        size={17}
                        className="mt-0.5 shrink-0 text-[var(--success)]"
                      />
                      {tip}
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <Badge variant="accent">
                  <ShieldCheck size={14} />
                  Helper standard
                </Badge>

                <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
                  Be specific, safe and useful
                </h2>

                <div className="mt-5 grid gap-3">
                  <RuleItem value="1" label="Create offers around real problems buyers search for" />
                  <RuleItem value="2" label="Explain what happens during the call and what the buyer gets after" />
                  <RuleItem value="3" label="Avoid illegal, harmful, misleading or guaranteed outcomes" />
                </div>

                <p className="mt-4 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                  SkillDrop is broad, but every helper profile must stay clear,
                  honest and safe.
                </p>
              </Card>
            </div>

            <Card className="p-6 md:p-8">
              <div>
                <Badge variant="primary">
                  <BriefcaseBusiness size={14} />
                  Helper setup
                </Badge>

                <h2 className="mt-5 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                  Create your profile
                </h2>

                <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
                  This information will be used for your public marketplace
                  profile and your first bookable offer.
                </p>
              </div>

              {resolvedSearchParams.error ? (
                <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
                  {formatExpertSetupError(resolvedSearchParams.error)}
                </div>
              ) : null}

              <form
                id="become-expert-form"
                action={createProviderProfileAction}
                className="mt-8 grid gap-8"
              >
                <FormDraft formId="become-expert-form" />

                <div className="grid gap-5">
                  <SectionTitle
                    icon={UserRound}
                    title="About you"
                    text="Basic information buyers will see."
                  />

                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Display name" htmlFor="displayName">
                      <input
                        id="displayName"
                        name="displayName"
                        type="text"
                        defaultValue={name}
                        required
                        className="input mt-2"
                        placeholder="Anna Keller"
                      />
                    </Field>

                    <Field label="Country" htmlFor="country">
                      <input
                        id="country"
                        name="country"
                        type="text"
                        className="input mt-2"
                        placeholder="France"
                      />
                    </Field>
                  </div>

                  <Field label="Headline" htmlFor="headline">
                    <input
                      id="headline"
                      name="headline"
                      type="text"
                      required
                      minLength={8}
                      maxLength={120}
                      className="input mt-2"
                      placeholder="I help people prepare for difficult conversations"
                    />
                  </Field>

                  <TextareaWithCounter
                    id="bio"
                    name="bio"
                    label="About you"
                    required
                    rows={6}
                    minLength={80}
                    maxLength={1200}
                    placeholder="Tell buyers who you are, what kind of experience you have, who you can help, and what they can expect after a call."
                    helperText="Be specific. Buyers trust profiles that clearly explain who you help and what they get."
                  />
                </div>

                <div className="grid gap-5">
                  <SectionTitle
                    icon={Globe2}
                    title="Category, skills and languages"
                    text="Use hashtags to make your profile easier to find."
                  />

                  <Field label="Main category" htmlFor="category">
                    <select
                      id="category"
                      name="category"
                      required
                      className="input mt-2"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Choose a category
                      </option>

                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid gap-5 md:grid-cols-2">
                    <TagInput
                      name="languages"
                      label="Languages"
                      required
                      suggestions={languageSuggestions}
                      placeholder="English, French, Russian"
                      helperText="Type a language and press Enter, or choose from suggestions."
                      maxItems={8}
                    />

                    <Field label="Timezone" htmlFor="timezone">
                      <input
                        id="timezone"
                        name="timezone"
                        type="text"
                        required
                        defaultValue="Europe/Paris"
                        className="input mt-2"
                        placeholder="Europe/Paris"
                      />
                    </Field>
                  </div>

                  <TagInput
                    name="skills"
                    label="Skills / topics"
                    required
                    suggestions={skillSuggestions}
                    placeholder="Translation, moving abroad, emotional support"
                    helperText="Add topics buyers might search for. Popular topics appear as suggestions."
                    maxItems={18}
                  />

                  <TagInput
                    name="tags"
                    label="Tags"
                    suggestions={tagSuggestions}
                    placeholder="support, advice, french, family, relocation"
                    helperText="Optional hashtags for extra discovery."
                    maxItems={18}
                  />
                </div>

                <div className="grid gap-5">
                  <SectionTitle
                    icon={Clock3}
                    title="Your first offer"
                    text="Create one clear service that people can book."
                  />

                  <Field label="Offer title" htmlFor="serviceTitle">
                    <input
                      id="serviceTitle"
                      name="serviceTitle"
                      type="text"
                      required
                      minLength={4}
                      maxLength={120}
                      className="input mt-2"
                      placeholder="15-minute life advice call"
                    />
                  </Field>

                  <TextareaWithCounter
                    id="serviceDescription"
                    name="serviceDescription"
                    label="Offer description"
                    required
                    rows={4}
                    minLength={30}
                    maxLength={800}
                    placeholder="Explain what happens during the call and what the buyer will get from it."
                    helperText="Clear offer descriptions help buyers book faster."
                  />

                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Call duration" htmlFor="durationMinutes">
                      <select
                        id="durationMinutes"
                        name="durationMinutes"
                        required
                        className="input mt-2"
                        defaultValue="15"
                      >
                        {durationOptions.map((duration) => (
                          <option key={duration} value={duration}>
                            {duration} minutes
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Price in EUR" htmlFor="price">
                      <div className="relative mt-2">
                        <Euro
                          size={17}
                          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                        />

                        <input
                          id="price"
                          name="price"
                          type="number"
                          min="1"
                          step="1"
                          required
                          className="input pl-12"
                          placeholder="25"
                        />
                      </div>
                    </Field>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--primary-soft)] p-5">
                  <div className="flex gap-3">
                    <ShieldCheck
                      size={20}
                      className="mt-1 shrink-0 text-[var(--primary-dark)]"
                    />

                    <div>
                      <p className="font-bold text-[var(--primary-dark)]">
                        Your profile will be visible after setup
                      </p>

                      <p className="mt-1 text-sm font-medium leading-6 text-[var(--primary-dark)]/80">
                        You can edit offers and availability later from your
                        dashboard.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="submit" className="btn btn-primary">
                    Create profile
                    <ArrowRight size={18} />
                  </button>

                  <Link href="/expert" className="btn btn-secondary">
                    Skip for now
                  </Link>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

function MiniStep({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof UserRound;
  title: string;
  text: string;
}) {
  return (
    <Card soft className="p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={19} />
      </div>

      <p className="mt-4 font-bold text-[var(--foreground)]">{title}</p>

      <p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]">
        {text}
      </p>
    </Card>
  );
}

function RuleItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <p className="text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
        {value}
      </p>

      <p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]">
        {label}
      </p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof UserRound;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-white shadow-sm">
        <Icon size={21} />
      </div>

      <div>
        <h3 className="text-xl font-black tracking-[-0.03em] text-[var(--foreground)]">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
          {text}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-bold text-[var(--foreground)]">
        {label}
      </label>

      {children}
    </div>
  );
}

function getPopularItems(items: string[]) {
  const counts = new Map<
    string,
    {
      label: string;
      count: number;
    }
  >();

  items.forEach((item) => {
    const label = item.trim();

    if (!label) {
      return;
    }

    const key = label.toLowerCase();
    const current = counts.get(key);

    if (current) {
      counts.set(key, {
        label: current.label,
        count: current.count + 1,
      });

      return;
    }

    counts.set(key, {
      label,
      count: 1,
    });
  });

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 40)
    .map((item) => item.label);
}

function mergeSuggestions(primary: string[], fallback: string[]) {
  const seen = new Set<string>();
  const merged: string[] = [];

  [...primary, ...fallback].forEach((item) => {
    const value = item.trim();

    if (!value) {
      return;
    }

    const key = value.toLowerCase();

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    merged.push(value);
  });

  return merged.slice(0, 60);
}

function formatExpertSetupError(error: string) {
  if (error === "missing-required-fields") {
    return "Please fill in all required fields.";
  }

  if (error === "invalid-price") {
    return "Please enter a valid price.";
  }

  if (error === "invalid-duration") {
    return "Please choose a valid call duration.";
  }

  if (error === "profile-already-exists") {
    return "You already have a helper profile.";
  }

  if (error === "not-signed-in") {
    return "Please sign in before creating a helper profile.";
  }

  return error;
}