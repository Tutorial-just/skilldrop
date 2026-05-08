export default function Loading() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="h-5 w-44 animate-pulse rounded-full bg-[var(--primary-soft)]" />
          <div className="mt-8 h-8 w-32 animate-pulse rounded-full bg-[var(--primary-soft)]" />

          <div className="mt-5 h-14 max-w-3xl animate-pulse rounded-3xl bg-white/64" />
          <div className="mt-4 h-6 max-w-2xl animate-pulse rounded-full bg-white/64" />
          <div className="mt-2 h-6 max-w-xl animate-pulse rounded-full bg-white/64" />

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="card-soft rounded-[26px] p-4">
                <div className="h-11 w-11 animate-pulse rounded-2xl bg-[var(--primary-soft)]" />
                <div className="mt-4 h-3 w-28 animate-pulse rounded-full bg-white/70" />
                <div className="mt-3 h-8 w-24 animate-pulse rounded-full bg-white/70" />
                <div className="mt-2 h-4 w-36 animate-pulse rounded-full bg-white/70" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-start">
          <div className="card rounded-[26px] p-5 md:p-6">
            <div className="h-8 w-40 animate-pulse rounded-full bg-[var(--accent-soft)]" />
            <div className="mt-4 h-10 w-80 max-w-full animate-pulse rounded-2xl bg-white/70" />
            <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded-full bg-white/70" />

            <div className="mt-6 grid gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <EarningSkeleton key={index} />
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="card rounded-[26px] p-5 md:p-6">
              <div className="h-8 w-36 animate-pulse rounded-full bg-[var(--primary-soft)]" />
              <div className="mt-4 h-8 w-64 animate-pulse rounded-2xl bg-white/70" />
              <div className="mt-3 h-5 w-full animate-pulse rounded-full bg-white/70" />
              <div className="mt-2 h-5 w-4/5 animate-pulse rounded-full bg-white/70" />

              <div className="mt-5 grid gap-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-12 animate-pulse rounded-2xl bg-white/70"
                  />
                ))}
              </div>

              <div className="mt-5 h-12 animate-pulse rounded-full bg-[var(--primary-soft)]" />
            </div>

            <div className="card-soft rounded-[26px] p-5 md:p-6">
              <div className="h-8 w-32 animate-pulse rounded-full bg-[var(--accent-soft)]" />
              <div className="mt-4 h-5 w-full animate-pulse rounded-full bg-white/70" />
              <div className="mt-3 h-5 w-5/6 animate-pulse rounded-full bg-white/70" />
              <div className="mt-5 h-5 w-full animate-pulse rounded-full bg-white/70" />
              <div className="mt-3 h-5 w-4/6 animate-pulse rounded-full bg-white/70" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function EarningSkeleton() {
  return (
    <div className="rounded-[26px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            <div className="h-7 w-28 animate-pulse rounded-full bg-[var(--primary-soft)]" />
            <div className="h-7 w-36 animate-pulse rounded-full bg-white/70" />
          </div>

          <div className="mt-4 h-8 w-72 max-w-full animate-pulse rounded-2xl bg-white/70" />
          <div className="mt-3 h-5 w-52 animate-pulse rounded-full bg-white/70" />
          <div className="mt-3 h-5 w-44 animate-pulse rounded-full bg-white/70" />
        </div>

        <div className="grid min-w-[240px] gap-2 rounded-[22px] border border-[var(--border)] bg-white/64 p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded-2xl bg-white/70"
            />
          ))}
        </div>
      </div>
    </div>
  );
}