import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Bookmark,
  CalendarClock,
  CheckCircle2,
  Compass,
  Euro,
  Globe2,
  HeartHandshake,
  Languages,
  Lightbulb,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  updateBuyerAccountAction,
  updateBuyerPreferencesAction,
} from "@/server/actions/buyer-settings.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type BuyerProfilePageProps = {
  searchParams?: Promise<{
    saved?: string;
  }>;
};

const profileIdeas = [
  {
    title: "Languages",
    text: "Tell us which languages you prefer for calls.",
    icon: Languages,
  },
  {
    title: "Topics",
    text: "Add interests like career, moving, family or documents.",
    icon: HeartHandshake,
  },
  {
    title: "Budget",
    text: "Set a comfortable price range for recommendations.",
    icon: Euro,
  },
  {
    title: "Timezone",
    text: "Help us show better times for your schedule.",
    icon: Globe2,
  },
];

export default async function BuyerProfilePage({
  searchParams,
}: BuyerProfilePageProps) {
  const { user } = await requireRole(["buyer", "admin"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const buyer = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      buyerSettings: true,
      bookings: {
        orderBy: {
          startTime: "desc",
        },
        take: 20,
      },
      savedExperts: {
        take: 10,
      },
    },
  });

  if (!buyer) {
    redirect("/sign-in");
  }

  const settings = buyer.buyerSettings;
  const now = new Date();

  const upcomingBookings = buyer.bookings.filter(
    (booking) =>
      booking.startTime >= now &&
      booking.status !== "CANCELLED" &&
      booking.status !== "REFUNDED" &&
      booking.status !== "COMPLETED",
  );

  const completedBookings = buyer.bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const profileScore = calculateProfileScore({
    hasName: Boolean(buyer.name),
    hasTimezone: Boolean(settings?.preferredTimezone),
    hasLanguages: Boolean(settings?.preferredLanguages.length),
    hasInterests: Boolean(settings?.interests.length),
    hasBudget: Boolean(settings?.budgetMinCents || settings?.budgetMaxCents),
    hasSavedExperts: buyer.savedExperts.length > 0,
    hasCompletedCall: completedBookings.length > 0,
  });

  const budgetMin = settings?.budgetMinCents
    ? String(settings.budgetMinCents / 100)
    : "";

  const budgetMax = settings?.budgetMaxCents
    ? String(settings.budgetMaxCents / 100)
    : "";

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <Link
            href="/buyer"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>

          {resolvedSearchParams.saved ? (
            <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black text-[var(--success)]">
              {resolvedSearchParams.saved === "account"
                ? "Profile name saved."
                : "Profile preferences saved."}
            </div>
          ) : null}

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Badge variant="primary">
                <UserRound size={14} />
                Client profile
              </Badge>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Make your experience personal.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Your profile helps SkillDrop recommend better experts, better
                times and better services for your needs.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
              <ButtonLink href="/experts">
                <Search size={18} />
                Find experts
              </ButtonLink>

              <ButtonLink href="/buyer/saved" variant="secondary">
                <Bookmark size={18} />
                Saved experts
              </ButtonLink>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Profile score"
              value={`${profileScore}%`}
              hint="Personalization strength"
            />

            <MetricCard
              label="Saved experts"
              value={String(buyer.savedExperts.length)}
              hint="Profiles saved"
            />

            <MetricCard
              label="Upcoming"
              value={String(upcomingBookings.length)}
              hint="Scheduled calls"
            />

            <MetricCard
              label="Completed"
              value={String(completedBookings.length)}
              hint="Finished sessions"
            />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6">
          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <Sparkles size={14} />
                Profile strength
              </Badge>

              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-5xl font-black tracking-[-0.06em]">
                    {profileScore}%
                  </p>

                  <p className="mt-2 text-sm font-semibold text-muted">
                    More detail means better recommendations.
                  </p>
                </div>

                <p className="text-sm font-black text-[var(--primary-dark)]">
                  {profileScore >= 75 ? "Strong" : "Keep going"}
                </p>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[#8b5cf6]"
                  style={{ width: `${profileScore}%` }}
                />
              </div>

              <div className="mt-5 grid gap-2">
                <MiniCheck done={Boolean(buyer.name)} text="Display name added" />

                <MiniCheck
                  done={Boolean(settings?.preferredTimezone)}
                  text="Timezone selected"
                />

                <MiniCheck
                  done={Boolean(settings?.preferredLanguages.length)}
                  text="Preferred languages added"
                />

                <MiniCheck
                  done={Boolean(settings?.interests.length)}
                  text="Topics added"
                />

                <MiniCheck
                  done={Boolean(settings?.budgetMinCents || settings?.budgetMaxCents)}
                  text="Budget range added"
                />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <Lightbulb size={14} />
                Why this matters
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Your profile is not public.
              </h2>

              <p className="mt-3 leading-7 text-muted">
                This profile is for your client experience. It helps the
                platform understand what kind of experts, languages, topics and
                call styles fit you best.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {profileIdeas.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="rounded-[22px] border border-[var(--border)] bg-white/64 p-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                        <Icon size={18} />
                      </div>

                      <h3 className="mt-4 font-black tracking-[-0.02em]">
                        {item.title}
                      </h3>

                      <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                        {item.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <UserRound size={14} />
                Basic profile
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Your identity
              </h2>

              <p className="mt-3 text-sm leading-6 text-muted">
                This name appears in your client workspace and booking history.
              </p>

              <form action={updateBuyerAccountAction} className="mt-6 grid gap-5">
                <div>
                  <label htmlFor="name" className="text-sm font-black">
                    Display name
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    defaultValue={buyer.name ?? ""}
                    className="input mt-2"
                    placeholder="Your name"
                  />
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                    Email
                  </p>

                  <p className="mt-1 truncate font-black">{buyer.email}</p>
                </div>

                <button type="submit" className="btn btn-primary">
                  <Save size={18} />
                  Save name
                </button>
              </form>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <WalletCards size={14} />
                Preferences
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                What kind of help do you need?
              </h2>

              <p className="mt-3 max-w-2xl leading-7 text-muted">
                These preferences can later power search, recommendations,
                reminders and booking defaults.
              </p>

              <form action={updateBuyerPreferencesAction} className="mt-7 grid gap-6">
                <div className="grid gap-5 xl:grid-cols-2">
                  <div>
                    <label htmlFor="preferredTimezone" className="text-sm font-black">
                      Preferred timezone
                    </label>

                    <input
                      id="preferredTimezone"
                      name="preferredTimezone"
                      type="text"
                      defaultValue={settings?.preferredTimezone ?? ""}
                      className="input mt-2"
                      placeholder="Europe/Paris"
                    />

                    <p className="mt-2 text-xs font-semibold text-muted">
                      Example: Europe/Paris, Europe/London, America/New_York.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="defaultReminderMin" className="text-sm font-black">
                      Default call reminder
                    </label>

                    <select
                      id="defaultReminderMin"
                      name="defaultReminderMin"
                      defaultValue={String(settings?.defaultReminderMin ?? 30)}
                      className="input mt-2"
                    >
                      <option value="10">10 minutes before</option>
                      <option value="15">15 minutes before</option>
                      <option value="30">30 minutes before</option>
                      <option value="60">1 hour before</option>
                      <option value="120">2 hours before</option>
                      <option value="1440">1 day before</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="preferredLanguages" className="text-sm font-black">
                      Preferred languages
                    </label>

                    <input
                      id="preferredLanguages"
                      name="preferredLanguages"
                      type="text"
                      defaultValue={settings?.preferredLanguages.join(", ") ?? ""}
                      className="input mt-2"
                      placeholder="English, French, Russian"
                    />

                    <p className="mt-2 text-xs font-semibold text-muted">
                      Separate languages with commas.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="interests" className="text-sm font-black">
                      Interests / topics
                    </label>

                    <input
                      id="interests"
                      name="interests"
                      type="text"
                      defaultValue={settings?.interests.join(", ") ?? ""}
                      className="input mt-2"
                      placeholder="career, documents, moving abroad, life advice"
                    />

                    <p className="mt-2 text-xs font-semibold text-muted">
                      Separate topics with commas.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="budgetMin" className="text-sm font-black">
                      Minimum budget
                    </label>

                    <input
                      id="budgetMin"
                      name="budgetMin"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={
                        settings?.budgetMinCents
                          ? String(settings.budgetMinCents / 100)
                          : ""
                      }
                      className="input mt-2"
                      placeholder="10"
                    />
                  </div>

                  <div>
                    <label htmlFor="budgetMax" className="text-sm font-black">
                      Maximum budget
                    </label>

                    <input
                      id="budgetMax"
                      name="budgetMax"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={
                        settings?.budgetMaxCents
                          ? String(settings.budgetMaxCents / 100)
                          : ""
                      }
                      className="input mt-2"
                      placeholder="100"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <ToggleCard
                    name="hideEmail"
                    title="Hide my email from experts"
                    text="Experts should contact me through the platform, not directly by email."
                    defaultChecked={settings?.hideEmail ?? true}
                  />

                  <ToggleCard
                    name="allowReminders"
                    title="Allow call reminders"
                    text="Receive reminders and booking updates from the platform."
                    defaultChecked={settings?.allowReminders ?? true}
                  />
                </div>

                <button type="submit" className="btn btn-primary w-full md:w-fit">
                  <Save size={18} />
                  Save profile preferences
                </button>
              </form>
            </Card>
          </div>

          <Card soft className="p-5 md:p-6">
            <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Compass size={24} />
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-[-0.04em]">
                  Next best action
                </h2>

                <p className="mt-2 leading-7 text-muted">
                  {getNextActionText({
                    hasLanguages: Boolean(settings?.preferredLanguages.length),
                    hasInterests: Boolean(settings?.interests.length),
                    hasSavedExperts: buyer.savedExperts.length > 0,
                    hasUpcoming: upcomingBookings.length > 0,
                  })}
                </p>
              </div>

              <ButtonLink href={getNextActionHref({
                hasLanguages: Boolean(settings?.preferredLanguages.length),
                hasInterests: Boolean(settings?.interests.length),
                hasSavedExperts: buyer.savedExperts.length > 0,
                hasUpcoming: upcomingBookings.length > 0,
              })}>
                Continue
                <Sparkles size={18} />
              </ButtonLink>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card soft className="p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black tracking-[-0.05em]">{value}</p>

      <p className="mt-1 text-sm font-semibold text-muted">{hint}</p>
    </Card>
  );
}

function MiniCheck({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <div
        className={
          done
            ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--success-soft)] text-[var(--success)]"
            : "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"
        }
      >
        {done ? <CheckCircle2 size={15} /> : <CalendarClock size={15} />}
      </div>

      <p className="text-sm font-bold text-muted">{text}</p>
    </div>
  );
}

