import Link from "next/link";
import { prisma } from "@/lib/prisma";

const categories = [
  {
    title: "CV Review",
    slug: "cv-review",
    description:
      "Get direct feedback on your CV before sending applications.",
    query: "CV Review",
    icon: "📄",
  },
  {
    title: "Mock Interview",
    slug: "mock-interview",
    description:
      "Practice interviews with experienced experts and get clear feedback.",
    query: "Mock Interview",
    icon: "🎤",
  },
  {
    title: "LinkedIn Review",
    slug: "linkedin-review",
    description:
      "Improve your profile, headline and recruiter-facing positioning.",
    query: "LinkedIn",
    icon: "💼",
  },
  {
    title: "Remote Jobs",
    slug: "remote-jobs",
    description:
      "Build a better strategy for international and remote job opportunities.",
    query: "Remote Jobs",
    icon: "🌍",
  },
  {
    title: "Portfolio Review",
    slug: "portfolio-review",
    description:
      "Get feedback on your portfolio, UX case studies and presentation.",
    query: "Portfolio Review",
    icon: "🎨",
  },
  {
    title: "React Interview",
    slug: "react-interview",
    description:
      "Prepare for frontend interviews, React questions and code reviews.",
    query: "React",
    icon: "⚛️",
  },
  {
    title: "Startup Advice",
    slug: "startup-advice",
    description:
      "Validate your idea, positioning, offer and first acquisition channel.",
    query: "Startup",
    icon: "🚀",
  },
];

export default async function CategoriesPage() {
  const experts = await prisma.expertProfile.findMany({
    where: {
      status: "APPROVED",
    },
    include: {
      services: true,
    },
  });

  return (
    <main className="container-page py-10">
      <section className="rounded-[2rem] bg-[#151515] p-6 text-white sm:rounded-[2.5rem] md:p-12">
        <div className="max-w-3xl">
          <p className="text-sm font-black text-[#f97316]">
            SkillDrop categories
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            Choose the career problem you want to solve.
          </h1>

          <p className="mt-5 text-lg leading-8 text-white/60">
            Browse focused expert sessions by category. Start with a specific
            problem, compare experts and book a short 1:1 session.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black">Popular categories</h2>
            <p className="mt-1 text-sm text-[#6f6a63]">
              Focused sessions for common career moments.
            </p>
          </div>

          <Link
            href="/experts"
            className="w-fit rounded-full bg-[#151515] px-5 py-3 text-sm font-black text-white transition hover:bg-[#2563eb]"
          >
            Browse all experts
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const matchingExperts = experts.filter((expert) => {
              const searchableText = [
                ...expert.skills,
                ...expert.services.map((service) => service.title),
                ...expert.services.map((service) => service.description),
              ]
                .join(" ")
                .toLowerCase();

              return searchableText.includes(category.query.toLowerCase());
            });

            return (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                className="card card-hover group rounded-[2rem] p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef4ff] text-2xl">
                    {category.icon}
                  </div>

                  <span className="rounded-full bg-[#f7f4ef] px-3 py-1 text-xs font-black text-[#6f6a63]">
                    {matchingExperts.length} experts
                  </span>
                </div>

                <h3 className="mt-6 text-2xl font-black">{category.title}</h3>

                <p className="mt-3 min-h-[84px] leading-7 text-[#6f6a63]">
                  {category.description}
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-[#e8e1d8] pt-5">
                  <span className="text-sm font-black text-[#2563eb]">
                    View category
                  </span>

                  <span className="rounded-full bg-[#151515] px-4 py-2 text-sm font-black text-white transition group-hover:bg-[#2563eb]">
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}