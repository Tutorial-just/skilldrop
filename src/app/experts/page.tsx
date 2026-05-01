import Link from "next/link";
import { prisma } from "@/lib/prisma";

type ExpertsPageProps = {
  searchParams?: Promise<{
    query?: string;
    category?: string;
  }>;
};

const quickFilters = [
  "CV review",
  "Mock interview",
  "LinkedIn",
  "Remote jobs",
  "React interview",
  "Portfolio review",
  "Startup advice",
  "Germany",
  "Junior developer",
  "Frontend",
];

export default async function ExpertsPage({ searchParams }: ExpertsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = (resolvedSearchParams.query ?? resolvedSearchParams.category ?? "")
    .trim()
    .toLowerCase();

  const experts = await prisma.expertProfile.findMany({
    where: {
      status: "APPROVED",
    },
    include: {
      user: true,
      services: {
        where: {
          isActive: true,
        },
        orderBy: {
          priceCents: "asc",
        },
      },
      availability: {
        where: {
          isBooked: false,
          startTime: {
            gte: new Date(),
          },
        },
        orderBy: {
          startTime: "asc",
        },
      },
      reviews: true,
    },
    orderBy: [
      {
        isVerified: "desc",
      },
      {
        rating: "desc",
      },
    ],
  });

  const filteredExperts = query
    ? experts.filter((expert) => {
        const searchableText = [
          expert.user.name,
          expert.user.email,
          expert.headline,
          expert.bio,
          expert.country,
          expert.timezone,
          ...expert.languages,
          ...expert.skills,
          ...expert.tags,
          ...expert.tags.map((tag) => tag.replace("#", "")),
          ...expert.services.map((service) => service.title),
          ...expert.services.map((service) => service.description),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const queryWords = query
          .split(" ")
          .map((word) => word.trim())
          .filter(Boolean);

        return queryWords.every((word) => searchableText.includes(word));
      })
    : experts;

  const verifiedCount = filteredExperts.filter((expert) => expert.isVerified).length;

  const withAvailabilityCount = filteredExperts.filter(
    (expert) => expert.availability.length > 0,
  ).length;

  return (
    <main className="container-page py-10">
      <section className="rounded-[2rem] bg-[#151515] p-6 text-white sm:rounded-[2.5rem] md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-sm font-black text-[#f97316]">
              Expert marketplace
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Find the right expert for your next move.
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/60">
              Search by skill, problem, country, language, hashtag or service.
              Try things like React interview, CV Germany, LinkedIn or remote
              jobs.
            </p>

            <form
              action="/experts"
              className="mt-8 rounded-[2rem] bg-white p-3 text-[#151515]"
            >
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  name="query"
                  defaultValue={query}
                  placeholder="Search experts, skills, tags or services..."
                  className="min-h-14 flex-1 rounded-[1.5rem] bg-[#f7f4ef] px-5 text-sm font-medium outline-none placeholder:text-[#9a948b]"
                />

                <button
                  type="submit"
                  className="rounded-[1.5rem] bg-[#2563eb] px-7 py-4 text-sm font-black text-white transition hover:bg-[#1d4ed8]"
                >
                  Search
                </button>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <Link
                  key={filter}
                  href={`/experts?query=${encodeURIComponent(filter)}`}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    query === filter.toLowerCase()
                      ? "bg-white text-[#151515]"
                      : "bg-white/10 text-white/75 hover:bg-white hover:text-[#151515]"
                  }`}
                >
                  {filter}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-5 text-[#151515]">
            <p className="text-sm font-black text-[#2563eb]">Search results</p>

            <p className="mt-3 text-5xl font-black">{filteredExperts.length}</p>

            <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
              {query
                ? `Experts matching “${query}”.`
                : "Approved experts available on SkillDrop."}
            </p>

            <div className="mt-5 space-y-3 rounded-[1.5rem] bg-[#f7f4ef] p-4">
              <SummaryRow label="Verified" value={`${verifiedCount}`} />
              <SummaryRow
                label="With open slots"
                value={`${withAvailabilityCount}`}
              />
              <SummaryRow label="Total approved" value={`${experts.length}`} />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black">
              {query ? `Results for “${query}”` : "Recommended experts"}
            </h2>

            <p className="mt-1 text-sm text-[#6f6a63]">
              Ranked by verification, rating and relevance.
            </p>
          </div>

          {query ? (
            <Link
              href="/experts"
              className="w-fit rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
            >
              Clear search
            </Link>
          ) : null}
        </div>

        {filteredExperts.length === 0 ? (
          <div className="card rounded-[2rem] p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff] text-2xl">
              🔎
            </div>

            <h3 className="mt-5 text-2xl font-black">No experts found</h3>

            <p className="mx-auto mt-3 max-w-md leading-7 text-[#6f6a63]">
              Try a broader search like “CV”, “interview”, “remote” or browse
              categories.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/experts"
                className="rounded-full bg-[#151515] px-6 py-3 text-sm font-black text-white transition hover:bg-[#2563eb]"
              >
                Show all experts
              </Link>

              <Link
                href="/categories"
                className="rounded-full border border-[#e8e1d8] bg-white px-6 py-3 text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
              >
                Browse categories
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredExperts.map((expert) => {
              const minPrice =
                expert.services.length > 0
                  ? Math.min(
                      ...expert.services.map((service) => service.priceCents),
                    )
                  : null;

              const topServices = expert.services.slice(0, 2);
              const visibleTags = normalizeTags([
                ...expert.tags,
                ...expert.skills,
              ]).slice(0, 5);

              return (
                <Link
                  key={expert.id}
                  href={`/experts/${expert.id}`}
                  className="card card-hover group flex min-h-[420px] flex-col rounded-[2rem] p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f97316] text-2xl font-black text-white">
                      {expert.user.name?.charAt(0) ?? "E"}
                    </div>

                    <div className="rounded-full bg-[#eef4ff] px-3 py-1.5 text-sm font-black text-[#2563eb]">
                      ⭐ {expert.rating.toFixed(1)}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black tracking-tight">
                        {expert.user.name}
                      </h3>

                      {expert.isVerified ? (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-black text-green-700">
                          VERIFIED
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 min-h-[48px] text-sm leading-6 text-[#6f6a63]">
                      {expert.headline}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {visibleTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#f7f4ef] px-3 py-1 text-xs font-bold text-[#6f6a63]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 space-y-2">
                    {topServices.length > 0 ? (
                      topServices.map((service) => (
                        <div
                          key={service.id}
                          className="flex items-center justify-between rounded-2xl bg-[#f7f4ef] px-4 py-3"
                        >
                          <span className="truncate text-sm font-bold">
                            {service.title}
                          </span>

                          <span className="ml-3 shrink-0 text-sm font-black text-[#2563eb]">
                            €{service.priceCents / 100}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-[#f7f4ef] px-4 py-3 text-sm font-bold text-[#6f6a63]">
                        No active services yet
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MiniInfo
                      label="Sessions"
                      value={`${expert.totalSessions}`}
                    />
                    <MiniInfo
                      label="Reviews"
                      value={`${expert.totalReviews}`}
                    />
                    <MiniInfo
                      label="Slots"
                      value={`${expert.availability.length}`}
                      highlighted={expert.availability.length > 0}
                    />
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-[#e8e1d8] pt-5">
                    <div>
                      <p className="text-xs font-bold text-[#6f6a63]">
                        Starting from
                      </p>
                      <p className="text-xl font-black">
                        {minPrice ? `€${minPrice / 100}` : "—"}
                      </p>
                    </div>

                    <span className="rounded-full bg-[#151515] px-5 py-2.5 text-sm font-black text-white transition group-hover:bg-[#2563eb]">
                      View profile
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function normalizeTags(items: string[]) {
  const unique = Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => (item.startsWith("#") ? item : `#${item}`)),
    ),
  );

  return unique;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#e8e1d8] pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-[#6f6a63]">{label}</span>
      <span className="text-right text-sm font-black">{value}</span>
    </div>
  );
}

function MiniInfo({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-[1.25rem] p-4 ${
        highlighted ? "bg-[#eef4ff]" : "bg-[#f7f4ef]"
      }`}
    >
      <p className="text-xs font-bold text-[#6f6a63]">{label}</p>
      <p
        className={`mt-1 truncate text-sm font-black ${
          highlighted ? "text-[#2563eb]" : "text-[#151515]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}