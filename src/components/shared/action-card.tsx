import Link from "next/link";
import { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

type ActionCardProps = {
  title: string;
  description: string;
  href: string;
  icon?: ReactNode;
  label?: string;
};

export function ActionCard({
  title,
  description,
  href,
  icon,
  label = "Open",
}: ActionCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-3xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        {icon ? (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted">
            {icon}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
            {label}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}