function ToggleCard({
  name,
  title,
  text,
  defaultChecked,
}: {
  name: string;
  title: string;
  text: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-4 rounded-[24px] border border-[var(--border)] bg-white/64 p-4 transition hover:bg-white hover:shadow-[var(--shadow-sm)]">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-1 h-5 w-5 cursor-pointer accent-[var(--primary)]"
      />

      <span>
        <span className="block font-black tracking-[-0.02em]">{title}</span>
        <span className="mt-1 block text-sm font-semibold leading-6 text-muted">
          {text}
        </span>
      </span>
    </label>
  );
}

function calculateProfileScore({
  hasName,
  hasTimezone,
  hasLanguages,
  hasInterests,
  hasBudget,
  hasSavedExperts,
  hasCompletedCall,
}: {
  hasName: boolean;
  hasTimezone: boolean;
  hasLanguages: boolean;
  hasInterests: boolean;
  hasBudget: boolean;
  hasSavedExperts: boolean;
  hasCompletedCall: boolean;
}) {
  const checks = [
    hasName,
    hasTimezone,
    hasLanguages,
    hasInterests,
    hasBudget,
    hasSavedExperts,
    hasCompletedCall,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function getNextActionText({
  hasLanguages,
  hasInterests,
  hasSavedExperts,
  hasUpcoming,
}: {
  hasLanguages: boolean;
  hasInterests: boolean;
  hasSavedExperts: boolean;
  hasUpcoming: boolean;
}) {
  if (!hasLanguages || !hasInterests) {
    return "Add languages and topics so recommendations can become more personal.";
  }

  if (!hasSavedExperts) {
    return "Search experts and save useful profiles so you can come back later.";
  }

  if (!hasUpcoming) {
    return "You have saved experts. Open your saved list and book a time when you are ready.";
  }

  return "Your profile looks strong. Prepare one clear question before your next call.";
}

function getNextActionHref({
  hasLanguages,
  hasInterests,
  hasSavedExperts,
  hasUpcoming,
}: {
  hasLanguages: boolean;
  hasInterests: boolean;
  hasSavedExperts: boolean;
  hasUpcoming: boolean;
}) {
  if (!hasLanguages || !hasInterests) {
    return "/buyer/profile";
  }

  if (!hasSavedExperts) {
    return "/experts";
  }

  if (!hasUpcoming) {
    return "/buyer/saved";
  }

  return "/buyer/bookings";
}