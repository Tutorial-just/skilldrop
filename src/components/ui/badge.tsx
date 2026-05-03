import type { HTMLAttributes, ReactNode } from "react";

type BadgeVariant = "default" | "primary" | "accent" | "success" | "danger";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "border-[var(--border)] bg-white/64 text-[var(--muted-foreground)] theme-dark:bg-white/[0.08]",
  primary:
    "border-[var(--primary)]/20 bg-[var(--primary-soft)] text-[var(--primary-dark)]",
  accent:
    "border-[var(--accent)]/20 bg-[var(--accent-soft)] text-[var(--accent-dark)]",
  success:
    "border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]",
  danger:
    "border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)]",
};

export function Badge({
  children,
  variant = "default",
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "badge inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1",
        "text-xs font-black uppercase tracking-[0.12em]",
        "leading-none",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}