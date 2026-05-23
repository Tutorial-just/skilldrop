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
        "rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)] md:p-6",
        className,
      )}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold",
              isVerified
                ? "border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]"
                : "border-[var(--warning)]/20 bg-[var(--warning-soft)] text-[var(--warning)]",
            )}
          >
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {isVerified ? "Verified helper" : "Verification progress"}
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
            {isVerified
              ? "You earned your verification badge"
              : "Earn your verification badge"}
          </h2>

          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            {isVerified
              ? "Your profile has enough successful calls, buyer reviews and rating to be trusted faster."
              : "Complete successful calls and collect positive buyer reviews to unlock Earned Verified automatically."}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-left lg:text-right">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Progress
          </p>

          <p className="mt-1 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
            {progress}%
          </p>
        </div>
      </div>

      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isVerified ? "bg-[var(--success)]" : "bg-[var(--warning)]",
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
          label="Buyer reviews"
          value={`${Math.min(totalReviews, requirements.minReviews)}/${requirements.minReviews}`}
          helper={
            reviewsDone
              ? "Enough buyer reviews."
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
        "rounded-2xl border p-4 transition",
        done
          ? "border-[var(--success)]/20 bg-[var(--success-soft)]"
          : "border-[var(--border)] bg-[var(--card-soft)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-2xl",
            done
              ? "bg-[var(--success-soft)] text-[var(--success)]"
              : "bg-[var(--background-soft)] text-[var(--muted-foreground)]",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>

        {done ? (
          <CheckCircle2
            className="h-5 w-5 text-[var(--success)]"
            aria-hidden="true"
          />
        ) : (
          <Circle
            className="h-5 w-5 text-[var(--muted-foreground)]"
            aria-hidden="true"
          />
        )}
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
        {value}
      </p>

      <p className="mt-1 text-xs font-medium leading-5 text-[var(--muted-foreground)]">
        {helper}
      </p>
    </div>
  );
}