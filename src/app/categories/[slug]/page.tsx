import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

const categories = [
  {
    title: "CV Review",
    slug: "cv-review",
    description:
      "Get direct feedback on your CV before sending applications.",
    query: "CV Review",
    icon: "📄",
    longDescription:
      "A CV review session helps you understand what recruiters see first, what looks weak, and what should be rewritten before you apply.",
  },
  {
    title: "Mock Interview",
    slug: "mock-interview",
    description:
      "Practice interviews with experienced experts and get clear feedback.",
    query: "Mock Interview",
    icon: "🎤",
    longDescription:
      "Mock interviews help you practice under pressure, improve your answers and get practical feedback before the real interview.",
  },
  {
    title: "LinkedIn Review",
    slug: "linkedin-review",
    description:
      "Improve your profile, headline and recruiter-facing positioning.",
    query: "LinkedIn",
    icon: "💼",
    longDescription:
      "A LinkedIn review helps improve how recruiters and hiring managers understand your experience, skills and target role.",
  },
  {
    title: "Remote Jobs",
    slug: "remote-jobs",
    description:
      "Build a better strategy for international and remote job opportunities.",
    query: "Remote Jobs",
    icon: "🌍",
    longDescription:
      "Remote job strategy sessions help you choose better target roles, position yourself for international companies and avoid unfocused applications.",
  },
  {
    title: "Portfolio Review",
    slug: "portfolio-review",
    description:
      "Get feedback on your portfolio, UX case studies and presentation.",
    query: "Portfolio Review",
    icon: "🎨",
    longDescription:
      "Portfolio reviews help designers, developers and creators present their work more clearly and make stronger first impressions.",
  },
  {
    title: "React Interview",
    slug: "react-interview",
    description:
      "Prepare for frontend interviews, React questions and code reviews.",
    query: "React",
    icon: "⚛️",
    longDescription:
      "React interview sessions help frontend developers prepare for technical questions, architecture discussions and code review tasks.",
  },
  {
    title: "Startup Advice",
    slug: "startup-advice",
    description:
      "Validate your idea, positioning, offer and first acquisition channel.",
    query: "Startup",
    icon: "🚀",
    longDescription:
      "Startup advice sessions help founders and builders clarify their idea, customer, offer and first realistic growth channel.",
  },
];

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  const category = categories.find((item) => item.slug === slug);

  if (!category) {
    notFound();
  }

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
    },
    orderBy: {
      rating: "desc",
    },
  });

  const filteredExperts = experts.filter((expert) => {
    const searchableText = [
      expert.user.name,
      expert.headline,
      expert.bio,
      expert.country,
      expert.timezone,
      ...expert.skills,
      ...expert.languages,
      ...expert.services.map((service) => service.title),
      ...expert.services.map((service) => service.description),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(category.query.toLowerCase());
  });

  return (
    <main className="container-page py-10">
      <Link
        href="/categories"
        className="inline-flex rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-bold text-[#6f6a63] transition hover:text-[#151515]"
      >
        ← Back to categories
      </Link>

      <section className="mt-6 rounded-[2rem] bg-[#151515] p-6 text-white sm:rounded-[2.5rem] md:p-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl">
              {category.icon}
            </div>

            <p className="mt-6 text-sm font-black text-[#f97316]">
              SkillDrop category
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
              {category.title}
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/60">
              {category.longDescription}
            </p>
          </div>

          <div className="rounded-[2rem] bg-white p-5 text-[#151515]">
            <p className="text-sm font-black text-[#2563eb]">
              Experts available
            </p>
            <p className="mt-2 text-5xl font-black">
              {filteredExperts.length}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
              Experts matching this category.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black">Recommended experts</h2>
            <p className="mt-1 text-sm text-[#6f6a63]">
              Experts ranked by rating and relevance.
            </p>
          </div>

          <Link
            href={`/experts?category=${encodeURIComponent(category.query)}`}
            className="w-fit rounded-full bg-[#151515] px-5 py-3 text-sm font-black text-white transition hover:bg-[#2563eb]"
          >
            Search marketplace
          </Link>
        </div>

        {filteredExperts.length === 0 ? (
          <div className="card rounded-[2rem] p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff] text-2xl">
              🔎
            </div>

            <h3 className="mt-5 text-2xl font-black">
              No experts in this category yet
            </h3>

            <p className="mx-auto mt-3 max-w-md leading-7 text-[#6f6a63]">
              Try browsing all experts or come back later as the marketplace
              grows.
            </p>

            <Link
              href="/experts"
              className="mt-6 inline-flex rounded-full bg-[#2563eb] px-6 py-3 text-sm font-black text-white transition hover:bg-[#1d4ed8]"
            >
              Browse experts
            </Link>
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

              return (
                <Link
                  key={expert.id}
                  href={`/experts/${expert.id}`}
                  className="card card-hover group flex min-h-[360px] flex-col rounded-[2rem] p-6"
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
                    {expert.skills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-[#f7f4ef] px-3 py-1 text-xs font-bold text-[#6f6a63]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 space-y-2">
                    {topServices.map((service) => (
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
                    ))}
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