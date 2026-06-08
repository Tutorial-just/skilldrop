import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Compass,
  Globe2,
  HeartHandshake,
  Languages,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  UserRound,
  WalletCards,
} from "lucide-react";
import { HelpRequestStatus, HelpType, HelpUrgency } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { calculateWorldClassMatchScore } from "@/lib/matching";
import { trackProductEvent } from "@/lib/product-analytics";
import {
  calculatePricingBreakdown,
  formatMoneyFromCents,
} from "@/config/pricing";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ExpertsPageProps = {
  searchParams?: Promise<{
    q?: string;
    verified?: string;
    maxPrice?: string;
    language?: string;
    category?: string;
    helpType?: string;
    urgency?: string;
    sort?: string;
    page?: string;
    requestId?: string;
  }>;
};

const quickSearches = [
  {
    label: "Improve my CV",
    href: "/experts?q=CV resume review job career application",
    icon: WalletCards,
  },
  {
    label: "Prepare interview",
    href: "/experts?q=interview job career preparation mock interview",
    icon: UserRound,
  },
  {
    label: "Understand documents",
    href: "/experts?q=documents admin help paperwork form letter",
    icon: Compass,
  },
  {
    label: "Translate a message",
    href: "/experts?q=translation language message document French English",
    icon: Languages,
  },
  {
    label: "Moving abroad",
    href: "/experts?q=moving abroad relocation immigration country documents",
    icon: Globe2,
  },
  {
    label: "Tech help",
    href: "/experts?q=tech computer code website network",
    icon: Sparkles,
  },
  {
    label: "Practical advice",
    href: "/experts?q=practical advice guidance life experience",
    icon: HeartHandshake,
  },
];

const sortLabels: Record<string, string> = {
  best: "Best match",
  cheapest: "Cheapest",
  soonest: "Soonest",
};

const validHelpTypes = new Set<string>(Object.values(HelpType));

function parseHelpType(value?: string) {
  const normalizedValue = value?.trim().toUpperCase();

  if (!normalizedValue || !validHelpTypes.has(normalizedValue)) {
    return undefined;
  }

  return normalizedValue as HelpType;
}

function helpUrgencyToParam(value: HelpUrgency) {
  if (value === HelpUrgency.TODAY) {
    return "today";
  }

  if (value === HelpUrgency.THIS_WEEK) {
    return "this-week";
  }

  return "";
}

const EXPERTS_PAGE_SIZE = 20;
const MAX_RAW_EXPERTS = 120;
const MAX_CARD_REVIEWS = 8;

const synonymMap: Record<string, string[]> = {
  cv: ["cv", "resume", "job", "career", "application", "interview"],
  resume: ["cv", "resume", "job", "career", "application", "interview"],
  entretien: ["interview", "job", "career", "cv", "resume"],
  interview: ["interview", "job", "career", "cv", "resume"],

  document: ["document", "documents", "admin", "paperwork", "form", "file"],
  documents: ["document", "documents", "admin", "paperwork", "form", "file"],
  admin: ["admin", "documents", "paperwork", "form", "file"],
  papier: ["documents", "admin", "paperwork", "form"],
  papiers: ["documents", "admin", "paperwork", "form"],

  recette: ["recipe", "recipes", "cooking", "cook", "baking", "cake", "food"],
  recettes: ["recipe", "recipes", "cooking", "cook", "baking", "cake", "food"],
  recipe: ["recipe", "recipes", "cooking", "cook", "baking", "cake", "food"],
  recipes: ["recipe", "recipes", "cooking", "cook", "baking", "cake", "food"],
  pirog: ["recipe", "recipes", "cooking", "cook", "baking", "cake", "food"],
  piroga: ["recipe", "recipes", "cooking", "cook", "baking", "cake", "food"],
  cake: ["recipe", "recipes", "cooking", "cook", "baking", "cake", "food"],
  baking: ["recipe", "recipes", "cooking", "cook", "baking", "cake", "food"],
  cooking: ["recipe", "recipes", "cooking", "cook", "baking", "cake", "food"],

  france: ["france", "french", "documents", "relocation", "moving"],
  french: ["france", "french", "translation", "language", "documents"],
  francais: ["france", "french", "translation", "language", "documents"],
  français: ["france", "french", "translation", "language", "documents"],

  language: [
    "language",
    "translation",
    "speaking",
    "practice",
    "english",
    "french",
  ],
  languages: [
    "language",
    "translation",
    "speaking",
    "practice",
    "english",
    "french",
  ],
  traduction: ["translation", "language", "french", "english"],
  translation: ["translation", "language", "french", "english"],

  code: ["code", "programming", "developer", "website", "debug", "tech"],
  website: ["website", "web", "code", "developer", "programming"],
  computer: ["computer", "tech", "it", "network", "support"],
  network: ["network", "wifi", "router", "it", "tech", "computer"],
  wifi: ["wifi", "network", "router", "internet", "tech"],

  moving: ["moving", "relocation", "abroad", "immigration", "country"],
  relocation: ["moving", "relocation", "abroad", "immigration", "country"],
  abroad: ["moving", "relocation", "abroad", "immigration", "country"],

  math: ["math", "mathematics", "school", "study", "homework"],
  school: ["school", "study", "homework", "student", "math"],
  study: ["school", "study", "homework", "student", "learning"],
};

