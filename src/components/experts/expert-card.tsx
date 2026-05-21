import Link from "next/link";

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
      image?: string | null;
    };
    services: {
      priceCents: number;
      isActive?: boolean;
    }[];
    availability?: {
      id: string;
    }[];
    reviews?: {
      problemSolved?: string | null;
    }[];
  };
};

export function ExpertCard({ expert }: ExpertCardProps) {
  const activeServices = expert.services.filter(
    (service) => service.isActive ?? true,
  );

  const quality = getExpertQuality({
    image: expert.user.image,
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

  const minPrice = activeServices.length
    ? Math.min(...activeServices.map((service) => service.priceCents)) / 100
    : 0;

  const solvedReviews =
    expert.reviews?.filter((review) => review.problemSolved === "YES").length ??
    0;

  const partiallySolvedReviews =
    expert.reviews?.filter((review) => review.problemSolved === "PARTIALLY")
      .length ?? 0;

  const notSolvedReviews =
    expert.reviews?.filter((review) => review.problemSolved === "NO").length ??
    0;

  const problemOutcomeTotal =
    solvedReviews + partiallySolvedReviews + notSolvedReviews;

  const problemSolvedRate =
    problemOutcomeTotal > 0
      ? Math.round((solvedReviews / problemOutcomeTotal) * 100)
      : null;

  return (
    <Link
      href={`/experts/${expert.id}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-emerald-900"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-slate-950 dark:text-white">
            {expert.user.name ?? "Expert"}
          </h2>

          <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
            {expert.headline ?? "Ready to help you solve your problem."}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {quality.isVerified ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              ✔ Verified
            </span>
          ) : null}

          {problemSolvedRate !== null ? (
            <span
              className={
                problemSolvedRate >= 70
                  ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              }
            >
              {problemSolvedRate}% solved
            </span>
          ) : null}
        </div>
      </div>

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

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {minPrice > 0 ? `From €${minPrice}` : "Price not set"}
        </p>

        <span className="text-sm font-semibold text-emerald-700 transition group-hover:translate-x-0.5 dark:text-emerald-400">
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
          ? "rounded-xl border border-red-100 bg-red-50 p-2 dark:border-red-950 dark:bg-red-950/30"
          : "rounded-xl border border-slate-100 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900"
      }
    >
      <p
        className={
          danger
            ? "text-[10px] font-bold uppercase tracking-wide text-red-600 dark:text-red-300"
            : "text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        }
      >
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}