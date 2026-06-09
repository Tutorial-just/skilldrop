import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function PolicyHero({
  eyebrow,
  title,
  text,
  primaryHref,
  primaryLabel,
}: {
  eyebrow: string;
  title: string;
  text: string;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[radial-gradient(circle_at_top_left,var(--primary-soft),transparent_34%),linear-gradient(135deg,var(--background),var(--background-soft))]">
      <div className="surface-grid absolute inset-0 opacity-35" />
      <div className="container-page relative py-16 md:py-20">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[var(--primary-dark)]">
            {eyebrow}
          </span>
          <h1 className="heading-xl mt-5 text-balance">{title}</h1>
          <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-[var(--muted-foreground)]">
            {text}
          </p>
          {primaryHref && primaryLabel ? (
            <Link href={primaryHref} className="btn btn-primary mt-7">
              {primaryLabel}
              <ArrowRight size={18} />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function PolicySection({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children: ReactNode;
}) {
  return (
    <section className="container-page py-12 md:py-16">
      <div className="mb-7 max-w-2xl">
        <h2 className="text-3xl font-black tracking-[-0.05em] text-[var(--foreground)] md:text-4xl">
          {title}
        </h2>
        {text ? (
          <p className="mt-3 text-sm font-medium leading-7 text-[var(--muted-foreground)]">
            {text}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function PolicyGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

export function PolicyCard({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon?: ReactNode;
}) {
  return (
    <article className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        {icon ?? <CheckCircle2 size={20} />}
      </div>
      <h3 className="mt-5 text-xl font-black tracking-[-0.04em] text-[var(--foreground)]">
        {title}
      </h3>
      <p className="mt-3 text-sm font-medium leading-7 text-[var(--muted-foreground)]">
        {text}
      </p>
    </article>
  );
}
