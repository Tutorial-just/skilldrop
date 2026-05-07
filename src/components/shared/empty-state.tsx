import { ReactNode } from "react";
import { Sparkles } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed bg-card p-8 text-center shadow-sm">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        {icon ?? <Sparkles className="h-6 w-6 text-muted-foreground" />}
      </div>

      <h2 className="text-lg font-semibold">{title}</h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}