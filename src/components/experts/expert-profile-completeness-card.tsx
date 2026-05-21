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
        "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Expert setup
          </div>

          <h2 className="mt-3 text-lg font-bold text-slate-950 dark:text-white">
            Complete your expert profile
          </h2>

          <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            {message}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Profile score
          </p>

          <p className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">
            {completeness.score}%
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              completeness.score >= 70 ? "bg-emerald-500" : "bg-amber-500",
            )}
            style={{
              width: `${completeness.score}%`,
            }}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {quality.canReceiveBookings ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Ready to receive bookings
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Not ready yet
            </span>
          )}

          {nextStep ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
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
                "flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                isCompleted
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300",
              )}
            >
              {isCompleted ? (
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
              ) : (
                <Circle
                  className="h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
              )}

              <span>{step}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}