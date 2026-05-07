export default function Loading() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-50" />
        <div className="absolute left-[-120px] top-[-140px] h-[360px] w-[360px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute right-[-140px] top-[80px] h-[380px] w-[380px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

        <div className="relative container-page py-8 md:py-10 lg:py-14">
          <div className="h-8 w-40 animate-pulse rounded-full bg-white/70" />

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
            <div>
              <div className="h-16 max-w-4xl animate-pulse rounded-[24px] bg-white/70" />
              <div className="mt-4 h-6 max-w-2xl animate-pulse rounded-full bg-white/60" />
              <div className="mt-3 h-6 max-w-xl animate-pulse rounded-full bg-white/50" />
            </div>

            <div className="rounded-[28px] border border-[var(--border)] bg-white/64 p-5 shadow-[var(--shadow-sm)]">
              <div className="h-7 w-32 animate-pulse rounded-full bg-[var(--primary-soft)]" />
              <div className="mt-5 grid gap-3">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-[30px] border border-[var(--border)] bg-white/64 p-3 shadow-[var(--shadow-sm)]">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="h-14 flex-1 animate-pulse rounded-2xl bg-white/70" />
              <div className="h-14 w-full animate-pulse rounded-2xl bg-[var(--foreground)]/10 md:w-40" />
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <div className="h-12 animate-pulse rounded-2xl bg-white/60" />
              <div className="h-12 animate-pulse rounded-2xl bg-white/60" />
              <div className="h-12 animate-pulse rounded-2xl bg-white/60" />
              <div className="h-12 animate-pulse rounded-2xl bg-white/60" />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-10 w-28 animate-pulse rounded-full border border-[var(--border)] bg-white/60"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="grid gap-6 xl:grid-cols-[280px_1fr] xl:items-start">
          <aside className="hidden gap-5 xl:grid">
            <div className="rounded-[28px] border border-[var(--border)] bg-white/64 p-5 shadow-[var(--shadow-sm)]">
              <div className="h-7 w-32 animate-pulse rounded-full bg-[var(--primary-soft)]" />
              <div className="mt-5 grid gap-3">
                <SkeletonStep />
                <SkeletonStep />
                <SkeletonStep />
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--border)] bg-white/50 p-5 shadow-[var(--shadow-sm)]">
              <div className="h-7 w-28 animate-pulse rounded-full bg-[var(--accent-soft)]" />
              <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-white/70" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-white/70" />
            </div>
          </aside>

          <div className="grid gap-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="h-10 w-72 animate-pulse rounded-2xl bg-white/70" />
                <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded-full bg-white/60" />
              </div>

              <div className="h-8 w-24 animate-pulse rounded-full bg-white/70" />
            </div>

            <div className="grid gap-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonExpertCard key={index} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/60 p-3">
      <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--card-soft)]" />
      <div className="h-4 w-16 animate-pulse rounded-full bg-[var(--card-soft)]" />
    </div>
  );
}

function SkeletonStep() {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-white/60 p-4">
      <div className="h-8 w-8 shrink-0 animate-pulse rounded-xl bg-[var(--primary-soft)]" />
      <div className="flex-1">
        <div className="h-4 w-28 animate-pulse rounded-full bg-[var(--card-soft)]" />
        <div className="mt-2 h-3 w-full animate-pulse rounded-full bg-[var(--card-soft)]" />
      </div>
    </div>
  );
}

function SkeletonExpertCard() {
  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-white/64 p-5 shadow-[var(--shadow-sm)]">
      <div className="grid gap-5 lg:grid-cols-[1fr_240px] lg:items-start">
        <div className="flex gap-4">
          <div className="h-16 w-16 shrink-0 animate-pulse rounded-[24px] bg-gradient-to-br from-[var(--primary)]/20 to-[#8b5cf6]/20" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <div className="h-7 w-24 animate-pulse rounded-full bg-[var(--success-soft)]" />
              <div className="h-7 w-28 animate-pulse rounded-full bg-[var(--primary-soft)]" />
              <div className="h-7 w-20 animate-pulse rounded-full bg-white/70" />
            </div>

            <div className="mt-4 h-7 w-56 animate-pulse rounded-full bg-white/70" />
            <div className="mt-3 h-5 w-full max-w-xl animate-pulse rounded-full bg-white/60" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded-full bg-white/50" />

            <div className="mt-4 flex flex-wrap gap-2">
              <div className="h-7 w-20 animate-pulse rounded-full bg-white/60" />
              <div className="h-7 w-24 animate-pulse rounded-full bg-white/60" />
              <div className="h-7 w-16 animate-pulse rounded-full bg-white/60" />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--border)] bg-white/60 p-4">
          <div className="grid gap-3">
            <SkeletonSideRow />
            <SkeletonSideRow />
            <SkeletonSideRow />
            <SkeletonSideRow />
          </div>

          <div className="mt-4 h-12 animate-pulse rounded-full bg-[var(--foreground)]/10" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="h-28 animate-pulse rounded-[22px] border border-[var(--border)] bg-white/50" />
        <div className="h-28 animate-pulse rounded-[22px] border border-[var(--border)] bg-white/50" />
      </div>
    </div>
  );
}

function SkeletonSideRow() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="h-4 w-16 animate-pulse rounded-full bg-[var(--card-soft)]" />
      <div className="h-4 w-20 animate-pulse rounded-full bg-[var(--card-soft)]" />
    </div>
  );
}