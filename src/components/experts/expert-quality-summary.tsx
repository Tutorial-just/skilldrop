import { CheckCircle2, ShieldCheck, TrendingUp } from "lucide-react";

import type { ExpertQualityResult } from "@/lib/expert-quality";
import { cn } from "@/lib/utils";
import { ExpertTrustBadge } from "@/components/experts/expert-trust-badge";

type ExpertQualitySummaryProps = {
  quality: ExpertQualityResult;
  compact?: boolean;
  showCompleteness?: boolean;
  className?: string;
};

export function ExpertQualitySummary({
  quality,
  compact = false,
  showCompleteness = false,
  className,
}: ExpertQualitySummaryProps) {
  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <ExpertTrustBadge
          badge={quality.badge}
          trustLabel={quality.trustLabel}
          size="sm"
        />

        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          <TrendingUp className="h-3 w-3" aria-hidden="true" />
          Score {quality.qualityScore}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Trust level
          </p>

          <div className="mt-2">
            <ExpertTrustBadge
              badge={quality.badge}
              trustLabel={quality.trustLabel}
              showDescription
              size="lg"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-end gap-2 text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-medium">Quality score</span>
          </div>

          <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
            {quality.qualityScore}
          </p>
        </div>
      </div>

      {showCompleteness ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2
                className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                Profile completeness
              </span>
            </div>

            <span className="text-sm font-bold text-slate-950 dark:text-white">
              {quality.profileCompleteness.score}%
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{
                width: `${quality.profileCompleteness.score}%`,
              }}
            />
          </div>

          {quality.profileCompleteness.missingItems.length > 0 ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Next step: {quality.profileCompleteness.missingItems[0]}
            </p>
          ) : (
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
              Your profile is complete.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}