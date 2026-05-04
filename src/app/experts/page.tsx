import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Clock3,
  Compass,
  Globe2,
  HeartHandshake,
  Languages,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  WalletCards,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ExpertsPageProps = {
  searchParams?: Promise<{
    q?: string;
    verified?: string;
    maxPrice?: string;
    language?: string;
    sort?: string;
  }>;
};

const quickSearches = [
  {
    label: "Life advice",
    href: "/experts?q=life advice",
    icon: HeartHandshake,
  },
  {
    label: "Moving abroad",
    href: "/experts?q=moving abroad",
    icon: Compass,
  },
  {
    label: "Languages",
    href: "/experts?q=translation language",
    icon: Languages,
  },
  {
    label: "Career",
    href: "/experts?q=career work",
    icon: WalletCards,
  },
  {
    label: "Everything else",
    href: "/experts?q=help advice support",
    icon: Sparkles,
  },
];

export default async function ExpertsPage({ searchParams }: ExpertsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const query = resolvedSearchParams.q?.trim() ?? "";
  const verifiedOnly = resolvedSearchParams.verified === "true";
  const maxPrice = resolvedSearchParams.maxPrice
    ? Number(resolvedSearchParams.maxPrice) * 100
    : null;
  const language = resolvedSearchParams.language?.trim() ?? "";
  const sort = resolvedSearchParams.sort ?? "best";

  const now = new Date();

  const searchTerms = query
    .split(/[,\s]+/)
    .map((term) => term.trim())
    .filter(Boolean);

  const rawExperts = await prisma.expertProfile.findMany({
    where: {
      status: "APPROVED",

      ...(verifiedOnly ? { isVerified: true } : {}),

      ...(language
        ? {
            languages: {
              has: language,
            },
          }
        : {}),

      services: {
        some: {
          isActive: true,
          ...(maxPrice
            ? {
                priceCents: {
                  lte: maxPrice,
                },
              }
            : {}),
        },
      },

      availability: {
        some: {
          startTime: {
            gte: now,
          },
          isBooked: false,
        },
      },

      ...(query
        ? {
            OR: [
              {
                headline: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
              {
                bio: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
              {
                country: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
              {
                skills: {
                  hasSome: searchTerms,
                },
              },
              {
                languages: {
                  hasSome: searchTerms,
                },
              },
              {
                tags: {
                  hasSome: searchTerms,
                },
              },
              {
                services: {
                  some: {
                    isActive: true,
                    OR: [
                      {
                        title: {
                          contains: query,
                          mode: "insensitive" as const,
                        },
                      },
                      {
                        description: {
                          contains: query,
                          mode: "insensitive" as const,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      user: true,
      services: {
        where: {
          isActive: true,
          ...(maxPrice
            ? {
                priceCents: {
                  lte: maxPrice,
                },
              }
            : {}),
        },
        include: {
          category: true,
        },
        orderBy: {
          priceCents: "asc",
        },
        take: 2,
      },
      availability: {
        where: {
          startTime: {
            gte: now,
          },
          isBooked: false,
        },
        orderBy: {
          startTime: "asc",
        },
        take: 3,
      },
      reviews: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          rating: true,
          helpfulness: true,
          clarity: true,
          professionalism: true,
          wouldRecommend: true,
          createdAt: true,
        },
        take: 20,
      },
    },
    orderBy: [
      {
        isVerified: "desc",
      },
      {
        rating: "desc",
      },
      {
        totalSessions: "desc",
      },
    ],
    take: 30,
  });

  let experts = rawExperts.map((expert) => ({
    ...expert,
    qualityScore: calculateQualityScore({
      rating: expert.rating,
      totalReviews: expert.totalReviews,
      totalSessions: expert.totalSessions,
      isVerified: expert.isVerified,
      openSlots: expert.availability.length,
      reviews: expert.reviews,
    }),
  }));

  if (sort === "best") {
    experts = experts.sort((a, b) => {
      if (b.qualityScore !== a.qualityScore) {
        return b.qualityScore - a.qualityScore;
      }

      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }

      return b.totalSessions - a.totalSessions;
    });
  }

  if (sort === "cheapest") {
    experts = experts.sort((a, b) => {
      const aPrice = a.services[0]?.priceCents ?? Number.MAX_SAFE_INTEGER;
      const bPrice = b.services[0]?.priceCents ?? Number.MAX_SAFE_INTEGER;

      return aPrice - bPrice;
    });
  }

  if (sort === "soonest") {
    experts = experts.sort((a, b) => {
      const aTime =
        a.availability[0]?.startTime.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime =
        b.availability[0]?.startTime.getTime() ?? Number.MAX_SAFE_INTEGER;

      return aTime - bTime;
    });
  }

  const totalOpenSlots = experts.reduce(
    (sum, expert) => sum + expert.availability.length,
    0,
  );

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative container-page py-8 md:py-10 lg:py-14">
          <Badge variant="primary">
            <Search size={14} />
            Find experts
          </Badge>

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_380px] xl:items-end">
            <div>
              <h1 className="heading-lg max-w-5xl text-balance">
                Find the right person for a short helpful call.
              </h1>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
                Search by topic, language, life situation or practical problem.
                Choose a service, pick a time and book a video call.
              </p>
            </div>

            <Card className="p-5">
              <Badge variant="accent">
                <Sparkles size={14} />
                Marketplace
              </Badge>

              <div className="mt-5 grid gap-3">
                <StatRow label="Available experts" value={String(experts.length)} />
                <StatRow label="Open time slots" value={String(totalOpenSlots)} />
                <StatRow label="Search" value={query || "All experts"} />
              </div>
            </Card>
          </div>

          <form action="/experts" className="mt-8">
            <div className="rounded-[28px] border border-[var(--border)] bg-white/64 p-3 shadow-[var(--shadow-sm)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex min-h-12 flex-1 items-center gap-3 rounded-2xl bg-white/64 px-4">
                  <Search size={18} className="text-muted" />

                  <input
                    name="q"
                    type="search"
                    defaultValue={query}
                    placeholder="Search: translation, career, moving abroad, emotional support..."
                    className="min-h-12 flex-1 border-0 bg-transparent text-sm font-bold outline-none placeholder:text-muted"
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  Search
                  <ArrowRight size={18} />
                </button>

                {query ||
                verifiedOnly ||
                resolvedSearchParams.maxPrice ||
                language ||
                sort !== "best" ? (
                  <Link href="/experts" className="btn btn-secondary">
                    Clear
                  </Link>
                ) : null}
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-[var(--border)] bg-white/64 px-4 text-sm font-black text-[var(--muted-foreground)]">
                  <input
                    type="checkbox"
                    name="verified"
                    value="true"
                    defaultChecked={verifiedOnly}
                  />
                  Verified only
                </label>

                <select
                  name="maxPrice"
                  defaultValue={resolvedSearchParams.maxPrice ?? ""}
                  className="min-h-12 rounded-2xl border border-[var(--border)] bg-white/64 px-4 text-sm font-black text-[var(--muted-foreground)] outline-none"
                >
                  <option value="">Any price</option>
                  <option value="20">Up to €20</option>
                  <option value="50">Up to €50</option>
                  <option value="100">Up to €100</option>
                </select>

                <input
                  type="text"
                  name="language"
                  defaultValue={language}
                  placeholder="Language"
                  className="min-h-12 rounded-2xl border border-[var(--border)] bg-white/64 px-4 text-sm font-black text-[var(--muted-foreground)] outline-none placeholder:text-muted"
                />

                <select
                  name="sort"
                  defaultValue={sort}
                  className="min-h-12 rounded-2xl border border-[var(--border)] bg-white/64 px-4 text-sm font-black text-[var(--muted-foreground)] outline-none"
                >
                  <option value="best">Best match</option>
                  <option value="cheapest">Cheapest</option>
                  <option value="soonest">Soonest</option>
                </select>
              </div>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            {quickSearches.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/64 px-4 py-2 text-sm font-black text-[var(--muted-foreground)] transition hover:-translate-y-0.5 hover:bg-white hover:text-[var(--primary-dark)] hover:shadow-[var(--shadow-sm)]"
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="grid gap-6 xl:grid-cols-[280px_1fr] xl:items-start">
          <aside className="grid gap-5 xl:sticky xl:top-[96px]">
            <Card className="p-5">
              <Badge variant="primary">
                <ShieldCheck size={14} />
                How it works
              </Badge>

              <div className="mt-5 grid gap-3">
                <Step number="1" title="Choose expert" text="Open a profile." />
                <Step number="2" title="Pick service" text="Select an offer." />
                <Step number="3" title="Book time" text="Reserve a slot." />
              </div>
            </Card>

            <Card soft className="p-5">
              <Badge variant="accent">
                <Sparkles size={14} />
                Good search
              </Badge>

              <p className="mt-4 text-sm font-bold leading-6 text-muted">
                Try simple words like “French”, “career”, “documents”, “moving”
                or “support”.
              </p>
            </Card>
          </aside>

          <div className="grid gap-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-3xl font-black tracking-[-0.05em]">
                  {query ? `Results for “${query}”` : "Available experts"}
                </h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                  Showing experts with active offers, future availability and
                  quality-based ranking.
                </p>
              </div>

              <Badge>{experts.length} found</Badge>
            </div>

            {experts.length > 0 ? (
              <div className="grid gap-5">
                {experts.map((expert) => (
                  <ExpertSearchCard key={expert.id} expert={expert} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No experts found"
                text="Try another keyword, or check back later when more experts add availability."
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function ExpertSearchCard({
  expert,
}: {
  expert: {
    id: string;
    headline: string;
    bio: string;
    country: string | null;
    languages: string[];
    skills: string[];
    rating: number;
    qualityScore: number;
    totalReviews: number;
    totalSessions: number;
    isVerified: boolean;
    user: {
      name: string | null;
      email: string;
    };
    services: {
      id: string;
      title: string;
      description: string;
      priceCents: number;
      durationMinutes: number;
      category: {
        name: string;
      } | null;
    }[];
    availability: {
      id: string;
      startTime: Date;
      endTime: Date;
      isBooked: boolean;
    }[];
  };
}) {
  const startingPrice = expert.services[0]?.priceCents ?? null;
  const nextSlot = expert.availability[0] ?? null;

  return (
    <Link href={`/experts/${expert.id}`} className="group">
      <Card className="p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-md)]">
        <div className="grid gap-5 lg:grid-cols-[1fr_220px] lg:items-start">
          <div className="flex gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-2xl font-black text-white shadow-sm">
              {expert.user.name?.charAt(0).toUpperCase() ?? "P"}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                {expert.isVerified ? (
                  <Badge variant="success">
                    <BadgeCheck size={14} />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="accent">New</Badge>
                )}

                <Badge variant={expert.qualityScore >= 80 ? "success" : "primary"}>
                  <Sparkles size={14} />
                  Quality {expert.qualityScore}
                </Badge>

                {expert.country ? (
                  <Badge>
                    <Globe2 size={14} />
                    {expert.country}
                  </Badge>
                ) : null}

                <Badge>
                  <Star size={14} />
                  {expert.rating ? expert.rating.toFixed(1) : "New"}
                </Badge>
              </div>

              <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                {expert.user.name ?? expert.user.email}
              </h3>

              <p className="mt-2 text-lg font-black tracking-[-0.03em]">
                {expert.headline}
              </p>

              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-muted">
                {expert.bio}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {expert.skills.slice(0, 6).map((skill) => (
                  <HashTag key={skill} text={skill} />
                ))}

                {expert.skills.length === 0 ? (
                  <span className="text-sm font-semibold text-muted">
                    No skills listed.
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-white/64 p-4">
            <div className="grid gap-3">
              <SideRow
                label="From"
                value={startingPrice ? formatMoney(startingPrice) : "—"}
              />

              <SideRow
                label="Next slot"
                value={nextSlot ? formatShortDateTime(nextSlot.startTime) : "—"}
              />

              <SideRow label="Quality" value={`${expert.qualityScore}/100`} />

              <SideRow label="Sessions" value={String(expert.totalSessions)} />
            </div>

            <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-4 py-3 text-sm font-black text-[var(--background)] transition group-hover:shadow-[var(--shadow-sm)]">
              View profile
              <ArrowRight size={16} />
            </div>
          </div>
        </div>

        {expert.services.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {expert.services.map((service) => (
              <div
                key={service.id}
                className="rounded-[22px] border border-[var(--border)] bg-white/55 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black tracking-[-0.02em]">
                      {service.title}
                    </p>

                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-muted">
                      {service.description}
                    </p>
                  </div>

                  <Badge variant="primary">{formatMoney(service.priceCents)}</Badge>
                </div>

                <p className="mt-3 inline-flex items-center gap-2 text-xs font-black text-muted">
                  <Clock3 size={13} />
                  {service.durationMinutes} minutes
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </Link>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="text-sm font-black">{value}</p>
    </div>
  );
}

function Step({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-sm font-black text-[var(--primary-dark)]">
        {number}
      </div>

      <div>
        <p className="font-black tracking-[-0.02em]">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-muted">{text}</p>
      </div>
    </div>
  );
}

function HashTag({ text }: { text: string }) {
  return (
    <span className="rounded-full border border-[var(--border)] bg-white/64 px-3 py-1 text-xs font-black text-[var(--muted-foreground)]">
      #{text}
    </span>
  );
}

function SideRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="text-right text-sm font-black">{value}</p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <UserRound size={24} />
      </div>

      <h3 className="mt-5 text-2xl font-black tracking-[-0.04em]">{title}</h3>

      <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-muted">
        {text}
      </p>
    </Card>
  );
}

function calculateQualityScore({
  rating,
  totalReviews,
  totalSessions,
  isVerified,
  openSlots,
  reviews,
}: {
  rating: number;
  totalReviews: number;
  totalSessions: number;
  isVerified: boolean;
  openSlots: number;
  reviews: {
    rating: number;
    helpfulness: number | null;
    clarity: number | null;
    professionalism: number | null;
    wouldRecommend: boolean | null;
    createdAt: Date;
  }[];
}) {
  const ratingScore =
    totalReviews > 0 ? clamp((rating / 5) * 30, 0, 30) : 8;

  const helpfulnessAvg = averageNullable(reviews.map((review) => review.helpfulness));
  const clarityAvg = averageNullable(reviews.map((review) => review.clarity));
  const professionalismAvg = averageNullable(
    reviews.map((review) => review.professionalism),
  );

  const detailedReviewScore =
    helpfulnessAvg || clarityAvg || professionalismAvg
      ? clamp(
          ((helpfulnessAvg ?? rating) +
            (clarityAvg ?? rating) +
            (professionalismAvg ?? rating)) /
            3 /
            5 *
            25,
          0,
          25,
        )
      : totalReviews > 0
        ? clamp((rating / 5) * 18, 0, 18)
        : 5;

  const recommendationReviews = reviews.filter(
    (review) => review.wouldRecommend !== null,
  );

  const recommendationRate =
    recommendationReviews.length > 0
      ? recommendationReviews.filter((review) => review.wouldRecommend).length /
        recommendationReviews.length
      : null;

  const recommendationScore =
    recommendationRate !== null ? clamp(recommendationRate * 15, 0, 15) : 6;

  const sessionsScore = clamp((Math.min(totalSessions, 20) / 20) * 15, 0, 15);
  const verifiedScore = isVerified ? 10 : 0;
  const availabilityScore = openSlots > 0 ? 5 : 0;

  return Math.round(
    ratingScore +
      detailedReviewScore +
      recommendationScore +
      sessionsScore +
      verifiedScore +
      availabilityScore,
  );
}

function averageNullable(values: (number | null)[]) {
  const cleanValues = values.filter(
    (value): value is number => typeof value === "number",
  );

  if (cleanValues.length === 0) {
    return null;
  }

  return (
    cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatMoney(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".00", "")}`;
}

function formatShortDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}