import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Sparkles,
  Zap,
} from "lucide-react";

import type { ExpertQualityResult } from "@/lib/expert-quality";
import {
  formatProfileCompletenessMessage,
  getNextProfileStep,
} from "@/lib/expert-quality";
import { cn } from "@/lib/utils";

type ExpertProfileCompletenessCardProps = {
  quality: ExpertQualityResult;
  className?: string;
};

const allProfileSteps = [
  "Add a profile photo",
  "Add a clear headline",
  "Write a short bio",
  "Add your country",
  "Set your timezone",
  "Add at least one language",
  "Add at least one skill",
  "Create at least one active service",
  "Add availability",
];

export function ExpertProfileCompletenessCard({
  quality,
  className,
}: ExpertProfileCompletenessCardProps) {
  const completeness = quality.profileCompleteness;
  const nextStep = getNextProfileStep(completeness);
  const message = formatProfileCompletenessMessage(completeness);

  return (
    <section
      className={cn(
        "rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)] md:p-6",
        className,
      )}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--primary-dark)]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Required to go live
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
            Complete your helper profile
          </h2>

          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            {message}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-left lg:text-right">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Profile score
          </p>

          <p className="mt-1 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
            {completeness.score}%
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-2.5 overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              completeness.score >= 70
                ? "bg-[var(--success)]"
                : "bg-[var(--warning)]",
            )}
            style={{ width: `${completeness.score}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {quality.canReceiveBookings ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/20 bg-[var(--success-soft)] px-3 py-1.5 text-xs font-bold text-[var(--success)]">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Ready to receive bookings
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--warning)]/20 bg-[var(--warning-soft)] px-3 py-1.5 text-xs font-bold text-[var(--warning)]">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Not ready yet
            </span>
          )}

          {nextStep ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-xs font-bold text-[var(--muted-foreground)]">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              Next: {nextStep}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {allProfileSteps.map((step) => {
          const isMissing = completeness.missingItems.includes(step);
          const isCompleted = !isMissing;

          return (
            <div
              key={step}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm transition",
                isCompleted
                  ? "border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--foreground)]"
                  : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-foreground)]",
              )}
            >
              {isCompleted ? (
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-[var(--success)]"
                  aria-hidden="true"
                />
              ) : (
                <Circle
                  className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]"
                  aria-hidden="true"
                />
              )}

              <span className="font-medium">{step}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}