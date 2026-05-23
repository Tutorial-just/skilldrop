import { BadgeCheck, CheckCircle2, Circle, Star, Video } from "lucide-react";

import { getVerificationRequirements } from "@/lib/expert-verification";
import { cn } from "@/lib/utils";

type ExpertVerificationCardProps = {
  totalSessions: number;
  totalReviews: number;
  rating: number;
  isVerified: boolean;
  className?: string;
};

export function ExpertVerificationCard({
  totalSessions,
  totalReviews,
  rating,
  isVerified,
  className,
}: ExpertVerificationCardProps) {
  const requirements = getVerificationRequirements();

  const callsDone = totalSessions >= requirements.minCompletedCalls;
  const reviewsDone = totalReviews >= requirements.minReviews;
  const ratingDone = rating >= requirements.minRating;

  const completedSteps = [callsDone, reviewsDone, ratingDone].filter(Boolean).length;
  const progress = isVerified ? 100 : Math.round((completedSteps / 3) * 100);

  return (
    <section
      className={cn(
        "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
              isVerified
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
            )}
          >
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {isVerified ? "Earned Verified" : "Verification progress"}
          </div>

          <h2 className="mt-3 text-lg font-bold text-slate-950 dark:text-white">
            {isVerified ? "You earned your verification badge" : "Earn your verification badge"}
          </h2>

          <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            {isVerified
              ? "Your profile has enough successful calls, reviews and rating to be trusted by clients."
              : "Complete successful calls and collect positive reviews to unlock Earned Verified automatically."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Progress
          </p>

          <p className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">
            {progress}%
          </p>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isVerified ? "bg-emerald-500" : "bg-amber-500",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <VerificationStep
          done={callsDone}
          icon={Video}
          label="Completed calls"
          value={`${Math.min(totalSessions, requirements.minCompletedCalls)}/${requirements.minCompletedCalls}`}
          helper={
            callsDone
              ? "Enough successful calls."
              : `${Math.max(requirements.minCompletedCalls - totalSessions, 0)} more needed.`
          }
        />

        <VerificationStep
          done={reviewsDone}
          icon={BadgeCheck}
          label="Client reviews"
          value={`${Math.min(totalReviews, requirements.minReviews)}/${requirements.minReviews}`}
          helper={
            reviewsDone
              ? "Enough client reviews."
              : `${Math.max(requirements.minReviews - totalReviews, 0)} more needed.`
          }
        />

        <VerificationStep
          done={ratingDone}
          icon={Star}
          label="Average rating"
          value={rating > 0 ? rating.toFixed(1) : "New"}
          helper={
            ratingDone
              ? "Rating requirement reached."
              : `Minimum ${requirements.minRating.toFixed(1)} required.`
          }
        />
      </div>
    </section>
  );
}

function VerificationStep({
  done,
  icon: Icon,
  label,
  value,
  helper,
}: {
  done: boolean;
  icon: typeof Video;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        done
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
          : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-2xl",
            done
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
              : "bg-white text-slate-500 dark:bg-slate-950 dark:text-slate-400",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>

        {done ? (
          <CheckCircle2
            className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
        ) : (
          <Circle className="h-5 w-5 text-slate-400" aria-hidden="true" />
        )}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        {helper}
      </p>
    </div>
  );
}