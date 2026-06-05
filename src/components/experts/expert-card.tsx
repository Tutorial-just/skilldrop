import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, CalendarDays, Euro, Star, Tags } from "lucide-react";

import { calculatePricingBreakdown, formatMoneyFromCents } from "@/config/pricing";
import { getExpertQuality } from "@/lib/expert-quality";
import { ExpertQualitySummary } from "@/components/experts/expert-quality-summary";

type ExpertCardProps = {
  expert: {
    id: string;
    headline: string | null;
    bio?: string | null;
    country?: string | null;
    timezone?: string | null;
    languages?: string[];
    skills?: string[];
    tags?: string[];
    rating?: number | null;
    totalReviews?: number | null;
    totalSessions?: number | null;
    isVerified?: boolean;
    isFoundingHelper?: boolean | null;
    user: {
      name: string | null;
      email?: string | null;
      image?: string | null;
      avatarUrl?: string | null;
    };
    services: {
      title?: string | null;
      description?: string | null;
      priceCents: number;
      isActive?: boolean;
      helpType?: string | null;
      tags?: string[] | null;
      category?: {
        name?: string | null;
        slug?: string | null;
      } | null;
      subcategory?: {
        name?: string | null;
        slug?: string | null;
      } | null;
    }[];
    availability?: {
      id: string;
      startTime?: Date | string | null;
    }[];
    reviews?: {
      problemSolved?: string | null;
    }[];
  };
};

const helpTypeLabels: Record<string, string> = {
  ADVICE: "Advice",
  EXPLANATION: "Explanation",
  TEACHING: "Teaching",
  PRACTICAL_GUIDANCE: "Guidance",
  PERSONAL_EXPERIENCE: "Experience",
  EMOTIONAL_SUPPORT: "Support",
  RELIGIOUS_DISCUSSION: "Religion",
  BUSINESS_MENTORING: "Business",
  OTHER: "Other",
};

export function ExpertCard({ expert }: ExpertCardProps) {
  const activeServices = expert.services.filter(
    (service) => service.isActive ?? true,
  );

  const avatarUrl = expert.user.avatarUrl ?? expert.user.image ?? null;
  const helperName = expert.user.name ?? expert.user.email ?? "Helper";
  const fallbackLetter = helperName.charAt(0).toUpperCase() || "H";
  const firstService = activeServices[0] ?? null;
  const minPriceCents = activeServices.length
    ? Math.min(...activeServices.map((service) => service.priceCents))
    : null;
  const totalPriceCents = minPriceCents
    ? calculatePricingBreakdown(minPriceCents).clientTotalCents
    : null;
  const nextSlot = expert.availability?.[0] ?? null;
  const serviceTags = activeServices.flatMap((service) => service.tags ?? []);
  const visibleTags = [
    ...(firstService?.category?.name ? [firstService.category.name] : []),
    ...(firstService?.subcategory?.name ? [firstService.subcategory.name] : []),
    ...(firstService?.helpType ? [helpTypeLabels[firstService.helpType] ?? firstService.helpType] : []),
    ...(expert.skills ?? []),
    ...serviceTags,
  ]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 5);

  const quality = getExpertQuality({
    image: avatarUrl,
    headline: expert.headline,
    bio: expert.bio,
    country: expert.country,
    timezone: expert.timezone,
    languages: expert.languages,
    skills: expert.skills,
    tags: expert.tags,
    totalSessions: expert.totalSessions ?? 0,
    completedCalls: expert.totalSessions ?? 0,
    totalReviews: expert.totalReviews ?? 0,
    rating: expert.rating ?? 0,
    servicesCount: expert.services.length,
    activeServicesCount: activeServices.length,
    availabilityCount: expert.availability?.length ?? 0,
    isFoundingHelper: expert.isFoundingHelper ?? false,
    isManuallyVerified: expert.isVerified ?? false,
  });

  const solvedReviews =
    expert.reviews?.filter((review) => review.problemSolved === "YES").length ?? 0;

  const partiallySolvedReviews =
    expert.reviews?.filter((review) => review.problemSolved === "PARTIALLY").length ?? 0;

  const notSolvedReviews =
    expert.reviews?.filter((review) => review.problemSolved === "NO").length ?? 0;

  const problemOutcomeTotal = solvedReviews + partiallySolvedReviews + notSolvedReviews;
  const problemSolvedRate =
    problemOutcomeTotal > 0 ? Math.round((solvedReviews / problemOutcomeTotal) * 100) : null;

  return (
    <Link
      href={`/experts/${expert.id}`}
      className="group block h-full rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--background-soft)] hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex items-start gap-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-xl font-black text-white">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={helperName}
              fill
              sizes="56px"
              className="object-cover"
              unoptimized
            />
          ) : (
            fallbackLetter
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {quality.isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-xs font-black text-[var(--success)]">
                <BadgeCheck size={13} />
                Verified
              </span>
            ) : (
              <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-black text-[var(--accent)]">
                New helper
              </span>
            )}

            {problemSolvedRate !== null ? (
              <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-black text-[var(--primary-dark)]">
                {problemSolvedRate}% solved
              </span>
            ) : null}
          </div>

          <h2 className="mt-3 truncate text-lg font-black tracking-[-0.03em] text-[var(--foreground)]">
            {helperName}
          </h2>

          <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            {expert.headline ?? "Ready to help you understand the problem and choose next steps."}
          </p>
        </div>
      </div>

      {firstService?.title ? (
        <div className="mt-5 rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Best matching offer
          </p>
          <p className="mt-2 line-clamp-2 text-sm font-black leading-6 text-[var(--foreground)]">
            {firstService.title}
          </p>
        </div>
      ) : null}

      <div className="mt-4">
        <ExpertQualitySummary quality={quality} compact />
      </div>

      {problemOutcomeTotal > 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniOutcome label="Solved" value={solvedReviews} />
          <MiniOutcome label="Partial" value={partiallySolvedReviews} />
          <MiniOutcome label="Not solved" value={notSolvedReviews} danger />
        </div>
      ) : null}

      {visibleTags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1 text-xs font-bold text-[var(--muted-foreground)]"
            >
              <Tags size={12} />
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
        <InfoPill
          icon={Euro}
          text={totalPriceCents ? `From ${formatMoneyFromCents(totalPriceCents)}` : "Price not set"}
        />
        <InfoPill
          icon={CalendarDays}
          text={nextSlot?.startTime ? `Next: ${formatDate(nextSlot.startTime)}` : "No slot yet"}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 text-sm font-bold text-[var(--muted-foreground)]">
          <Star size={15} />
          {(expert.rating ?? 0).toFixed(1)} · {expert.totalReviews ?? 0} reviews
        </div>

        <span className="text-sm font-black text-[var(--primary-dark)] transition group-hover:translate-x-0.5">
          View profile →
        </span>
      </div>
    </Link>
  );
}

function MiniOutcome({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div
      className={
        danger
          ? "rounded-2xl border border-[var(--danger)]/15 bg-[var(--danger-soft)] p-3"
          : "rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3"
      }
    >
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function InfoPill({ icon: Icon, text }: { icon: typeof Euro; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-2 text-xs font-black text-[var(--muted-foreground)]">
      <Icon size={14} />
      {text}
    </span>
  );
}

function formatDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "soon";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
