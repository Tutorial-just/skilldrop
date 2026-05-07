import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  badge?: string;
  action?: ReactNode;
};

export function PageHeader({
  title,
  description,
  badge,
  action,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        {badge ? (
          <div className="inline-flex rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {badge}
          </div>
        ) : null}

        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h1>

          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}