import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  Globe2,
  Languages,
  Lightbulb,
  ListChecks,
  MapPin,
  MessageCircle,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  WalletCards,
} from "lucide-react";

import { AvatarUpload } from "@/components/expert/avatar-upload";
import { TagInput } from "@/components/expert/tag-input";
import { FormDraft } from "@/components/forms/form-draft";
import { TextareaWithCounter } from "@/components/forms/textarea-with-counter";
import { updateProviderProfileAction } from "@/server/actions/expert.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ExpertProfilePageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

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
  "Tech help",
  "Cooking help",
  "Recipe help",
  "School help",
  "Math help",
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
  "Small business",
  "Client communication",
  "Conflict resolution",
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
  "student-help",
  "french-admin",
  "expat-help",
];

const headlineExamples = [
  "I help people improve their CV and prepare for interviews",
  "I explain French paperwork and admin steps in simple words",
  "I help beginners practice French conversation with confidence",
  "I help people plan their first steps after moving abroad",
];

const bioChecklist = [
  "Who you are",
  "Who you help",
  "What problems you solve",
  "What clients get after the call",
  "Languages you can use",
];

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
        take: 5,
      },
      availability: {
        where: {
          startTime: {
            gte: new Date(),
          },
          isBooked: false,
        },
        orderBy: {
          startTime: "asc",
        },
        take: 8,
      },
      reviews: {
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

  const suggestionProfiles = await prisma.expertProfile.findMany({
    select: {
      languages: true,
      skills: true,
      tags: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 300,
  });

  const languageSuggestions = mergeSuggestions(
    getPopularItems(suggestionProfiles.flatMap((profile) => profile.languages)),
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

  const profileStrength = calculateProfileStrength({
    headline: expert.headline,
    bio: expert.bio,
    languages: expert.languages,
    skills: expert.skills,
    tags: expert.tags,
    servicesCount: expert.services.length,
    openSlotsCount: expert.availability.length,
    hasAvatar: Boolean(expert.user.avatarUrl),
    hasCountry: Boolean(expert.country),
    hasTimezone: Boolean(expert.timezone),
  });

  const missingItems = getMissingProfileItems({
    headline: expert.headline,
    bio: expert.bio,
    languages: expert.languages,
    skills: expert.skills,
    tags: expert.tags,
    servicesCount: expert.services.length,
    openSlotsCount: expert.availability.length,
    hasAvatar: Boolean(expert.user.avatarUrl),
    hasCountry: Boolean(expert.country),
    hasTimezone: Boolean(expert.timezone),
  });

  const providerName = expert.user.name ?? "Provider";
  const avatarLetter = (
    expert.user.name?.charAt(0) ||
    expert.user.email.charAt(0) ||
    "P"
  ).toUpperCase();

  const profileTone =
    profileStrength >= 85
      ? "Excellent"
      : profileStrength >= 70
        ? "Strong"
        : profileStrength >= 50
          ? "Good start"
          : "Needs work";

  const nextRecommendedHref =
    missingItems.some((item) => item.includes("active offer"))
      ? "/expert/services"
      : missingItems.some((item) => item.includes("availability"))
        ? "/expert/availability"
        : `/experts/${expert.id}`;

  const nextRecommendedText =
    missingItems.some((item) => item.includes("active offer"))
      ? "Create offer"
      : missingItems.some((item) => item.includes("availability"))
        ? "Add availability"
        : "View public profile";

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />
        <div className="absolute left-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute bottom-[-180px] right-[-150px] h-[420px] w-[420px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

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

              {resolvedSearchParams.saved ? (
                <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black text-[var(--success)]">
                  Profile saved. Your public profile has been updated.
                </div>
              ) : null}

              {resolvedSearchParams.error ? (
                <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
                  {formatProfileError(resolvedSearchParams.error)}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                <Badge variant="primary">
                  <UserRound size={14} />
                  Provider profile
                </Badge>

                <Badge variant={expert.isVerified ? "success" : "accent"}>
                  {expert.isVerified ? (
                    <>
                      <BadgeCheck size={14} />
                      Verified
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      Verification in progress
                    </>
                  )}
                </Badge>

                <Badge variant={profileStrength >= 75 ? "success" : "accent"}>
                  <Sparkles size={14} />
                  {profileStrength}% complete
                </Badge>
              </div>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Build a profile people can trust and book.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Your profile decides if clients click, trust you and book a call.
                Make it clear, human, specific and easy to find in search.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <ButtonLink href={`/experts/${expert.id}`}>
                <Eye size={18} />
                View public profile
              </ButtonLink>

              <ButtonLink href="/expert/services" variant="secondary">
                <WalletCards size={18} />
                Manage offers
              </ButtonLink>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MiniStat
              icon={Sparkles}
              label="Profile strength"
              value={`${profileStrength}%`}
              hint={profileTone}
            />

            <MiniStat
              icon={Languages}
              label="Languages"
              value={String(expert.languages.length)}
              hint="Shown in search"
            />

            <MiniStat
              icon={BriefcaseBusiness}
              label="Active offers"
              value={String(expert.services.length)}
              hint="Bookable services"
            />

            <MiniStat
              icon={Clock3}
              label="Open slots"
              value={String(expert.availability.length)}
              hint="Future availability"
            />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-8 xl:grid-cols-[0.78fr_1.22fr]">
          <div className="grid content-start gap-6">
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4">
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

                <Badge>{profileTone}</Badge>
              </div>

              <div className="mt-6 flex items-start gap-4">
                <AvatarPreview
                  avatarUrl={expert.user.avatarUrl}
                  name={providerName}
                  fallbackLetter={avatarLetter}
                  size="md"
                />

                <div className="min-w-0">
                  <h2 className="text-2xl font-black tracking-[-0.04em]">
                    {providerName}
                  </h2>

                  <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-muted">
                    {expert.headline || "Practical help through short calls"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>
                      <Star size={14} />
                      {expert.rating ? expert.rating.toFixed(1) : "New"}
                    </Badge>

                    <Badge>{expert.totalSessions} sessions</Badge>
                  </div>
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

                  <p className="text-sm font-black">{profileTone}</p>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[#8b5cf6]"
                    style={{ width: `${profileStrength}%` }}
                  />
                </div>
              </div>

              {missingItems.length > 0 ? (
                <div className="mt-5 rounded-[24px] border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-4">
                  <div className="flex gap-3">
                    <Lightbulb
                      size={18}
                      className="mt-0.5 shrink-0 text-[var(--warning)]"
                    />

                    <div>
                      <p className="font-black text-[var(--warning)]">
                        Next improvement
                      </p>

                      <p className="mt-1 text-sm font-bold leading-6 text-muted">
                        {missingItems[0]}
                      </p>

                      <div className="mt-4">
                        <ButtonLink href={nextRecommendedHref} variant="secondary">
                          {nextRecommendedText}
                        </ButtonLink>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[24px] border border-[var(--success)]/20 bg-[var(--success-soft)] p-4">
                  <div className="flex gap-3">
                    <CheckCircle2
                      size={18}
                      className="mt-0.5 shrink-0 text-[var(--success)]"
                    />

                    <p className="text-sm font-black leading-6 text-[var(--success)]">
                      Your profile looks strong. Keep offers and availability
                      fresh.
                    </p>
                  </div>
                </div>
              )}
            </Card>

            <Card soft className="p-6">
              <Badge variant="primary">
                <ListChecks size={14} />
                Readiness checklist
              </Badge>

              <div className="mt-5 grid gap-2">
                <CheckRow done={Boolean(expert.user.avatarUrl)} text="Photo added" />
                <CheckRow done={expert.headline.length >= 8} text="Clear headline" />
                <CheckRow done={expert.bio.length >= 120} text="Strong biography" />
                <CheckRow done={expert.languages.length > 0} text="Languages added" />
                <CheckRow done={expert.skills.length >= 3} text="At least 3 skills" />
                <CheckRow done={expert.tags.length >= 3} text="Search tags added" />
                <CheckRow done={expert.services.length > 0} text="Active offer created" />
                <CheckRow done={expert.availability.length > 0} text="Availability open" />
              </div>
            </Card>

            <Card className="p-6">
              <Badge variant="accent">
                <MessageCircle size={14} />
                Profile tips
              </Badge>

              <div className="mt-5 grid gap-3">
                <Tip text="Your headline should explain who you help and with what." />
                <Tip text="Your bio should sound human, not like a CV." />
                <Tip text="Use skills clients would actually search for." />
                <Tip text="Add languages exactly as clients would type them." />
                <Tip text="After saving, open your public profile and check it like a client." />
              </div>
            </Card>

            <Card className="p-6">
              <Badge variant="accent">
                <Eye size={14} />
                Public preview
              </Badge>

              <div className="mt-5 rounded-[26px] border border-[var(--border)] bg-white/64 p-4">
                <div className="flex items-start gap-4">
                  <AvatarPreview
                    avatarUrl={expert.user.avatarUrl}
                    name={providerName}
                    fallbackLetter={avatarLetter}
                    size="sm"
                  />

                  <div className="min-w-0">
                    <p className="font-black tracking-[-0.02em]">
                      {providerName}
                    </p>

                    <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-muted">
                      {expert.headline || "Practical help through short calls"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {expert.languages.slice(0, 3).map((language) => (
                    <Badge key={language}>
                      <Languages size={14} />
                      {language}
                    </Badge>
                  ))}

                  {expert.skills.slice(0, 5).map((skill) => (
                    <HashTag key={skill} text={skill} />
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <PreviewRow
                  label="Languages"
                  value={expert.languages.join(", ") || "Not set"}
                />

                <PreviewRow
                  label="Skills"
                  value={expert.skills.slice(0, 6).join(", ") || "Not set"}
                />

                <PreviewRow
                  label="Tags"
                  value={expert.tags.slice(0, 8).join(", ") || "Not set"}
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
                marketplace profile and help clients find you.
              </p>
            </div>

            <form
              id="expert-profile-form"
              action={updateProviderProfileAction}
              className="mt-8 grid gap-8"
            >
              <FormDraft formId="expert-profile-form" />

              <div className="grid gap-5">
                <SectionTitle
                  icon={UserRound}
                  title="Basic information"
                  text="This is shown at the top of your public profile."
                />

                <div className="rounded-[24px] border border-[var(--border)] bg-white/55 p-5">
                  <div className="flex gap-3">
                    <Camera
                      size={20}
                      className="mt-1 shrink-0 text-[var(--primary-dark)]"
                    />

                    <div>
                      <p className="font-black">Profile photo</p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-muted">
                        A clear friendly photo increases trust. Use JPG, PNG or
                        WEBP.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <AvatarUpload
                      currentAvatarUrl={expert.user.avatarUrl}
                      fallbackLetter={avatarLetter}
                    />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Display name" htmlFor="displayName">
                    <input
                      id="displayName"
                      name="displayName"
                      type="text"
                      required
                      maxLength={80}
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
                      maxLength={80}
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
                    minLength={8}
                    maxLength={120}
                    defaultValue={expert.headline}
                    className="input mt-2"
                    placeholder="I help people prepare for job interviews"
                  />
                </Field>

                <ExampleBox
                  title="Good headline examples"
                  items={headlineExamples}
                />

                <TextareaWithCounter
                  id="bio"
                  name="bio"
                  label="About you"
                  required
                  rows={8}
                  minLength={80}
                  maxLength={1600}
                  defaultValue={expert.bio}
                  placeholder="Tell people who you are, what experience you have, who you can help and what they can expect after a call."
                  helperText="Write like you are speaking to a real person. Clear profiles get more bookings."
                />

                <ExampleBox
                  title="Your bio should mention"
                  items={bioChecklist}
                />
              </div>

              <div className="grid gap-5">
                <SectionTitle
                  icon={Languages}
                  title="Search and discovery"
                  text="Use clear languages, skills and tags to make your profile easier to find."
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <TagInput
                    name="languages"
                    label="Languages"
                    defaultValue={expert.languages}
                    suggestions={languageSuggestions}
                    required
                    placeholder="English, French, Russian"
                    helperText="Press Enter after each language, or choose from suggestions."
                    maxItems={8}
                  />

                  <Field label="Timezone" htmlFor="timezone">
                    <input
                      id="timezone"
                      name="timezone"
                      type="text"
                      required
                      maxLength={80}
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
                  suggestions={skillSuggestions}
                  required
                  placeholder="CV review, translation, documents, relocation"
                  helperText="Add topics clients might search for."
                  maxItems={18}
                />

                <TagInput
                  name="tags"
                  label="Tags"
                  defaultValue={expert.tags}
                  suggestions={tagSuggestions}
                  placeholder="career, french, documents, moving abroad"
                  helperText="Optional tags for extra discovery."
                  maxItems={18}
                />
              </div>

              <div className="grid gap-5">
                <SectionTitle
                  icon={Globe2}
                  title="Public trust"
                  text="These details help clients understand if you are the right person."
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <TrustBox
                    icon={MapPin}
                    label="Country"
                    value={expert.country ?? "Not set"}
                  />

                  <TrustBox
                    icon={Languages}
                    label="Languages"
                    value={
                      expert.languages.length > 0
                        ? expert.languages.slice(0, 3).join(", ")
                        : "Not set"
                    }
                  />

                  <TrustBox
                    icon={WalletCards}
                    label="Offers"
                    value={`${expert.services.length} active`}
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
                        People can discover your profile after setup.
                        Verification is earned after 3 successful calls and a
                        3.8+ rating.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-4 z-20 rounded-[26px] border border-[var(--border)] bg-white/85 p-3 shadow-[var(--shadow-md)] backdrop-blur-xl theme-dark:bg-[#0f1117]/85">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-muted">
                    Save your changes, then check your public profile as a
                    client.
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="submit" className="btn btn-primary">
                      Save profile
                      <Save size={18} />
                    </button>

                    <Link href="/expert" className="btn btn-secondary">
                      Cancel
                    </Link>
                  </div>
                </div>
              </div>
            </form>
          </Card>
        </div>
      </section>
    </main>
  );
}

function AvatarPreview({
  avatarUrl,
  name,
  fallbackLetter,
  size,
}: {
  avatarUrl: string | null;
  name: string;
  fallbackLetter: string;
  size: "sm" | "md";
}) {
  const sizeClass =
    size === "md"
      ? "h-16 w-16 rounded-[24px] text-2xl"
      : "h-12 w-12 rounded-[18px] text-lg";

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] font-black text-white shadow-sm ${sizeClass}`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        fallbackLetter
      )}
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

function MiniStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card soft className="p-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={20} />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{value}</p>

      <p className="mt-1 text-sm font-semibold text-muted">{hint}</p>
    </Card>
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

function CheckRow({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <div
        className={
          done
            ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]"
            : "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"
        }
      >
        {done ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
      </div>

      <p className="text-sm font-bold text-muted">{text}</p>
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

function HashTag({ text }: { text: string }) {
  return (
    <span className="rounded-full border border-[var(--border)] bg-white/64 px-3 py-1 text-xs font-black text-[var(--muted-foreground)]">
      #{text}
    </span>
  );
}

function ExampleBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/55 p-4">
      <div className="flex gap-3">
        <Lightbulb
          size={18}
          className="mt-0.5 shrink-0 text-[var(--accent)]"
        />

        <div>
          <p className="text-sm font-black">{title}</p>

          <div className="mt-3 grid gap-2">
            {items.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[var(--border)] bg-white/64 px-3 py-2 text-sm font-bold leading-6 text-muted"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustBox({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={18} />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-muted">
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
  tags,
  servicesCount,
  openSlotsCount,
  hasAvatar,
  hasCountry,
  hasTimezone,
}: {
  headline: string;
  bio: string;
  languages: string[];
  skills: string[];
  tags: string[];
  servicesCount: number;
  openSlotsCount: number;
  hasAvatar: boolean;
  hasCountry: boolean;
  hasTimezone: boolean;
}) {
  const checks = [
    hasAvatar,
    headline.length >= 8,
    bio.length >= 120,
    languages.length > 0,
    skills.length >= 3,
    tags.length >= 3,
    servicesCount > 0,
    openSlotsCount > 0,
    hasCountry,
    hasTimezone,
  ];

  const completed = checks.filter(Boolean).length;

  return Math.round((completed / checks.length) * 100);
}

function getMissingProfileItems({
  headline,
  bio,
  languages,
  skills,
  tags,
  servicesCount,
  openSlotsCount,
  hasAvatar,
  hasCountry,
  hasTimezone,
}: {
  headline: string;
  bio: string;
  languages: string[];
  skills: string[];
  tags: string[];
  servicesCount: number;
  openSlotsCount: number;
  hasAvatar: boolean;
  hasCountry: boolean;
  hasTimezone: boolean;
}) {
  const items: string[] = [];

  if (!hasAvatar) {
    items.push("Add a profile photo so clients trust you faster.");
  }

  if (headline.length < 8) {
    items.push("Write a clear headline that explains who you help.");
  }

  if (bio.length < 120) {
    items.push("Write a stronger biography with your experience and what clients get.");
  }

  if (languages.length === 0) {
    items.push("Add at least one language.");
  }

  if (skills.length < 3) {
    items.push("Add at least 3 searchable skills or topics.");
  }

  if (tags.length < 3) {
    items.push("Add a few tags to improve search discovery.");
  }

  if (!hasCountry) {
    items.push("Add your country or region.");
  }

  if (!hasTimezone) {
    items.push("Add your timezone so booking times are clearer.");
  }

  if (servicesCount === 0) {
    items.push("Create at least one active offer so clients can book you.");
  }

  if (openSlotsCount === 0) {
    items.push("Add availability so clients can choose a time.");
  }

  return items;
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

function formatProfileError(error: string) {
  if (error === "missing-required-fields") {
    return "Please fill in all required fields.";
  }

  if (error === "headline-too-short") {
    return "Please write a clearer headline.";
  }

  if (error === "bio-too-short") {
    return "Please write at least 80 characters about yourself.";
  }

  if (error === "missing-languages") {
    return "Please add at least one language.";
  }

  if (error === "missing-skills") {
    return "Please add at least two skills or topics.";
  }

  if (error === "invalid-avatar") {
    return "Please upload a valid image: JPG, PNG or WEBP.";
  }

  if (error === "avatar-too-large") {
    return "Profile photo is too large. Please upload an image under 1MB.";
  }

  if (error === "not-signed-in") {
    return "Please sign in again.";
  }

  return "Something went wrong. Please try again.";
}