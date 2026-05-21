import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  ArrowLeft,
  AlertTriangle,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type AdminReviewsPageProps = {
  searchParams?: Promise<{
    q?: string;
    rating?: string;
    bad?: string;
    recommend?: string;
    problem?: string;
  }>;
};

export default async function AdminReviewsPage({
  searchParams,
}: AdminReviewsPageProps) {
  await requireRole(["admin"]);

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const query = resolvedSearchParams.q?.trim() ?? "";
  const ratingFilter = resolvedSearchParams.rating ?? "all";
  const badOnly = resolvedSearchParams.bad === "true";
  const recommendFilter = resolvedSearchParams.recommend ?? "all";
  const problemFilter = resolvedSearchParams.problem ?? "all";

  const filters: Prisma.ReviewWhereInput[] = [];

  if (ratingFilter !== "all") {
    const parsedRating = Number(ratingFilter);

    if (Number.isFinite(parsedRating) && parsedRating >= 1 && parsedRating <= 5) {
      filters.push({
        rating: parsedRating,
      });
    }
  }

  if (badOnly) {
    filters.push({
      OR: [
        {
          rating: {
            lte: 2,
          },
        },
        {
          wouldRecommend: false,
        },
        {
          problemSolved: "NO",
        },
        {
          helpfulness: {
            lte: 2,
          },
        },
        {
          clarity: {
            lte: 2,
          },
        },
        {
          professionalism: {
            lte: 2,
          },
        },
      ],
    });
  }

  if (recommendFilter !== "all") {
    filters.push({
      wouldRecommend: recommendFilter === "yes",
    });
  }

  if (problemFilter !== "all") {
    filters.push({
      problemSolved: problemFilter,
    });
  }

  if (query) {
    filters.push({
      OR: [
        {
          comment: {
            contains: query,
            mode: "insensitive" as const,
          },
        },
        {
          buyer: {
            is: {
              OR: [
                {
                  name: {
                    contains: query,
                    mode: "insensitive" as const,
                  },
                },
                {
                  email: {
                    contains: query,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          },
        },
        {
          expert: {
            is: {
              user: {
                is: {
                  OR: [
                    {
                      name: {
                        contains: query,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      email: {
                        contains: query,
                        mode: "insensitive" as const,
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          booking: {
            is: {
              service: {
                is: {
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
          },
        },
      ],
    });
  }

  const reviewWhere: Prisma.ReviewWhereInput =
    filters.length > 0
      ? {
          AND: filters,
        }
      : {};

  const [
    reviews,
    totalReviews,
    lowReviews,
    recommendedReviews,
    notRecommendedReviews,
    solvedReviews,
    partiallySolvedReviews,
    notSolvedReviews,
    averageRatingResult,
  ] = await Promise.all([
    prisma.review.findMany({
      where: reviewWhere,
      include: {
        buyer: true,
        expert: {
          include: {
            user: true,
          },
        },
        booking: {
          include: {
            service: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 120,
    }),

    prisma.review.count(),

    prisma.review.count({
      where: {
        OR: [
          {
            rating: {
              lte: 2,
            },
          },
          {
            wouldRecommend: false,
          },
          {
            problemSolved: "NO",
          },
          {
            helpfulness: {
              lte: 2,
            },
          },
          {
            clarity: {
              lte: 2,
            },
          },
          {
            professionalism: {
              lte: 2,
            },
          },
        ],
      },
    }),

    prisma.review.count({
      where: {
        wouldRecommend: true,
      },
    }),

    prisma.review.count({
      where: {
        wouldRecommend: false,
      },
    }),

    prisma.review.count({
      where: {
        problemSolved: "YES",
      },
    }),

    prisma.review.count({
      where: {
        problemSolved: "PARTIALLY",
      },
    }),

    prisma.review.count({
      where: {
        problemSolved: "NO",
      },
    }),

    prisma.review.aggregate({
      _avg: {
        rating: true,
      },
    }),
  ]);

  const averageRating = averageRatingResult._avg.rating ?? 0;

  const shownQualityIssues = reviews.filter((review) =>
    hasReviewQualityIssue(review),
  ).length;

  const shownRecommended = reviews.filter(
    (review) => review.wouldRecommend === true,
  ).length;

  const shownNotRecommended = reviews.filter(
    (review) => review.wouldRecommend === false,
  ).length;

  const shownSolved = reviews.filter(
    (review) => review.problemSolved === "YES",
  ).length;

  const shownPartiallySolved = reviews.filter(
    (review) => review.problemSolved === "PARTIALLY",
  ).length;

  const shownNotSolved = reviews.filter(
    (review) => review.problemSolved === "NO",
  ).length;

  const problemSolvedTotal =
    solvedReviews + partiallySolvedReviews + notSolvedReviews;

  const problemSolvedRate =
    problemSolvedTotal > 0
      ? Math.round((solvedReviews / problemSolvedTotal) * 100)
      : null;

  const hasActiveFilters =
    query ||
    ratingFilter !== "all" ||
    badOnly ||
    recommendFilter !== "all" ||
    problemFilter !== "all";

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative container-page py-8 md:py-10 lg:py-14">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to admin
          </Link>

          <Badge variant="primary" className="mt-8">
            <MessageCircle size={14} />
            Review moderation
          </Badge>

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
            <div>
              <h1 className="heading-lg max-w-4xl text-balance">
                Monitor marketplace feedback.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Track review quality, low ratings, recommendation signals,
                problem outcomes and trust issues across SkillDrop.
              </p>
            </div>

            <Card className="p-5">
              <Badge variant="accent">
                <ShieldCheck size={14} />
                Current view
              </Badge>

              <div className="mt-5 grid gap-3">
                <SummaryRow label="Shown reviews" value={String(reviews.length)} />
                <SummaryRow
                  label="Shown quality issues"
                  value={String(shownQualityIssues)}
                />
                <SummaryRow
                  label="Shown recommended"
                  value={String(shownRecommended)}
                />
                <SummaryRow
                  label="Shown not recommended"
                  value={String(shownNotRecommended)}
                />
                <SummaryRow label="Shown solved" value={String(shownSolved)} />
                <SummaryRow
                  label="Shown partially solved"
                  value={String(shownPartiallySolved)}
                />
                <SummaryRow
                  label="Shown not solved"
                  value={String(shownNotSolved)}
                />
              </div>
            </Card>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <AdminMiniStat label="Reviews" value={String(totalReviews)} />
            <AdminMiniStat
              label="Average"
              value={averageRating ? averageRating.toFixed(1) : "—"}
            />
            <AdminMiniStat label="Quality issues" value={String(lowReviews)} />
            <AdminMiniStat
              label="Recommended"
              value={String(recommendedReviews)}
            />
            <AdminMiniStat
              label="Not recommended"
              value={String(notRecommendedReviews)}
            />
            <AdminMiniStat
              label="Solved rate"
              value={problemSolvedRate !== null ? `${problemSolvedRate}%` : "—"}
            />
          </div>

          <form action="/admin/reviews" className="mt-6">
            <div className="grid gap-3 rounded-[28px] border border-[var(--border)] bg-white/64 p-3 shadow-[var(--shadow-sm)] xl:grid-cols-[1fr_160px_180px_180px_auto_auto] xl:items-center">
              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                />

                <input
                  name="q"
                  type="search"
                  defaultValue={query}
                  placeholder="Search buyer, expert, service or review comment..."
                  className="input min-h-12 w-full pl-11"
                />
              </div>

              <select
                name="rating"
                defaultValue={ratingFilter}
                className="input min-h-12"
              >
                <option value="all">All ratings</option>
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>

              <select
                name="recommend"
                defaultValue={recommendFilter}
                className="input min-h-12"
              >
                <option value="all">All recommendations</option>
                <option value="yes">Recommended</option>
                <option value="no">Not recommended</option>
              </select>

              <select
                name="problem"
                defaultValue={problemFilter}
                className="input min-h-12"
              >
                <option value="all">All outcomes</option>
                <option value="YES">Problem solved</option>
                <option value="PARTIALLY">Partially solved</option>
                <option value="NO">Not solved</option>
              </select>

              <label className="flex min-h-12 items-center gap-2 rounded-full border border-[var(--border)] bg-white/64 px-4 text-sm font-black text-[var(--muted-foreground)]">
                <input
                  type="checkbox"
                  name="bad"
                  value="true"
                  defaultChecked={badOnly}
                />
                Issues only
              </label>

              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">
                  Search
                </button>

                {hasActiveFilters ? (
                  <Link href="/admin/reviews" className="btn btn-secondary">
                    Clear
                  </Link>
                ) : null}
              </div>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            <FilterLink
              q={query}
              rating="all"
              bad={false}
              recommend={recommendFilter}
              problem={problemFilter}
              currentRating={ratingFilter}
              currentBad={badOnly}
              label="All"
            />
            <FilterLink
              q={query}
              rating="5"
              bad={false}
              recommend={recommendFilter}
              problem={problemFilter}
              currentRating={ratingFilter}
              currentBad={badOnly}
              label="5 stars"
            />
            <FilterLink
              q={query}
              rating="4"
              bad={false}
              recommend={recommendFilter}
              problem={problemFilter}
              currentRating={ratingFilter}
              currentBad={badOnly}
              label="4 stars"
            />
            <FilterLink
              q={query}
              rating="3"
              bad={false}
              recommend={recommendFilter}
              problem={problemFilter}
              currentRating={ratingFilter}
              currentBad={badOnly}
              label="3 stars"
            />
            <FilterLink
              q={query}
              rating="2"
              bad={false}
              recommend={recommendFilter}
              problem={problemFilter}
              currentRating={ratingFilter}
              currentBad={badOnly}
              label="2 stars"
            />
            <FilterLink
              q={query}
              rating="1"
              bad={false}
              recommend={recommendFilter}
              problem={problemFilter}
              currentRating={ratingFilter}
              currentBad={badOnly}
              label="1 star"
            />
            <FilterLink
              q={query}
              rating="all"
              bad
              recommend={recommendFilter}
              problem={problemFilter}
              currentRating={ratingFilter}
              currentBad={badOnly}
              label="Quality issues"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <RecommendFilterLink
              q={query}
              rating={ratingFilter}
              bad={badOnly}
              problem={problemFilter}
              value="all"
              current={recommendFilter}
              label="All recommendations"
            />
            <RecommendFilterLink
              q={query}
              rating={ratingFilter}
              bad={badOnly}
              problem={problemFilter}
              value="yes"
              current={recommendFilter}
              label="Recommended"
            />
            <RecommendFilterLink
              q={query}
              rating={ratingFilter}
              bad={badOnly}
              problem={problemFilter}
              value="no"
              current={recommendFilter}
              label="Not recommended"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <ProblemFilterLink
              q={query}
              rating={ratingFilter}
              bad={badOnly}
              recommend={recommendFilter}
              value="all"
              current={problemFilter}
              label="All outcomes"
            />
            <ProblemFilterLink
              q={query}
              rating={ratingFilter}
              bad={badOnly}
              recommend={recommendFilter}
              value="YES"
              current={problemFilter}
              label="Problem solved"
            />
            <ProblemFilterLink
              q={query}
              rating={ratingFilter}
              bad={badOnly}
              recommend={recommendFilter}
              value="PARTIALLY"
              current={problemFilter}
              label="Partially solved"
            />
            <ProblemFilterLink
              q={query}
              rating={ratingFilter}
              bad={badOnly}
              recommend={recommendFilter}
              value="NO"
              current={problemFilter}
              label="Not solved"
            />
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge>Search: {query || "none"}</Badge>
          <Badge>Rating: {ratingFilter}</Badge>
          <Badge>Quality issues: {badOnly ? "yes" : "no"}</Badge>
          <Badge>Recommend: {recommendFilter}</Badge>
          <Badge>Outcome: {problemFilter}</Badge>
          <Badge>{reviews.length} shown</Badge>
        </div>

        <div className="grid gap-5">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <ReviewAdminCard key={review.id} review={review} />
            ))
          ) : (
            <Card className="p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                <MessageCircle size={24} />
              </div>

              <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
                No reviews found
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-muted">
                Try another search query, rating, recommendation or outcome
                filter.
              </p>

              <div className="mt-5">
                <Link href="/admin/reviews" className="btn btn-secondary">
                  Clear filters
                </Link>
              </div>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}

function ReviewAdminCard({
  review,
}: {
  review: {
    id: string;
    rating: number;
    helpfulness: number | null;
    clarity: number | null;
    professionalism: number | null;
    wouldRecommend: boolean | null;
    problemSolved: string | null;
    comment: string | null;
    createdAt: Date;
    buyer: {
      email: string;
      name: string | null;
    };
    expert: {
      id: string;
      user: {
        email: string;
        name: string | null;
      };
    };
    booking: {
      id: string;
      status: string;
      service: {
        title: string;
      };
    };
  };
}) {
  const hasQualityIssue = hasReviewQualityIssue(review);

  return (
    <Card className="p-5 md:p-6 hover-lift">
      <div className="grid gap-5 xl:grid-cols-[1fr_260px] xl:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={review.rating <= 2 ? "danger" : "success"}>
              <Star size={14} />
              {review.rating}/5
            </Badge>

            {review.wouldRecommend === true ? (
              <Badge variant="primary">
                <ThumbsUp size={14} />
                Recommended
              </Badge>
            ) : null}

            {review.wouldRecommend === false ? (
              <Badge variant="danger">
                <ThumbsDown size={14} />
                Not recommended
              </Badge>
            ) : null}

            <Badge variant={getProblemSolvedBadgeVariant(review.problemSolved)}>
              {formatProblemSolved(review.problemSolved)}
            </Badge>

            {hasQualityIssue ? (
              <Badge variant="danger">
                <AlertTriangle size={14} />
                Quality issue
              </Badge>
            ) : null}

            <Badge>{formatShortDate(review.createdAt)}</Badge>
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
            {review.booking.service.title}
          </h2>

          {hasQualityIssue ? (
            <div className="mt-4 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-black leading-6 text-[var(--danger)]">
              This review has a quality risk signal. Check the booking, expert
              history and possible dispute or refund context.
            </div>
          ) : null}

          <p className="mt-4 text-sm font-semibold leading-6 text-muted">
            {review.comment || "No comment left."}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <ScoreRow label="Helpfulness" value={review.helpfulness} />
            <ScoreRow label="Clarity" value={review.clarity} />
            <ScoreRow
              label="Professionalism"
              value={review.professionalism}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SmallFact
              icon={UserRound}
              label="Buyer"
              value={review.buyer.name ?? review.buyer.email}
              title={review.buyer.email}
            />
            <SmallFact
              icon={ShieldCheck}
              label="Expert"
              value={review.expert.user.name ?? review.expert.user.email}
              title={review.expert.user.email}
            />
            <SmallFact
              icon={MessageCircle}
              label="Booking"
              value={review.booking.status}
            />
          </div>
        </div>

        <div className="grid gap-3 rounded-[24px] border border-[var(--border)] bg-white/64 p-4">
          <Link href={`/experts/${review.expert.id}`} className="btn btn-secondary">
            View expert
          </Link>

          <Link
            href={`/admin/bookings?q=${encodeURIComponent(review.booking.id)}`}
            className="btn btn-secondary"
          >
            Find booking
          </Link>

          <Link
            href={`/admin/experts?q=${encodeURIComponent(
              review.expert.user.email,
            )}`}
            className="btn btn-secondary"
          >
            Manage expert
          </Link>

          <Link
            href={`/admin/users?q=${encodeURIComponent(review.buyer.email)}`}
            className="btn btn-secondary"
          >
            Find buyer
          </Link>
        </div>
      </div>
    </Card>
  );
}

function FilterLink({
  q,
  rating,
  bad,
  recommend,
  problem,
  currentRating,
  currentBad,
  label,
}: {
  q: string;
  rating: string;
  bad: boolean;
  recommend: string;
  problem: string;
  currentRating: string;
  currentBad: boolean;
  label: string;
}) {
  const isActive = currentRating === rating && currentBad === bad;

  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (rating !== "all") {
    params.set("rating", rating);
  }

  if (bad) {
    params.set("bad", "true");
  }

  if (recommend !== "all") {
    params.set("recommend", recommend);
  }

  if (problem !== "all") {
    params.set("problem", problem);
  }

  const href = params.toString()
    ? `/admin/reviews?${params.toString()}`
    : "/admin/reviews";

  return (
    <Link
      href={href}
      className={
        isActive
          ? "rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-black text-[var(--background)]"
          : "hover-scale rounded-full border border-[var(--border)] bg-white/64 px-4 py-2 text-sm font-black text-[var(--muted-foreground)] hover:bg-white hover:text-[var(--primary-dark)]"
      }
    >
      {label}
    </Link>
  );
}

function RecommendFilterLink({
  q,
  rating,
  bad,
  problem,
  value,
  current,
  label,
}: {
  q: string;
  rating: string;
  bad: boolean;
  problem: string;
  value: string;
  current: string;
  label: string;
}) {
  const isActive = current === value;

  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (rating !== "all") {
    params.set("rating", rating);
  }

  if (bad) {
    params.set("bad", "true");
  }

  if (problem !== "all") {
    params.set("problem", problem);
  }

  if (value !== "all") {
    params.set("recommend", value);
  }

  const href = params.toString()
    ? `/admin/reviews?${params.toString()}`
    : "/admin/reviews";

  return (
    <Link
      href={href}
      className={
        isActive
          ? "rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-black text-[var(--background)]"
          : "hover-scale rounded-full border border-[var(--border)] bg-white/64 px-4 py-2 text-sm font-black text-[var(--muted-foreground)] hover:bg-white hover:text-[var(--primary-dark)]"
      }
    >
      {label}
    </Link>
  );
}

function ProblemFilterLink({
  q,
  rating,
  bad,
  recommend,
  value,
  current,
  label,
}: {
  q: string;
  rating: string;
  bad: boolean;
  recommend: string;
  value: string;
  current: string;
  label: string;
}) {
  const isActive = current === value;

  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (rating !== "all") {
    params.set("rating", rating);
  }

  if (bad) {
    params.set("bad", "true");
  }

  if (recommend !== "all") {
    params.set("recommend", recommend);
  }

  if (value !== "all") {
    params.set("problem", value);
  }

  const href = params.toString()
    ? `/admin/reviews?${params.toString()}`
    : "/admin/reviews";

  return (
    <Link
      href={href}
      className={
        isActive
          ? "rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-black text-[var(--background)]"
          : "hover-scale rounded-full border border-[var(--border)] bg-white/64 px-4 py-2 text-sm font-black text-[var(--muted-foreground)] hover:bg-white hover:text-[var(--primary-dark)]"
      }
    >
      {label}
    </Link>
  );
}

function AdminMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card soft className="p-4 hover-lift">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{value}</p>
    </Card>
  );
}

function ScoreRow({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const isLow = value !== null && value <= 2;

  return (
    <div
      className={
        isLow
          ? "rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-3"
          : "rounded-2xl border border-[var(--border)] bg-white/64 p-3"
      }
    >
      <p
        className={
          isLow
            ? "text-xs font-bold uppercase tracking-[0.14em] text-[var(--danger)]"
            : "text-xs font-bold uppercase tracking-[0.14em] text-muted"
        }
      >
        {label}
      </p>

      <p className="mt-1 text-sm font-black">
        {typeof value === "number" ? `${value}/5` : "—"}
      </p>
    </div>
  );
}

function SmallFact({
  icon: Icon,
  label,
  value,
  title,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
        <Icon size={13} />
        {label}
      </div>

      <p className="mt-2 truncate text-sm font-black" title={title ?? value}>
        {value}
      </p>

      {title && title !== value ? (
        <p className="mt-1 truncate text-xs font-bold text-muted" title={title}>
          {title}
        </p>
      ) : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="text-sm font-black">{value}</p>
    </div>
  );
}

function hasReviewQualityIssue(review: {
  rating: number;
  helpfulness: number | null;
  clarity: number | null;
  professionalism: number | null;
  wouldRecommend: boolean | null;
  problemSolved?: string | null;
}) {
  return (
    review.rating <= 2 ||
    review.wouldRecommend === false ||
    review.problemSolved === "NO" ||
    (review.helpfulness !== null && review.helpfulness <= 2) ||
    (review.clarity !== null && review.clarity <= 2) ||
    (review.professionalism !== null && review.professionalism <= 2)
  );
}

function formatProblemSolved(value: string | null) {
  if (value === "YES") {
    return "Problem solved";
  }

  if (value === "PARTIALLY") {
    return "Partially solved";
  }

  if (value === "NO") {
    return "Not solved";
  }

  return "Outcome unknown";
}

function getProblemSolvedBadgeVariant(
  value: string | null,
): "success" | "accent" | "danger" {
  if (value === "YES") {
    return "success";
  }

  if (value === "NO") {
    return "danger";
  }

  return "accent";
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}