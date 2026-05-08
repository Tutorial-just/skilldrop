export default function Loading() {
  return (
    <main className="p-6 md:p-8 lg:p-10">
      <div className="h-5 w-40 animate-pulse rounded-full bg-[var(--primary-soft)]" />

      <div className="mx-auto mt-8 max-w-5xl">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-start">
          <div className="card rounded-[26px] p-6 md:p-8">
            <div className="h-8 w-36 animate-pulse rounded-full bg-[var(--success-soft)]" />

            <div className="mt-5 h-14 max-w-2xl animate-pulse rounded-3xl bg-white/70" />
            <div className="mt-4 h-6 max-w-xl animate-pulse rounded-full bg-white/70" />
            <div className="mt-2 h-6 max-w-lg animate-pulse rounded-full bg-white/70" />

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[24px] border border-[var(--border)] bg-white/64 p-4"
                >
                  <div className="h-10 w-10 animate-pulse rounded-2xl bg-[var(--primary-soft)]" />
                  <div className="mt-4 h-3 w-24 animate-pulse rounded-full bg-white/70" />
                  <div className="mt-3 h-5 w-44 animate-pulse rounded-full bg-white/70" />
                  <div className="mt-2 h-5 w-32 animate-pulse rounded-full bg-white/70" />
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[26px] border border-[var(--border)] bg-white/64 p-5">
              <div className="h-8 w-40 animate-pulse rounded-full bg-[var(--primary-soft)]" />

              <div className="mt-5 grid gap-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-2xl bg-white/70"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="card-soft rounded-[26px] p-6 md:p-7 xl:sticky xl:top-[100px]">
            <div className="h-8 w-24 animate-pulse rounded-full bg-[var(--accent-soft)]" />

            <div className="mt-4 h-10 w-56 animate-pulse rounded-2xl bg-white/70" />
            <div className="mt-3 h-5 w-full animate-pulse rounded-full bg-white/70" />
            <div className="mt-2 h-5 w-5/6 animate-pulse rounded-full bg-white/70" />

            <div className="mt-6 grid gap-3">
              <div className="h-12 animate-pulse rounded-full bg-[var(--primary-soft)]" />
              <div className="h-12 animate-pulse rounded-full bg-white/70" />
            </div>

            <div className="mt-6 grid gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-12 animate-pulse rounded-2xl bg-white/70"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}