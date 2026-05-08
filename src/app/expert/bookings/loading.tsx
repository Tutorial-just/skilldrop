export default function Loading() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="h-5 w-44 animate-pulse rounded-full bg-[var(--primary-soft)]" />
          <div className="mt-6 h-8 w-32 animate-pulse rounded-full bg-white/64" />

          <div className="mt-5 h-14 max-w-3xl animate-pulse rounded-3xl bg-white/64" />
          <div className="mt-4 h-6 max-w-2xl animate-pulse rounded-full bg-white/64" />
          <div className="mt-2 h-6 max-w-xl animate-pulse rounded-full bg-white/64" />

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="card-soft rounded-[26px] p-4">
                <div className="h-11 w-11 animate-pulse rounded-2xl bg-[var(--primary-soft)]" />
                <div className="mt-4 h-3 w-24 animate-pulse rounded-full bg-white/70" />
                <div className="mt-3 h-8 w-20 animate-pulse rounded-full bg-white/70" />
                <div className="mt-2 h-4 w-36 animate-pulse rounded-full bg-white/70" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr] xl:items-start">
          <div className="grid gap-6">
            <div className="card rounded-[26px] p-5 md:p-6">
              <div className="h-8 w-28 animate-pulse rounded-full bg-[var(--primary-soft)]" />
              <div className="mt-5 h-10 w-72 max-w-full animate-pulse rounded-2xl bg-white/70" />
              <div className="mt-3 h-5 w-56 animate-pulse rounded-full bg-white/70" />

              <div className="mt-5 grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-12 animate-pulse rounded-2xl bg-white/70"
                  />
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="h-12 w-full animate-pulse rounded-full bg-[var(--primary-soft)] sm:w-40" />
                <div className="h-12 w-full animate-pulse rounded-full bg-white/70 sm:w-40" />
              </div>
            </div>

            <div className="card-soft rounded-[26px] p-5 md:p-6">
              <div className="h-8 w-36 animate-pulse rounded-full bg-[var(--primary-soft)]" />
              <div className="mt-5 h-8 w-64 animate-pulse rounded-2xl bg-white/70" />

              <div className="mt-5 grid gap-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-2xl bg-white/70"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="card rounded-[26px] p-5 md:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="h-8 w-32 animate-pulse rounded-full bg-[var(--accent-soft)]" />
                <div className="mt-4 h-9 w-64 animate-pulse rounded-2xl bg-white/70" />
                <div className="mt-3 h-5 w-80 max-w-full animate-pulse rounded-full bg-white/70" />
              </div>

              <div className="h-8 w-20 animate-pulse rounded-full bg-white/70" />
            </div>

            <div className="mt-6 grid gap-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <BookingSkeleton key={index} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function BookingSkeleton() {
  return (
    <div className="rounded-[26px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <div className="h-7 w-28 animate-pulse rounded-full bg-[var(--primary-soft)]" />
            <div className="h-7 w-24 animate-pulse rounded-full bg-white/70" />
          </div>

          <div className="mt-4 h-8 w-72 max-w-full animate-pulse rounded-2xl bg-white/70" />
          <div className="mt-3 h-5 w-52 animate-pulse rounded-full bg-white/70" />
          <div className="mt-2 h-5 w-44 animate-pulse rounded-full bg-white/70" />

          <div className="mt-4 flex flex-wrap gap-2">
            <div className="h-8 w-36 animate-pulse rounded-full bg-white/70" />
            <div className="h-8 w-20 animate-pulse rounded-full bg-white/70" />
            <div className="h-8 w-24 animate-pulse rounded-full bg-white/70" />
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 lg:min-w-[170px]">
          <div className="h-12 animate-pulse rounded-full bg-[var(--primary-soft)]" />
          <div className="h-12 animate-pulse rounded-full bg-white/70" />
        </div>
      </div>
    </div>
  );
}