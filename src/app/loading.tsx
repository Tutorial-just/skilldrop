export default function Loading() {
  return (
    <main className="container-page py-16">
      <div className="rounded-[2.5rem] bg-[#151515] p-8 text-white md:p-10">
        <div className="h-4 w-40 animate-pulse rounded-full bg-white/10" />
        <div className="mt-6 h-14 max-w-2xl animate-pulse rounded-2xl bg-white/10" />
        <div className="mt-4 h-6 max-w-xl animate-pulse rounded-full bg-white/10" />
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="card rounded-[2rem] p-6">
            <div className="flex items-start justify-between">
              <div className="h-16 w-16 animate-pulse rounded-full bg-[#f7f4ef]" />
              <div className="h-8 w-20 animate-pulse rounded-full bg-[#eef4ff]" />
            </div>

            <div className="mt-6 h-6 w-44 animate-pulse rounded-full bg-[#f7f4ef]" />
            <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-[#f7f4ef]" />
            <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-[#f7f4ef]" />

            <div className="mt-6 space-y-2">
              <div className="h-12 animate-pulse rounded-2xl bg-[#f7f4ef]" />
              <div className="h-12 animate-pulse rounded-2xl bg-[#f7f4ef]" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}