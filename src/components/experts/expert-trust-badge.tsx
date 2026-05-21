import {
  BadgeCheck,
  Crown,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { ExpertBadge, ExpertLevel } from "@/lib/expert-quality";

type ExpertTrustBadgeProps = {
  badge: ExpertBadge;
  trustLabel?: string;
  showDescription?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const levelStyles: Record<
  ExpertLevel,
  {
    wrapper: string;
    icon: string;
    iconBg: string;
  }
> = {
  NEW_HELPER: {
    wrapper:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300",
    icon: "text-slate-600 dark:text-slate-300",
    iconBg: "bg-slate-100 dark:bg-slate-900",
  },
  FOUNDING_HELPER: {
    wrapper:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200",
    icon: "text-violet-600 dark:text-violet-300",
    iconBg: "bg-violet-100 dark:bg-violet-900/60",
  },
  EARNED_VERIFIED: {
    wrapper:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
    icon: "text-emerald-600 dark:text-emerald-300",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/60",
  },
  TOP_HELPER: {
    wrapper:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
    icon: "text-amber-600 dark:text-amber-300",
    iconBg: "bg-amber-100 dark:bg-amber-900/60",
  },
};

const sizeStyles = {
  sm: {
    wrapper: "gap-1.5 rounded-full px-2 py-1 text-[11px]",
    iconWrap: "h-4 w-4",
    icon: "h-3 w-3",
    label: "text-[11px]",
    description: "hidden",
  },
  md: {
    wrapper: "gap-2 rounded-full px-3 py-1.5 text-xs",
    iconWrap: "h-5 w-5",
    icon: "h-3.5 w-3.5",
    label: "text-xs",
    description: "mt-0.5 text-[11px]",
  },
  lg: {
    wrapper: "gap-2.5 rounded-2xl px-4 py-3 text-sm",
    iconWrap: "h-8 w-8",
    icon: "h-4 w-4",
    label: "text-sm",
    description: "mt-1 text-xs",
  },
};

function getBadgeIcon(level: ExpertLevel) {
  switch (level) {
    case "TOP_HELPER":
      return Crown;
    case "EARNED_VERIFIED":
      return BadgeCheck;
    case "FOUNDING_HELPER":
      return Sparkles;
    case "NEW_HELPER":
    default:
      return UserRound;
  }
}

export function ExpertTrustBadge({
  badge,
  trustLabel,
  showDescription = false,
  size = "md",
  className,
}: ExpertTrustBadgeProps) {
  const Icon = getBadgeIcon(badge.level);
  const styles = levelStyles[badge.level];
  const sizes = sizeStyles[size];

  return (
    <div
      className={cn(
        "inline-flex items-center border font-medium shadow-sm",
        styles.wrapper,
        sizes.wrapper,
        className,
      )}
      title={badge.description}
    >
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full",
          styles.iconBg,
          sizes.iconWrap,
        )}
      >
        <Icon className={cn(styles.icon, sizes.icon)} aria-hidden="true" />
      </span>

      <span className="min-w-0">
        <span className={cn("block leading-none", sizes.label)}>
          {badge.label}
        </span>

        {showDescription ? (
          <span
            className={cn(
              "block max-w-[260px] leading-snug opacity-80",
              sizes.description,
            )}
          >
            {trustLabel ?? badge.description}
          </span>
        ) : null}
      </span>
    </div>
  );
}

type ExpertTrustMiniProps = {
  level: ExpertLevel;
  className?: string;
};

export function ExpertTrustMini({ level, className }: ExpertTrustMiniProps) {
  const Icon = level === "TOP_HELPER" ? Crown : ShieldCheck;
  const styles = levelStyles[level];

  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full border shadow-sm",
        styles.wrapper,
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", styles.icon)} aria-hidden="true" />
    </span>
  );
}