import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

type ChecklistItem = {
  title: string;
  description: string;
  href: string;
  done: boolean;
};

type ProgressChecklistProps = {
  title: string;
  description?: string;
  items: ChecklistItem[];
};

export function ProgressChecklist({
  title,
  description,
  items,
}: ProgressChecklistProps) {
  const completed = items.filter((item) => item.done).length;
  const total = items.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="rounded-3xl border bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        <div className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
          {progress}%
        </div>
      </div>

      <div className="mb-5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group flex items-start gap-3 rounded-2xl border p-4 transition hover:bg-muted/50"
          >
            {item.done ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" />
            )}

            <div className="min-w-0 flex-1">
              <div className="font-medium">{item.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {item.description}
              </div>
            </div>

            <ArrowRight className="mt-0.5 h-4 w-4 text-muted-foreground transition group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}