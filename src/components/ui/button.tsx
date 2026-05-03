import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "btn-primary bg-[var(--foreground)] text-[var(--background)] border-transparent hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] theme-dark:bg-white theme-dark:text-[#0b0f19]",
  secondary:
    "btn-secondary border-[var(--border)] bg-white/70 text-[var(--foreground)] hover:-translate-y-0.5 hover:bg-white hover:shadow-[var(--shadow-sm)] theme-dark:bg-white/[0.08] theme-dark:hover:bg-white/[0.13]",
  ghost:
    "border-transparent bg-transparent text-[var(--muted-foreground)] hover:bg-white/60 hover:text-[var(--foreground)] theme-dark:hover:bg-white/[0.08]",
  danger:
    "border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  href: string;
  variant?: ButtonVariant;
};

export function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "btn inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border px-5 py-2.5",
        "text-sm font-black transition duration-200",
        "focus-visible:outline focus-visible:outline-4 focus-visible:outline-[rgba(139,92,246,0.35)] focus-visible:outline-offset-2",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  href,
  variant = "primary",
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={[
        "btn inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border px-5 py-2.5",
        "text-sm font-black transition duration-200",
        "focus-visible:outline focus-visible:outline-4 focus-visible:outline-[rgba(139,92,246,0.35)] focus-visible:outline-offset-2",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </Link>
  );
}