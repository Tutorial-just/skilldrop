import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type ExpertPageProps = {
  params: Promise<{
    expertId: string;
  }>;
};

export default async function ExpertPage({ params }: ExpertPageProps) {
  const { expertId } = await params;

  const expert = await prisma.expertProfile.findUnique({
    where: {
      id: expertId,
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
      reviews: {
        include: {
          buyer: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
      },
    },
  });

  if (!expert || expert.status !== "APPROVED") {
    notFound();
  }

  const minPrice =
    expert.services.length > 0
      ? Math.min(...expert.services.map((service) => service.priceCents))
      : null;

  return (
    <main className="container-page py-10">
      <Link
        href="/experts"
        className="inline-flex rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-bold text-[#6f6a63] transition hover:text-[#151515]"
      >
        ← Back to experts
      </Link>

      <section className="mt-6 rounded-[2rem] bg-[#151515] p-6 text-white sm:rounded-[2.5rem] md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-3xl font-black text-white md:h-24 md:w-24 md:text-4xl">
                {expert.user.name?.charAt(0) ?? "E"}
              </div>

              <div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {expert.isVerified ? (
                    <span className="rounded-full bg-green-400 px-3 py-1 text-xs font-black text-[#151515]">
                      Verified expert
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/80">
                      Pending verification
                    </span>
                  )}

                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/80">
                    {expert.timezone}
                  </span>

                  {expert.country ? (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/80">
                      {expert.country}
                    </span>
                  ) : null}
                </div>

                <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                  {expert.user.name}
                </h1>

                <p className="mt-3 max-w-2xl text-lg leading-8 text-white/60">
                  {expert.headline}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-5 text-[#151515]">
            <p className="text-sm font-black text-[#2563eb]">Starting from</p>
            <p className="mt-2 text-5xl font-black">
              {minPrice ? `€${minPrice / 100}` : "—"}
            </p>
            <p className="mt-2 text-sm text-[#6f6a63]">
              Short focused 1:1 sessions
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          <HeroStat label="Rating" value={`⭐ ${expert.rating.toFixed(1)}`} />
          <HeroStat label="Reviews" value={`${expert.totalReviews}`} />
          <HeroStat label="Sessions" value={`${expert.totalSessions}`} />
        </div>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <InfoCard title="About">
            <p className="leading-8 text-[#6f6a63]">{expert.bio}</p>
          </InfoCard>

          <InfoCard title="Trust & verification">
            <div className="grid gap-4 md:grid-cols-2">
              <TrustCard
                title="Profile status"
                value={expert.status}
                tone="blue"
              />

              <TrustCard
                title="Verification"
                value={expert.isVerified ? "Verified" : "Pending"}
                tone={expert.isVerified ? "green" : "orange"}
              />

              <TrustCard
                title="Sessions completed"
                value={`${expert.totalSessions}`}
                tone="neutral"
              />

              <TrustCard
                title="Average rating"
                value={`${expert.rating.toFixed(1)} / 5`}
                tone="neutral"
              />
            </div>

            {expert.verificationNote ? (
              <div className="mt-4 rounded-[1.5rem] bg-[#f7f4ef] p-5">
                <p className="text-sm font-black">Verification note</p>
                <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                  {expert.verificationNote}
                </p>
              </div>
            ) : null}
          </InfoCard>

          <InfoCard title="Skills">
            <div className="flex flex-wrap gap-2">
              {expert.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-[#eef4ff] px-3 py-1.5 text-sm font-bold text-[#2563eb]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </InfoCard>

          <InfoCard title="Languages">
            <div className="flex flex-wrap gap-2">
              {expert.languages.map((language) => (
                <span
                  key={language}
                  className="rounded-full bg-[#f7f4ef] px-3 py-1.5 text-sm font-bold text-[#6f6a63]"
                >
                  {language}
                </span>
              ))}
            </div>
          </InfoCard>

          <InfoCard title="What people say">
            {expert.reviews.length === 0 ? (
              <div className="rounded-[1.5rem] bg-[#f7f4ef] p-5">
                <p className="font-black">No reviews yet</p>
                <p className="mt-2 leading-7 text-[#6f6a63]">
                  This expert is new on SkillDrop. Reviews will appear after
                  completed sessions.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {expert.reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    rating={review.rating}
                    text={review.comment ?? "No written comment."}
                    name={review.buyer.name ?? "Verified buyer"}
                  />
                ))}
              </div>
            )}
          </InfoCard>
        </div>

        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <div className="card rounded-[2rem] p-6">
            <div className="border-b border-[#e8e1d8] pb-5">
              <p className="text-sm font-black text-[#f97316]">
                Book a session
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Choose how{" "}
                {expert.user.name?.split(" ")[0] ?? "this expert"} can help
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                Pick a service and continue to booking. You’ll choose your time
                on the next step.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {expert.services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-[1.5rem] border border-[#e8e1d8] bg-white p-4 transition hover:border-[#2563eb]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-black">{service.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                        {service.description}
                      </p>
                    </div>

                    <p className="shrink-0 font-black text-[#2563eb]">
                      €{service.priceCents / 100}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="rounded-full bg-[#f7f4ef] px-3 py-1 text-xs font-bold text-[#6f6a63]">
                      {service.durationMinutes} min
                    </span>

                    <Link
                      href={`/experts/${expert.id}/book?serviceId=${service.id}`}
                      className="rounded-full bg-[#151515] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#2563eb]"
                    >
                      Book
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.5rem] bg-[#eef4ff] p-4">
              <p className="text-sm font-black text-[#2563eb]">
                Trust & safety
              </p>
              <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                {expert.isVerified
                  ? "This expert profile has been manually reviewed by SkillDrop."
                  : "This expert is approved, but full verification is still pending."}
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white/10 p-5">
      <p className="text-sm text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card rounded-[2rem] p-7">
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ReviewCard({
  rating,
  text,
  name,
}: {
  rating: number;
  text: string;
  name: string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-[#f7f4ef] p-5">
      <p className="text-lg">{"⭐".repeat(rating)}</p>
      <p className="mt-3 leading-7 text-[#6f6a63]">“{text}”</p>
      <p className="mt-4 text-sm font-black text-[#151515]">{name}</p>
    </div>
  );
}

function TrustCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "blue" | "green" | "orange" | "neutral";
}) {
  const styles = {
    blue: "bg-[#eef4ff] text-[#2563eb]",
    green: "bg-green-100 text-green-700",
    orange: "bg-[#fff3e8] text-[#f97316]",
    neutral: "bg-[#f7f4ef] text-[#151515]",
  };

  return (
    <div className={`rounded-[1.5rem] p-5 ${styles[tone]}`}>
      <p className="text-sm font-bold opacity-70">{title}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
}