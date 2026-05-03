import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Globe2,
  Languages,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { updateProviderProfileAction } from "@/server/actions/expert.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { TagInput } from "@/components/expert/tag-input";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ExpertProfilePageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function ExpertProfilePage({
  searchParams,
}: ExpertProfilePageProps) {
  const { user } = await requireRole(["expert", "admin"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const expert = await prisma.expertProfile.findFirst({
    where: {
      user: {
        email,
      },
    },
    include: {
      user: true,
      services: {
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      },
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  const profileStrength = calculateProfileStrength({
    headline: expert.headline,
    bio: expert.bio,
    languages: expert.languages,
    skills: expert.skills,
    servicesCount: expert.services.length,
  });

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <Link
                href="/expert"
                className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
              >
                <ArrowLeft size={16} />
                Back to dashboard
              </Link>

              <div className="mt-6">
                <Badge variant="primary">
                  <UserRound size={14} />
                  Provider profile
                </Badge>
              </div>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Edit how people discover and trust you.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Your profile is the first thing clients see before booking a
                call. Keep it clear, human and specific.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <ButtonLink href={`/experts/${expert.id}`}>
                View public profile
                <ArrowRight size={18} />
              </ButtonLink>

              <ButtonLink href="/expert/services" variant="secondary">
                Manage offers
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-8 xl:grid-cols-[0.76fr_1.24fr]">
          <div className="grid content-start gap-6">
            <Card className="p-6">
              <Badge variant={expert.isVerified ? "success" : "accent"}>
                {expert.isVerified ? (
                  <>
                    <BadgeCheck size={14} />
                    Verified provider
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    Verification in progress
                  </>
                )}
              </Badge>

              <div className="mt-6 flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-2xl font-black text-white shadow-sm">
                  {expert.user.name?.charAt(0).toUpperCase() ?? "P"}
                </div>

                <div>
                  <h2 className="text-2xl font-black tracking-[-0.04em]">
                    {expert.user.name ?? "Provider"}
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-muted">
                    {expert.headline}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-black tracking-[-0.06em]">
                      {profileStrength}%
                    </p>

                    <p className="mt-1 text-sm font-semibold text-muted">
                      Profile strength
                    </p>
                  </div>

                  <p className="text-sm font-black">
                    {profileStrength >= 80
                      ? "Strong"
                      : profileStrength >= 55
                        ? "Good start"
                        : "Needs work"}
                  </p>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[#8b5cf6]"
                    style={{ width: `${profileStrength}%` }}
                  />
                </div>
              </div>
            </Card>

            <Card soft className="p-6">
              <Badge variant="primary">
                <Sparkles size={14} />
                Profile tips
              </Badge>

              <div className="mt-5 grid gap-3">
                <Tip text="Use a simple headline that says who you help." />
                <Tip text="Write your biography like you are speaking to a real person." />
                <Tip text="Add searchable skills people might type into search." />
                <Tip text="Mention languages clearly if you can help in multiple languages." />
              </div>
            </Card>

            <Card className="p-6">
              <Badge variant="accent">Public preview</Badge>

              <div className="mt-5 grid gap-4">
                <PreviewRow
                  label="Languages"
                  value={expert.languages.join(", ") || "Not set"}
                />

                <PreviewRow
                  label="Skills"
                  value={expert.skills.slice(0, 5).join(", ") || "Not set"}
                />

                <PreviewRow label="Country" value={expert.country ?? "Global"} />
              </div>
            </Card>
          </div>

          <Card className="p-6 md:p-8">
            <div>
              <Badge variant="primary">
                <Save size={14} />
                Edit information
              </Badge>

              <h2 className="mt-5 text-3xl font-black tracking-[-0.05em]">
                Profile details
              </h2>

              <p className="mt-3 leading-7 text-muted">
                Update your public information. Changes will appear on your
                marketplace profile.
              </p>
            </div>

            {resolvedSearchParams.error ? (
              <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
                {resolvedSearchParams.error}
              </div>
            ) : null}

            <form action={updateProviderProfileAction} className="mt-8 grid gap-8">
              <div className="grid gap-5">
                <SectionTitle
                  icon={UserRound}
                  title="Basic information"
                  text="This is shown at the top of your public profile."
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Display name" htmlFor="displayName">
                    <input
                      id="displayName"
                      name="displayName"
                      type="text"
                      required
                      defaultValue={expert.user.name ?? ""}
                      className="input mt-2"
                      placeholder="Anna Keller"
                    />
                  </Field>

                  <Field label="Country" htmlFor="country">
                    <input
                      id="country"
                      name="country"
                      type="text"
                      defaultValue={expert.country ?? ""}
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
                    defaultValue={expert.headline}
                    className="input mt-2"
                    placeholder="I help people solve practical life problems"
                  />
                </Field>

                <Field label="Autobiography / about you" htmlFor="bio">
                  <textarea
                    id="bio"
                    name="bio"
                    required
                    rows={7}
                    defaultValue={expert.bio}
                    className="mt-2 w-full rounded-[24px] border border-[var(--border)] bg-white/88 p-4 text-sm leading-7 outline-none transition focus:border-[var(--primary)]/50 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.11)]"
                    placeholder="Tell people who you are, what experience you have, who you can help and what they can expect after a call."
                  />
                </Field>
              </div>

              <div className="grid gap-5">
                <SectionTitle
                  icon={Languages}
                  title="Search and discovery"
                  text="Use hashtags to make your profile easier to find."
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <TagInput
                    name="languages"
                    label="Languages"
                    defaultValue={expert.languages}
                    required
                    placeholder="English, French, Russian"
                    helperText="Press Enter after each language."
                  />

                  <Field label="Timezone" htmlFor="timezone">
                    <input
                      id="timezone"
                      name="timezone"
                      type="text"
                      required
                      defaultValue={expert.timezone}
                      className="input mt-2"
                      placeholder="Europe/Paris"
                    />
                  </Field>
                </div>

                <TagInput
                  name="skills"
                  label="Skills / topics"
                  defaultValue={expert.skills}
                  required
                  placeholder="Translation, career advice, emotional support"
                  helperText="Add topics clients might search for."
                />

                <TagInput
                  name="tags"
                  label="Tags"
                  defaultValue={expert.tags}
                  placeholder="support, advice, french, family, relocation"
                  helperText="Optional hashtags for extra discovery."
                />
              </div>

              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--primary-soft)] p-5">
                <div className="flex gap-3">
                  <Globe2
                    size={20}
                    className="mt-1 shrink-0 text-[var(--primary-dark)]"
                  />

                  <div>
                    <p className="font-black text-[var(--primary-dark)]">
                      Your profile is public
                    </p>

                    <p className="mt-1 text-sm font-semibold leading-6 text-[var(--primary-dark)]/80">
                      People can discover your profile after setup. Keep your
                      text honest, clear and helpful.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="submit" className="btn btn-primary">
                  Save profile
                  <Save size={18} />
                </button>

                <Link href="/expert" className="btn btn-secondary">
                  Cancel
                </Link>
              </div>
            </form>
          </Card>
        </div>
      </section>
    </main>
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
        <h3 className="text-xl font-black tracking-[-0.03em]">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
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
      <label htmlFor={htmlFor} className="text-sm font-black">
        {label}
      </label>

      {children}
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-white/62 p-4 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
      <BadgeCheck size={17} className="mt-0.5 shrink-0 text-[var(--success)]" />
      {text}
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-sm font-black leading-6">{value}</p>
    </div>
  );
}

function calculateProfileStrength({
  headline,
  bio,
  languages,
  skills,
  servicesCount,
}: {
  headline: string;
  bio: string;
  languages: string[];
  skills: string[];
  servicesCount: number;
}) {
  const checks = [
    headline.length >= 8,
    bio.length >= 120,
    languages.length > 0,
    skills.length >= 3,
    servicesCount > 0,
  ];

  const completed = checks.filter(Boolean).length;

  return Math.round((completed / checks.length) * 100);
}