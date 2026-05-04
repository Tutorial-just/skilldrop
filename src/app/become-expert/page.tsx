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
  "Write what clients will get after the call.",
  "Add real skills, languages and topics.",
  "Start with one simple service.",
];

export default async function BecomeExpertPage({
  searchParams,
}: BecomeExpertPageProps) {
  const { user } = await requireRole(["expert", "admin"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const email = user.email?.toLowerCase() ?? "";
  const name = user.name?.trim() || user.email || "Provider";

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
              Your help profile is ready.
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
              You already created your provider profile. You can manage
              services, availability and bookings from your dashboard.
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
              Create your help profile
            </Badge>

            <h1 className="heading-lg mt-5 max-w-4xl text-balance">
              Tell people who you are and how you can help.
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
              Create a profile, add your first service and become visible in the
              marketplace after setup.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStep icon={UserRound} title="Profile" text="About you" />
            <MiniStep icon={WalletCards} title="Service" text="Price & time" />
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

                <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
                  Verification is earned
                </h2>

                <p className="mt-3 leading-7 text-muted">
                  New providers start without a verified badge. The badge
                  appears after 3 successful calls and a rating of 3.8 or
                  higher.
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
                      className="flex gap-3 rounded-2xl border border-[var(--border)] bg-white/62 p-4 text-sm font-bold leading-6 text-[var(--muted-foreground)]"
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
            </div>

            <Card className="p-6 md:p-8">
              <div>
                <Badge variant="primary">
                  <BriefcaseBusiness size={14} />
                  Provider setup
                </Badge>

                <h2 className="mt-5 text-3xl font-black tracking-[-0.05em]">
                  Create your profile
                </h2>

                <p className="mt-3 leading-7 text-muted">
                  This information will be used for your public marketplace
                  profile and your first service.
                </p>
              </div>

              {resolvedSearchParams.error ? (
                <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
                  {formatExpertSetupError(resolvedSearchParams.error)}
                </div>
              ) : null}

              <form action={createProviderProfileAction} className="mt-8 grid gap-8">
                <div className="grid gap-5">
                  <SectionTitle
                    icon={UserRound}
                    title="About you"
                    text="Basic information clients will see."
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
                      className="input mt-2"
                      placeholder="I help people prepare for difficult conversations"
                    />
                  </Field>

                  <Field label="Autobiography / about you" htmlFor="bio">
                    <textarea
                      id="bio"
                      name="bio"
                      required
                      rows={6}
                      className="mt-2 w-full rounded-[24px] border border-[var(--border)] bg-white/88 p-4 text-sm leading-7 outline-none transition focus:border-[var(--primary)]/50 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.11)]"
                      placeholder="Tell clients who you are, what kind of experience you have, who you can help, and what they can expect after a call."
                    />
                  </Field>
                </div>

                <div className="grid gap-5">
                  <SectionTitle
                    icon={Globe2}
                    title="Category, skills and languages"
                    text="Help people find you in search."
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
                    <Field label="Languages" htmlFor="languages">
                      <input
                        id="languages"
                        name="languages"
                        type="text"
                        required
                        className="input mt-2"
                        placeholder="English, French, Russian"
                      />
                    </Field>

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

                  <Field label="Skills / topics" htmlFor="skills">
                    <input
                      id="skills"
                      name="skills"
                      type="text"
                      required
                      className="input mt-2"
                      placeholder="translation, moving abroad, emotional support, documents"
                    />
                  </Field>

                  <Field label="Tags" htmlFor="tags">
                    <input
                      id="tags"
                      name="tags"
                      type="text"
                      className="input mt-2"
                      placeholder="support, advice, french, family, relocation"
                    />
                  </Field>
                </div>

                <div className="grid gap-5">
                  <SectionTitle
                    icon={Clock3}
                    title="Your first service"
                    text="Create one clear offer that people can book."
                  />

                  <Field label="Service title" htmlFor="serviceTitle">
                    <input
                      id="serviceTitle"
                      name="serviceTitle"
                      type="text"
                      required
                      className="input mt-2"
                      placeholder="15-minute life advice call"
                    />
                  </Field>

                  <Field label="Service description" htmlFor="serviceDescription">
                    <textarea
                      id="serviceDescription"
                      name="serviceDescription"
                      required
                      rows={4}
                      className="mt-2 w-full rounded-[24px] border border-[var(--border)] bg-white/88 p-4 text-sm leading-7 outline-none transition focus:border-[var(--primary)]/50 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.11)]"
                      placeholder="Explain what happens during the call and what the client will get from it."
                    />
                  </Field>

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
                          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted"
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
                      <p className="font-black text-[var(--primary-dark)]">
                        Your profile will be visible after setup
                      </p>

                      <p className="mt-1 text-sm font-semibold leading-6 text-[var(--primary-dark)]/80">
                        You can edit services and availability later from your
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

      <p className="mt-4 font-black">{title}</p>
      <p className="mt-1 text-sm font-semibold text-muted">{text}</p>
    </Card>
  );
}

function RuleItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-4">
      <p className="text-2xl font-black tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-sm font-bold text-muted">{label}</p>
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
  children: React.ReactNode;
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
    return "You already have an expert profile.";
  }

  if (error === "not-signed-in") {
    return "Please sign in before creating a provider profile.";
  }

  return error;
}