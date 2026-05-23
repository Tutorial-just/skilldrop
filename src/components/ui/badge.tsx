import type { HTMLAttributes, ReactNode } from "react";

type BadgeVariant = "default" | "primary" | "accent" | "success" | "warning" | "danger";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "badge-default",
  primary: "badge-primary",
  accent: "badge-accent",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
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
        "badge inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5",
        "text-xs font-bold leading-none",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}