export default async function ExpertsPage({ searchParams }: ExpertsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const requestId = resolvedSearchParams.requestId?.trim() ?? "";

  const helpRequest = requestId
    ? await prisma.helpRequest.findUnique({
        where: {
          id: requestId,
        },
        include: {
          category: true,
          subcategory: true,
        },
      })
    : null;

  const query = helpRequest?.query ?? resolvedSearchParams.q?.trim() ?? "";
  const verifiedOnly = resolvedSearchParams.verified === "true";

  const parsedMaxPrice = resolvedSearchParams.maxPrice
    ? Number(resolvedSearchParams.maxPrice)
    : null;

  const maxPrice =
    helpRequest?.budgetMaxCents ??
    (parsedMaxPrice && Number.isFinite(parsedMaxPrice) && parsedMaxPrice > 0
      ? parsedMaxPrice * 100
      : null);

  const language =
    helpRequest?.preferredLanguage?.trim().toLowerCase() ??
    resolvedSearchParams.language?.trim().toLowerCase() ??
    "";
  const categorySlug =
    helpRequest?.subcategory?.slug ??
    helpRequest?.category?.slug ??
    resolvedSearchParams.category?.trim().toLowerCase() ??
    "";
  const helpType = helpRequest?.helpType ?? parseHelpType(resolvedSearchParams.helpType);
  const urgency = helpRequest
    ? helpUrgencyToParam(helpRequest.urgency)
    : resolvedSearchParams.urgency?.trim().toLowerCase() ?? "";
  const sort =
    urgency === "today" ? "soonest" : (resolvedSearchParams.sort ?? "best");

  const requestedPage = Number(resolvedSearchParams.page ?? 1);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const now = new Date();

  const searchTerms = getSearchTerms(query);
  const hasSearch = searchTerms.length > 0;

  const textSearchOr = hasSearch
    ? searchTerms.flatMap((term) => [
        {
          headline: {
            contains: term,
            mode: "insensitive" as const,
          },
        },
        {
          bio: {
            contains: term,
            mode: "insensitive" as const,
          },
        },
        {
          country: {
            contains: term,
            mode: "insensitive" as const,
          },
        },
        {
          services: {
            some: {
              isActive: true,
              OR: [
                {
                  title: {
                    contains: term,
                    mode: "insensitive" as const,
                  },
                },
                {
                  description: {
                    contains: term,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          },
        },
      ])
    : [];

  const rawExperts = await prisma.expertProfile.findMany({
    where: {
      status: "APPROVED",

      stripeAccountId: {
        not: null,
      },
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeDetailsSubmitted: true,

      ...(verifiedOnly ? { isVerified: true } : {}),

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
          ...(helpType
            ? {
                helpType,
              }
            : {}),
          ...(categorySlug
            ? {
                OR: [
                  {
                    category: {
                      slug: categorySlug,
                    },
                  },
                  {
                    subcategory: {
                      slug: categorySlug,
                    },
                  },
                ],
              }
            : {}),
        },
      },

      availability: {
        some: {
          isActive: true,
          endTime: {
            gte: now,
          },
        },
      },

      ...(hasSearch
        ? {
            OR: [
              ...textSearchOr,
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
          ...(helpType
            ? {
                helpType,
              }
            : {}),
          ...(categorySlug
            ? {
                OR: [
                  {
                    category: {
                      slug: categorySlug,
                    },
                  },
                  {
                    subcategory: {
                      slug: categorySlug,
                    },
                  },
                ],
              }
            : {}),
        },
        include: {
          category: true,
          subcategory: true,
        },
        orderBy: {
          priceCents: "asc",
        },
        take: 2,
      },
      availability: {
        where: {
          isActive: true,
          endTime: {
            gte: now,
          },
        },
        orderBy: {
          startTime: "asc",
        },
        take: 8,
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
          problemSolved: true,
          createdAt: true,
        },
        take: MAX_CARD_REVIEWS,
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
    take: MAX_RAW_EXPERTS,
  });

  let experts = rawExperts
    .filter((expert) => {
      if (!language) {
        return true;
      }

      const normalizedLanguage = normalizeSearchTerm(language);

      return expert.languages.some((expertLanguage) => {
        const normalizedExpertLanguage = normalizeSearchTerm(expertLanguage);

        return (
          normalizedExpertLanguage === normalizedLanguage ||
          normalizedExpertLanguage.includes(normalizedLanguage)
        );
      });
    })
    .map((expert) => {
      const qualityScore = calculateQualityScore({
        rating: expert.rating,
        totalReviews: expert.totalReviews,
        totalSessions: expert.totalSessions,
        isVerified: expert.isVerified,
        openSlots: expert.availability.length,
        reviews: expert.reviews,
      });

      const keywordScore = calculateSearchScore({
        query,
        searchTerms,
        headline: expert.headline,
        bio: expert.bio,
        country: expert.country,
        skills: expert.skills,
        tags: expert.tags,
        languages: expert.languages,
        services: expert.services.map((service) => ({
          title: service.title,
          description: service.description,
          category: service.category?.name ?? "",
          subcategory: service.subcategory?.name ?? "",
          helpType: service.helpType ?? "",
          tags: service.tags,
        })),
      });

      const worldClassMatch = calculateWorldClassMatchScore({
        expert,
        problem: {
          query,
          categorySlug,
          helpType,
          preferredLanguage: language,
          budgetMaxCents: maxPrice,
          urgency,
        },
      });

      return {
        ...expert,
        qualityScore,
        searchScore: keywordScore + worldClassMatch.score,
        matchReasons: worldClassMatch.reasons,
      };
    });

  if (sort === "best") {
    experts = experts.sort((a, b) => {
      if (hasSearch && b.searchScore !== a.searchScore) {
        return b.searchScore - a.searchScore;
      }

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
  const totalMatchedExperts = experts.length;

  const totalPages = Math.max(
    Math.ceil(totalMatchedExperts / EXPERTS_PAGE_SIZE),
    1,
  );

  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * EXPERTS_PAGE_SIZE;
  const endIndex = startIndex + EXPERTS_PAGE_SIZE;

  const visibleExperts = experts.slice(startIndex, endIndex);

  const totalOpenTimes = experts.reduce(
    (sum, expert) => sum + expert.availability.length,
    0,
  );

  const verifiedCount = visibleExperts.filter(
    (expert) => expert.isVerified,
  ).length;

  const hasActiveFilters =
    Boolean(query) ||
    verifiedOnly ||
    Boolean(resolvedSearchParams.maxPrice) ||
    Boolean(language) ||
    Boolean(categorySlug) ||
    Boolean(helpType) ||
    Boolean(urgency) ||
    Boolean(requestId) ||
    sort !== "best";

  if (requestId && helpRequest?.status === HelpRequestStatus.OPEN && totalMatchedExperts > 0) {
    await prisma.helpRequest.updateMany({
      where: {
        id: requestId,
        status: HelpRequestStatus.OPEN,
      },
      data: {
        status: HelpRequestStatus.MATCHED,
      },
    });
  }

  await trackProductEvent({
    event: "EXPERTS_VIEWED",
    entityType: requestId ? "HelpRequest" : "ExpertsSearch",
    entityId: requestId || null,
    metadata: {
      q: query || null,
      category: categorySlug || null,
      helpType: helpType ?? null,
      language: language || null,
      maxPrice,
      sort,
      matchedExperts: totalMatchedExperts,
    },
  });

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />
        <div className="absolute left-[-180px] top-[-160px] h-[420px] w-[420px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute right-[-160px] top-[120px] h-[420px] w-[420px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

        <div className="relative container-page py-8 md:py-10 lg:py-14">
          <Badge variant="primary">
            <Search size={14} />
            Find help
          </Badge>

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_380px] xl:items-end">
            <div>
              <h1 className="heading-lg max-w-5xl text-balance">
                {helpRequest
                  ? "Best helpers for your saved problem."
                  : "Find the right person for the help you need."}
              </h1>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--muted-foreground)]">
                {helpRequest
                  ? `Problem: “${helpRequest.query}”`
                  : "Search with simple words or come from the guided intake. SkillDrop matches the problem with helpers, help types, categories, languages, price and availability."}
              </p>

              <div className="mt-5">
                <Link href="/help-me" className="btn btn-secondary">
                  Guided problem intake
                  <ArrowRight size={18} />
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Badge variant="success">
                  <CheckCircle2 size={14} />
                  Approved helpers
                </Badge>

                <Badge variant="primary">
                  <WalletCards size={14} />
                  Secure checkout
                </Badge>

                <Badge variant="accent">
                  <CalendarDays size={14} />
                  Real availability
                </Badge>
              </div>
            </div>

            <Card className="p-5">
              <Badge variant="accent">
                <Sparkles size={14} />
                Marketplace overview
              </Badge>

              <div className="mt-5 grid gap-3">
                <StatRow
                  label="Bookable helpers"
                  value={String(totalMatchedExperts)}
                />
                <StatRow label="Verified" value={String(verifiedCount)} />
                <StatRow label="Open times" value={String(totalOpenTimes)} />
                <StatRow
                  label="Request"
                  value={helpRequest ? "Saved problem" : "Direct search"}
                />
                <StatRow
                  label="Sort"
                  value={sortLabels[sort] ?? "Best match"}
                />
              </div>
            </Card>
          </div>

          <form action="/experts" className="mt-8">
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card-soft)] p-3 shadow-[var(--shadow-sm)] backdrop-blur">
              {requestId ? <input type="hidden" name="requestId" value={requestId} /> : null}

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex min-h-12 flex-1 items-center gap-3 rounded-2xl bg-[var(--background-soft)] px-4">
                  <Search
                    size={18}
                    className="text-[var(--muted-foreground)]"
                  />

                  <input
                    name="q"
                    type="search"
                    defaultValue={query}
                    placeholder="What do you need help with?"
                    className="min-h-12 flex-1 border-0 bg-transparent text-sm font-bold outline-none placeholder:text-[var(--muted-foreground)]"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  aria-label="Search helpers"
                >
                  Search
                  <ArrowRight size={18} />
                </button>

                {hasActiveFilters ? (
                  <Link href="/experts" className="btn btn-secondary">
                    Clear
                  </Link>
                ) : null}
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 text-sm font-black text-[var(--muted-foreground)]">
                  <input
                    type="checkbox"
                    name="verified"
                    value="true"
                    defaultChecked={verifiedOnly}
                  />
                  Verified
                </label>

                <select
                  name="maxPrice"
                  defaultValue={maxPrice ? String(Math.round(maxPrice / 100)) : ""}
                  className="min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 text-sm font-black text-[var(--muted-foreground)] outline-none"
                >
                  <option value="">Any service price</option>
                  <option value="20">Up to €20</option>
                  <option value="50">Up to €50</option>
                  <option value="100">Up to €100</option>
                </select>

                <input
                  type="text"
                  name="language"
                  defaultValue={language}
                  placeholder="Language"
                  className="min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 text-sm font-black text-[var(--muted-foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
                />

                <select
                  name="helpType"
                  defaultValue={helpType ?? ""}
                  className="min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 text-sm font-black text-[var(--muted-foreground)] outline-none"
                >
                  <option value="">Any help type</option>
                  <option value="ADVICE">Advice</option>
                  <option value="EXPLANATION">Explanation</option>
                  <option value="TEACHING">Teaching</option>
                  <option value="PRACTICAL_GUIDANCE">Practical guidance</option>
                  <option value="PERSONAL_EXPERIENCE">
                    Personal experience
                  </option>
                  <option value="EMOTIONAL_SUPPORT">Emotional support</option>
                  <option value="RELIGIOUS_DISCUSSION">
                    Religious discussion
                  </option>
                  <option value="BUSINESS_MENTORING">Business mentoring</option>
                </select>

                <select
                  name="sort"
                  defaultValue={sort}
                  className="min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 text-sm font-black text-[var(--muted-foreground)] outline-none"
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
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2 text-sm font-black text-[var(--muted-foreground)] transition hover:-translate-y-0.5 hover:bg-[var(--background-soft)] hover:text-[var(--primary-dark)] hover:shadow-[var(--shadow-sm)]"
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
                <Step
                  number="1"
                  title="Describe your problem"
                  text="Use natural words like CV, document, French, website or moving."
                />
                <Step
                  number="2"
                  title="Choose a helper"
                  text="Compare what they can help with, languages, reviews and price."
                />
                <Step
                  number="3"
                  title="Pick a time"
                  text="Choose one of the available short 1:1 call slots."
                />
                <Step
                  number="4"
                  title="Pay safely"
                  text="Confirm through checkout and receive your call details."
                />
              </div>
            </Card>

            <Card soft className="p-5">
              <Badge variant="accent">
                <Sparkles size={14} />
                Good search examples
              </Badge>

              <p className="mt-4 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                Try “French documents”, “CV review”, “mock interview”, “moving
                to France”, “website bug”, “translation”, “math help” or “admin
                letter”.
              </p>
            </Card>

            <Card className="p-5">
              <Badge variant="success">
                <CheckCircle2 size={14} />
                Trust signals
              </Badge>

              <div className="mt-5 grid gap-3">
                <TrustPoint text="Only approved helpers with active services and future availability are shown." />
                <TrustPoint text="Prices, call duration and available times are visible before booking." />
                <TrustPoint text="Reviews and completed sessions help you compare people." />
              </div>
            </Card>
          </aside>

          <div className="grid gap-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-3xl font-black tracking-[-0.05em]">
                  {query ? `Help for “${query}”` : "Available helpers"}
                </h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted-foreground)]">
                  Choose someone by what they can help with, language, price,
                  reviews, availability and trust signals.
                </p>
              </div>

              <Badge>
                {visibleExperts.length} shown / {totalMatchedExperts} found
              </Badge>
            </div>

            {visibleExperts.length > 0 ? (
              <>
                <div className="grid gap-5">
                  {visibleExperts.map((expert) => (
                    <ExpertSearchCard key={expert.id} expert={expert} requestId={requestId} />
                  ))}
                </div>
                {totalMatchedExperts > EXPERTS_PAGE_SIZE ? (
                  <PaginationControls
                    page={safePage}
                    totalPages={totalPages}
                    query={query}
                    verifiedOnly={verifiedOnly}
                    maxPrice={maxPrice ? String(Math.round(maxPrice / 100)) : ""}
                    language={language}
                    sort={sort}
                    requestId={requestId}
                    category={categorySlug}
                    helpType={helpType ?? ""}
                  />
                ) : null}
              </>
            ) : (
              <EmptyState
                title="No helpers found"
                text="Try another keyword, remove filters, or check back later when more helpers open bookable time slots."
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function PaginationControls({
  page,
  totalPages,
  query,
  verifiedOnly,
  maxPrice,
  language,
  sort,
  requestId,
  category,
  helpType,
}: {
  page: number;
  totalPages: number;
  query: string;
  verifiedOnly: boolean;
  maxPrice: string;
  language: string;
  sort: string;
  requestId: string;
  category: string;
  helpType: string;
}) {
  const previousPage = Math.max(page - 1, 1);
  const nextPage = Math.min(page + 1, totalPages);

  return (
    <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 sm:flex-row">
      <p className="text-sm font-bold text-[var(--muted-foreground)]">
        Page {page} of {totalPages}
      </p>

      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={buildExpertsPageHref({
              page: previousPage,
              query,
              verifiedOnly,
              maxPrice,
              language,
              sort,
              requestId,
              category,
              helpType,
            })}
            className="btn btn-secondary"
          >
            Previous
          </Link>
        ) : null}

        {page < totalPages ? (
          <Link
            href={buildExpertsPageHref({
              page: nextPage,
              query,
              verifiedOnly,
              maxPrice,
              language,
              sort,
              requestId,
              category,
              helpType,
            })}
            className="btn btn-primary"
          >
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function buildExpertsPageHref({
  page,
  query,
  verifiedOnly,
  maxPrice,
  language,
  sort,
  requestId,
  category,
  helpType,
}: {
  page: number;
  query: string;
  verifiedOnly: boolean;
  maxPrice: string;
  language: string;
  sort: string;
  requestId: string;
  category: string;
  helpType: string;
}) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  if (requestId) {
    params.set("requestId", requestId);
  }

  if (verifiedOnly) {
    params.set("verified", "true");
  }

  if (maxPrice) {
    params.set("maxPrice", maxPrice);
  }

  if (language) {
    params.set("language", language);
  }

  if (category) {
    params.set("category", category);
  }

  if (helpType) {
    params.set("helpType", helpType);
  }

  if (sort && sort !== "best") {
    params.set("sort", sort);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();

  return queryString ? `/experts?${queryString}` : "/experts";
}

function ExpertSearchCard({
  expert,
  requestId,
}: {
  expert: {
    id: string;
    stripeAccountId: string | null;
    stripeChargesEnabled: boolean;
    stripePayoutsEnabled: boolean;
    stripeDetailsSubmitted: boolean;
    headline: string;
    bio: string;
    country: string | null;
    languages: string[];
    skills: string[];
    tags: string[];
    rating: number;
    qualityScore: number;
    searchScore: number;
    matchReasons?: string[];
    totalReviews: number;
    totalSessions: number;
    isVerified: boolean;
    user: {
      name: string | null;
      email: string;
      avatarUrl: string | null;
    };
    services: {
      id: string;
      title: string;
      description: string;
      priceCents: number;
      durationMinutes: number;
      category: {
        name: string;
        slug?: string | null;
      } | null;
      subcategory?: {
        name: string;
        slug?: string | null;
      } | null;
      helpType?: string | null;
      tags?: string[];
    }[];
    availability: {
      id: string;
      startTime: Date;
      endTime: Date;
      isActive: boolean;
    }[];
    reviews: {
      rating: number;
      helpfulness: number | null;
      clarity: number | null;
      professionalism: number | null;
      wouldRecommend: boolean | null;
      problemSolved: string | null;
      createdAt: Date;
    }[];
  };
  requestId: string;
}) {
  const startingPrice = expert.services[0]?.priceCents ?? null;
  const nextSlot = expert.availability[0] ?? null;
  const displayName = expert.user.name || expert.user.email;
  const avatarLetter = (
    expert.user.name?.charAt(0) ||
    expert.user.email.charAt(0) ||
    "H"
  ).toUpperCase();

  const startingTotal = startingPrice
    ? calculatePricingBreakdown(startingPrice).clientTotalCents
    : null;

  const visibleTags = Array.from(
    new Set([...expert.tags, ...expert.skills]),
  ).slice(0, 8);

  const mainService = expert.services[0] ?? null;

  const solvedReviews = expert.reviews.filter(
    (review) => review.problemSolved === "YES",
  ).length;

  const partiallySolvedReviews = expert.reviews.filter(
    (review) => review.problemSolved === "PARTIALLY",
  ).length;

  const notSolvedReviews = expert.reviews.filter(
    (review) => review.problemSolved === "NO",
  ).length;

  const problemOutcomeTotal =
    solvedReviews + partiallySolvedReviews + notSolvedReviews;

  const problemSolvedRate =
    problemOutcomeTotal > 0
      ? Math.round((solvedReviews / problemOutcomeTotal) * 100)
      : null;

  const profileHref = buildExpertProfileHref({
    expertId: expert.id,
    serviceId: mainService?.id ?? "",
    requestId,
  });

  const ratingLabel =
    expert.totalReviews > 0 ? expert.rating.toFixed(1) : "New";

  const publicTrustLabel = getPublicTrustLabel({
    isVerified: expert.isVerified,
    totalSessions: expert.totalSessions,
    totalReviews: expert.totalReviews,
    qualityScore: expert.qualityScore,
    searchScore: expert.searchScore,
  });

  const matchReasons = getMatchReasons({
    expert,
    mainService,
    nextSlot,
    problemSolvedRate,
  });
  const visibleMatchReasons = Array.from(
    new Set([...(expert.matchReasons ?? []), ...matchReasons]),
  ).slice(0, 6);

  return (
    <Link href={profileHref} className="group">
      <Card className="p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-md)]">
        <div className="grid gap-5 lg:grid-cols-[1fr_240px] lg:items-start">
          <div className="flex gap-4">
            <AvatarPreview
              avatarUrl={expert.user.avatarUrl}
              name={displayName}
              fallbackLetter={avatarLetter}
            />

            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                {expert.isVerified ? (
                  <Badge variant="success">
                    <BadgeCheck size={14} />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="accent">New helper</Badge>
                )}

                <Badge variant="primary">
                  <CalendarDays size={14} />
                  Bookable
                </Badge>

                <Badge variant={publicTrustLabel.variant}>
                  <Sparkles size={14} />
                  {publicTrustLabel.label}
                </Badge>

                {expert.country ? (
                  <Badge>
                    <Globe2 size={14} />
                    {expert.country}
                  </Badge>
                ) : null}

                <Badge>
                  <Star size={14} />
                  {ratingLabel}
                </Badge>

                {problemSolvedRate !== null ? (
                  <Badge
                    variant={problemSolvedRate >= 70 ? "success" : "accent"}
                  >
                    <Target size={14} />
                    {problemSolvedRate}% solved
                  </Badge>
                ) : null}
              </div>

              <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                {displayName}
              </h3>

              <p className="mt-2 text-lg font-black tracking-[-0.03em]">
                {expert.headline || "Practical help through short calls"}
              </p>

              <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                {expert.bio || "This helper has not added a bio yet."}
              </p>

              {mainService ? (
                <div className="mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                    Can help with
                  </p>

                  <p className="mt-2 text-sm font-black leading-6">
                    {mainService.title}
                  </p>

                  <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-[var(--muted-foreground)]">
                    {mainService.description}
                  </p>
                </div>
              ) : null}

              {visibleMatchReasons.length > 0 ? (
                <div className="mt-4 rounded-[22px] border border-[var(--primary)]/15 bg-[var(--primary-soft)] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--primary-dark)]">
                    Why this helper matches
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {visibleMatchReasons.map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-black text-[var(--primary-dark)]"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {expert.languages.slice(0, 3).map((expertLanguage) => (
                  <Badge key={expertLanguage}>
                    <Languages size={14} />
                    {expertLanguage}
                  </Badge>
                ))}

                {visibleTags.map((tag) => (
                  <HashTag key={tag} text={tag} />
                ))}

                {visibleTags.length === 0 ? (
                  <span className="text-sm font-medium text-[var(--muted-foreground)]">
                    No tags added yet.
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
            <div className="grid gap-3">
              <SideRow
                label="From"
                value={startingTotal ? formatMoney(startingTotal) : "—"}
              />

              <SideRow
                label="Next time"
                value={nextSlot ? formatShortDateTime(nextSlot.startTime) : "—"}
              />

              <SideRow label="Rating" value={ratingLabel} />

              <SideRow
                label="Solved"
                value={
                  problemSolvedRate !== null ? `${problemSolvedRate}%` : "—"
                }
              />

              <SideRow label="Sessions" value={String(expert.totalSessions)} />
            </div>

            <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--primary)] bg-[var(--primary)] px-4 py-3 text-sm font-bold text-white transition group-hover:shadow-[0_12px_28px_rgba(139,92,246,0.26)]">
              View profile
              <ArrowRight size={16} />
            </div>
          </div>
        </div>

        {expert.services.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {expert.services.map((service) => {
              const pricing = calculatePricingBreakdown(service.priceCents);

              return (
                <div
                  key={service.id}
                  className="rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{service.category?.name ?? "Service"}</Badge>

                        <Badge>
                          <Clock3 size={14} />
                          {service.durationMinutes} min
                        </Badge>
                      </div>

                      <p className="mt-3 font-bold tracking-[-0.02em] text-[var(--foreground)]">
                        {service.title}
                      </p>

                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-[var(--muted-foreground)]">
                        {service.description}
                      </p>
                    </div>

                    <Badge variant="primary">
                      {formatMoney(pricing.clientTotalCents)}
                    </Badge>
                  </div>

                  <p className="mt-3 text-xs font-medium text-[var(--muted-foreground)]">
                    Total shown before checkout. Service price:{" "}
                    {formatMoney(pricing.servicePriceCents)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}
      </Card>
    </Link>
  );
}

function buildExpertProfileHref({
  expertId,
  serviceId,
  requestId,
}: {
  expertId: string;
  serviceId: string;
  requestId: string;
}) {
  const params = new URLSearchParams();

  if (serviceId) {
    params.set("service", serviceId);
  }

  if (requestId) {
    params.set("requestId", requestId);
  }

  const queryString = params.toString();

  return queryString ? `/experts/${expertId}?${queryString}` : `/experts/${expertId}`;
}

function getMatchReasons({
  expert,
  mainService,
  nextSlot,
  problemSolvedRate,
}: {
  expert: {
    isVerified: boolean;
    languages: string[];
    searchScore: number;
    qualityScore: number;
    totalSessions: number;
  };
  mainService: {
    durationMinutes: number;
    category: {
      name: string;
    } | null;
  } | null;
  nextSlot: {
    startTime: Date;
  } | null;
  problemSolvedRate: number | null;
}) {
  const reasons: string[] = [];

  if (expert.searchScore >= 20) {
    reasons.push("Strong topic match");
  }

  if (mainService?.category?.name) {
    reasons.push(mainService.category.name);
  }

  if (expert.languages.length > 0) {
    reasons.push(`Speaks ${expert.languages.slice(0, 2).join(" / ")}`);
  }

  if (nextSlot) {
    reasons.push("Has upcoming availability");
  }

  if (expert.isVerified) {
    reasons.push("Verified helper");
  }

  if (problemSolvedRate !== null && problemSolvedRate >= 70) {
    reasons.push(`${problemSolvedRate}% solved outcomes`);
  }

  if (expert.totalSessions >= 5) {
    reasons.push("Experienced on platform");
  }

  if (mainService) {
    reasons.push(`${mainService.durationMinutes} min call`);
  }

  return Array.from(new Set(reasons)).slice(0, 5);
}

function AvatarPreview({
  avatarUrl,
  name,
  fallbackLetter,
}: {
  avatarUrl: string | null;
  name: string;
  fallbackLetter: string;
}) {
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-2xl font-black text-white shadow-sm">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        fallbackLetter
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3">
      <p className="text-sm font-medium text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="text-sm font-bold text-[var(--foreground)]">{value}</p>
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
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-sm font-bold text-[var(--primary-dark)]">
        {number}
      </div>

      <div>
        <p className="font-bold tracking-[-0.02em] text-[var(--foreground)]">
          {title}
        </p>

        <p className="mt-1 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
          {text}
        </p>
      </div>
    </div>
  );
}

function TrustPoint({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <CheckCircle2
        size={17}
        className="mt-0.5 shrink-0 text-[var(--success)]"
      />

      <p className="text-sm font-medium leading-6 text-[var(--muted-foreground)]">
        {text}
      </p>
    </div>
  );
}

function HashTag({ text }: { text: string }) {
  return (
    <span className="rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1 text-xs font-bold text-[var(--muted-foreground)]">
      #{text}
    </span>
  );
}

function SideRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm font-medium text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="text-right text-sm font-bold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <UserRound size={24} />
      </div>

      <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
        {title}
      </h3>

      <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[var(--muted-foreground)]">
        {text}
      </p>

      <div className="mt-5">
        <Link href="/experts" className="btn btn-secondary">
          Clear filters
        </Link>
      </div>
    </Card>
  );
}

function getSearchTerms(query: string) {
  const baseTerms = query
    .toLowerCase()
    .split(/[,\s]+/)
    .map((term) => normalizeSearchTerm(term))
    .filter((term) => term.length >= 2);

  const normalizedQuery = normalizeSearchTerm(query.toLowerCase());

  const expandedTerms = baseTerms.flatMap((term) => [
    term,
    ...(synonymMap[term] ?? []),
  ]);

  return Array.from(
    new Set([...baseTerms, ...expandedTerms, normalizedQuery].filter(Boolean)),
  );
}

function normalizeSearchTerm(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, " ");
}

function calculateSearchScore({
  query,
  searchTerms,
  headline,
  bio,
  country,
  skills,
  tags,
  languages,
  services,
}: {
  query: string;
  searchTerms: string[];
  headline: string;
  bio: string;
  country: string | null;
  skills: string[];
  tags: string[];
  languages: string[];
  services: {
    title: string;
    description: string;
    category: string;
    subcategory?: string;
    helpType?: string;
    tags?: string[];
  }[];
}) {
  if (!query || searchTerms.length === 0) {
    return 0;
  }

  const normalizedHeadline = normalizeSearchTerm(headline);
  const normalizedBio = normalizeSearchTerm(bio);
  const normalizedCountry = normalizeSearchTerm(country ?? "");

  const normalizedSkills = skills.map(normalizeSearchTerm);
  const normalizedTags = tags.map(normalizeSearchTerm);
  const normalizedLanguages = languages.map(normalizeSearchTerm);

  const normalizedServices = services.map((service) => ({
    title: normalizeSearchTerm(service.title),
    description: normalizeSearchTerm(service.description),
    category: normalizeSearchTerm(service.category),
    subcategory: normalizeSearchTerm(service.subcategory ?? ""),
    helpType: normalizeSearchTerm(service.helpType ?? ""),
    tags: (service.tags ?? []).map(normalizeSearchTerm),
  }));

  let score = 0;

  for (const term of searchTerms) {
    if (!term) {
      continue;
    }

    if (normalizedHeadline.includes(term)) {
      score += 18;
    }

    if (normalizedBio.includes(term)) {
      score += 10;
    }

    if (normalizedCountry.includes(term)) {
      score += 6;
    }

    if (
      normalizedSkills.some((skill) => skill === term || skill.includes(term))
    ) {
      score += 18;
    }

    if (normalizedTags.some((tag) => tag === term || tag.includes(term))) {
      score += 22;
    }

    if (
      normalizedLanguages.some((item) => item === term || item.includes(term))
    ) {
      score += 12;
    }

    for (const service of normalizedServices) {
      if (service.title.includes(term)) {
        score += 24;
      }

      if (service.description.includes(term)) {
        score += 14;
      }

      if (service.category.includes(term)) {
        score += 8;
      }

      if (service.subcategory.includes(term)) {
        score += 10;
      }

      if (service.helpType.includes(term)) {
        score += 6;
      }

      if (service.tags.some((tag) => tag === term || tag.includes(term))) {
        score += 12;
      }
    }
  }

  return score;
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
    problemSolved?: string | null;
    createdAt: Date;
  }[];
}) {
  const ratingScore = totalReviews > 0 ? clamp((rating / 5) * 30, 0, 30) : 8;

  const helpfulnessAvg = averageNullable(
    reviews.map((review) => review.helpfulness),
  );

  const clarityAvg = averageNullable(reviews.map((review) => review.clarity));

  const professionalismAvg = averageNullable(
    reviews.map((review) => review.professionalism),
  );

  const detailedReviewScore =
    helpfulnessAvg || clarityAvg || professionalismAvg
      ? clamp(
          (((helpfulnessAvg ?? rating) +
            (clarityAvg ?? rating) +
            (professionalismAvg ?? rating)) /
            3 /
            5) *
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

function getPublicTrustLabel({
  isVerified,
  totalSessions,
  totalReviews,
  qualityScore,
  searchScore,
}: {
  isVerified: boolean;
  totalSessions: number;
  totalReviews: number;
  qualityScore: number;
  searchScore: number;
}) {
  if (searchScore > 0) {
    return {
      label: "Good match",
      variant: "primary" as const,
    };
  }

  if (isVerified) {
    return {
      label: "Verified helper",
      variant: "success" as const,
    };
  }

  if (totalSessions >= 10 || totalReviews >= 5 || qualityScore >= 80) {
    return {
      label: "Experienced",
      variant: "success" as const,
    };
  }

  return {
    label: "Available now",
    variant: "primary" as const,
  };
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
  return formatMoneyFromCents(cents);
}

function formatShortDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
