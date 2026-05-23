import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

const baseButtonClasses = [
  "btn inline-flex min-h-11 cursor-pointer items-center justify-center gap-2",
  "rounded-full border px-5 py-2.5 text-sm font-bold leading-none",
  "transition duration-200 ease-out",
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(139,92,246,0.35)] focus-visible:ring-offset-2",
  "focus-visible:ring-offset-[var(--background)]",
  "disabled:pointer-events-none disabled:opacity-50",
].join(" ");

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
        baseButtonClasses,
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
        baseButtonClasses,
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </Link>
  );
}