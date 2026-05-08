export default function Loading() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="h-5 w-40 animate-pulse rounded-full bg-[var(--primary-soft)]" />

          <div className="mt-6 h-8 w-28 animate-pulse rounded-full bg-[var(--primary-soft)]" />

          <div className="mt-5 h-14 max-w-3xl animate-pulse rounded-3xl bg-white/64" />
          <div className="mt-4 h-6 max-w-2xl animate-pulse rounded-full bg-white/64" />
          <div className="mt-2 h-6 max-w-xl animate-pulse rounded-full bg-white/64" />

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="card-soft rounded-[26px] p-4">
                <div className="h-11 w-11 animate-pulse rounded-2xl bg-[var(--primary-soft)]" />
                <div className="mt-4 h-3 w-28 animate-pulse rounded-full bg-white/70" />
                <div className="mt-3 h-8 w-20 animate-pulse rounded-full bg-white/70" />
                <div className="mt-2 h-4 w-36 animate-pulse rounded-full bg-white/70" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
          <div className="grid gap-6">
            <div className="card rounded-[26px] p-5 md:p-6">
              <div className="h-8 w-40 animate-pulse rounded-full bg-[var(--accent-soft)]" />
              <div className="mt-4 h-10 w-72 animate-pulse rounded-2xl bg-white/70" />
              <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded-full bg-white/70" />

              <div className="mt-6 grid gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <ReviewFormSkeleton key={index} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="card rounded-[26px] p-5 md:p-6">
              <div className="h-8 w-44 animate-pulse rounded-full bg-[var(--primary-soft)]" />
              <div className="mt-4 h-8 w-64 animate-pulse rounded-2xl bg-white/70" />

              <div className="mt-5 grid gap-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-2xl bg-white/70"
                  />
                ))}
              </div>
            </div>

            <div className="card rounded-[26px] p-5 md:p-6">
              <div className="h-8 w-36 animate-pulse rounded-full bg-[var(--success-soft)]" />

              <div className="mt-5 grid gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <ReviewedSkeleton key={index} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ReviewFormSkeleton() {
  return (
    <div className="rounded-[26px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="flex-1">
          <div className="h-7 w-36 animate-pulse rounded-full bg-[var(--primary-soft)]" />
          <div className="mt-4 h-8 w-72 max-w-full animate-pulse rounded-2xl bg-white/70" />
          <div className="mt-3 h-5 w-52 animate-pulse rounded-full bg-white/70" />
          <div className="mt-3 h-5 w-44 animate-pulse rounded-full bg-white/70" />
        </div>

        <div className="grid min-w-0 gap-3 lg:w-[430px]">
          <div className="h-12 animate-pulse rounded-full bg-white/70" />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-12 animate-pulse rounded-full bg-white/70" />
            <div className="h-12 animate-pulse rounded-full bg-white/70" />
            <div className="h-12 animate-pulse rounded-full bg-white/70" />
          </div>

          <div className="h-12 animate-pulse rounded-full bg-white/70" />
          <div className="h-28 animate-pulse rounded-[22px] bg-white/70" />
          <div className="h-12 animate-pulse rounded-full bg-[var(--primary-soft)]" />
        </div>
      </div>
    </div>
  );
}

function ReviewedSkeleton() {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-7 w-20 animate-pulse rounded-full bg-[var(--success-soft)]" />
        <div className="h-7 w-28 animate-pulse rounded-full bg-[var(--primary-soft)]" />
      </div>

      <div className="mt-4 h-6 w-56 animate-pulse rounded-full bg-white/70" />
      <div className="mt-2 h-4 w-40 animate-pulse rounded-full bg-white/70" />

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="h-14 animate-pulse rounded-2xl bg-white/70" />
        <div className="h-14 animate-pulse rounded-2xl bg-white/70" />
        <div className="h-14 animate-pulse rounded-2xl bg-white/70" />
      </div>

      <div className="mt-4 h-5 w-full animate-pulse rounded-full bg-white/70" />
      <div className="mt-2 h-5 w-4/5 animate-pulse rounded-full bg-white/70" />
    </div>
  );
}