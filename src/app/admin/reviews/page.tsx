import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  MessageCircle,
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
    rating?: string;
    bad?: string;
    recommend?: string;
  }>;
};

export default async function AdminReviewsPage({
  searchParams,
}: AdminReviewsPageProps) {
  await requireRole(["admin"]);

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const ratingFilter = resolvedSearchParams.rating ?? "all";
  const badOnly = resolvedSearchParams.bad === "true";
  const recommendFilter = resolvedSearchParams.recommend ?? "all";

  const reviewWhere = {
    ...(ratingFilter === "all"
      ? {}
      : {
          rating: Number(ratingFilter),
        }),

    ...(badOnly
      ? {
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
        }
      : {}),

    ...(recommendFilter === "all"
      ? {}
      : {
          wouldRecommend: recommendFilter === "yes",
        }),
  };

  const reviews = await prisma.review.findMany({
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
    take: 100,
  });

  const totalReviews = await prisma.review.count();

  const lowReviews = await prisma.review.count({
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
  });

  const recommendedReviews = await prisma.review.count({
    where: {
      wouldRecommend: true,
    },
  });

  const notRecommendedReviews = await prisma.review.count({
    where: {
      wouldRecommend: false,
    },
  });

  const averageRating =
    totalReviews > 0
      ? await prisma.review
          .aggregate({
            _avg: {
              rating: true,
            },
          })
          .then((result) => result._avg.rating ?? 0)
      : 0;

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

          <h1 className="heading-lg mt-5 max-w-4xl text-balance">
            Monitor marketplace feedback.
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
            Track review quality, low ratings, recommendation signals and trust
            issues across SkillDrop.
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-5">
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
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <FilterLink
              rating="all"
              bad={false}
              recommend={recommendFilter}
              currentRating={ratingFilter}
              currentBad={badOnly}
              label="All"
            />
            <FilterLink
              rating="5"
              bad={false}
              recommend={recommendFilter}
              currentRating={ratingFilter}
              currentBad={badOnly}
              label="5 stars"
            />
            <FilterLink
              rating="4"
              bad={false}
              recommend={recommendFilter}
              currentRating={ratingFilter}
              currentBad={badOnly}
              label="4 stars"
            />
            <FilterLink
              rating="3"
              bad={false}
              recommend={recommendFilter}
              currentRating={ratingFilter}
              currentBad={badOnly}
              label="3 stars"
            />
            <FilterLink
              rating="2"
              bad={false}
              recommend={recommendFilter}
              currentRating={ratingFilter}
              currentBad={badOnly}
              label="2 stars"
            />
            <FilterLink
              rating="1"
              bad={false}
              recommend={recommendFilter}
              currentRating={ratingFilter}
              currentBad={badOnly}
              label="1 star"
            />
            <FilterLink
              rating="all"
              bad
              recommend={recommendFilter}
              currentRating={ratingFilter}
              currentBad={badOnly}
              label="Quality issues"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <RecommendFilterLink
              rating={ratingFilter}
              bad={badOnly}
              value="all"
              current={recommendFilter}
              label="All recommendations"
            />
            <RecommendFilterLink
              rating={ratingFilter}
              bad={badOnly}
              value="yes"
              current={recommendFilter}
              label="Recommended"
            />
            <RecommendFilterLink
              rating={ratingFilter}
              bad={badOnly}
              value="no"
              current={recommendFilter}
              label="Not recommended"
            />
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge>Rating: {ratingFilter}</Badge>
          <Badge>Quality issues: {badOnly ? "yes" : "no"}</Badge>
          <Badge>Recommend: {recommendFilter}</Badge>
          <Badge>{reviews.length} shown</Badge>
        </div>

        <div className="grid gap-5">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <ReviewAdminCard key={review.id} review={review} />
            ))
          ) : (
            <Card className="p-8 text-center">
              <h2 className="text-2xl font-black tracking-[-0.04em]">
                No reviews found
              </h2>

              <p className="mt-3 text-sm font-semibold text-muted">
                Try another rating or recommendation filter.
              </p>
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
  const hasQualityIssue =
    review.rating <= 2 ||
    review.wouldRecommend === false ||
    (review.helpfulness !== null && review.helpfulness <= 2) ||
    (review.clarity !== null && review.clarity <= 2) ||
    (review.professionalism !== null && review.professionalism <= 2);

  return (
    <Card className="p-5 md:p-6">
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
            <div className="mt-4 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-black text-[var(--danger)]">
              This review has a quality risk signal. Check the booking, expert
              history and possible dispute/refund context.
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
            />
            <SmallFact
              icon={ShieldCheck}
              label="Expert"
              value={review.expert.user.name ?? review.expert.user.email}
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

          <Link href="/admin/bookings?status=all" className="btn btn-secondary">
            View bookings
          </Link>

          <Link href="/admin/experts" className="btn btn-secondary">
            Manage experts
          </Link>
        </div>
      </div>
    </Card>
  );
}

function FilterLink({
  rating,
  bad,
  recommend,
  currentRating,
  currentBad,
  label,
}: {
  rating: string;
  bad: boolean;
  recommend: string;
  currentRating: string;
  currentBad: boolean;
  label: string;
}) {
  const isActive = currentRating === rating && currentBad === bad;

  const params = new URLSearchParams();

  if (rating !== "all") {
    params.set("rating", rating);
  }

  if (bad) {
    params.set("bad", "true");
  }

  if (recommend !== "all") {
    params.set("recommend", recommend);
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
          : "rounded-full border border-[var(--border)] bg-white/64 px-4 py-2 text-sm font-black text-[var(--muted-foreground)] transition hover:bg-white hover:text-[var(--primary-dark)]"
      }
    >
      {label}
    </Link>
  );
}

function RecommendFilterLink({
  rating,
  bad,
  value,
  current,
  label,
}: {
  rating: string;
  bad: boolean;
  value: string;
  current: string;
  label: string;
}) {
  const isActive = current === value;

  const params = new URLSearchParams();

  if (rating !== "all") {
    params.set("rating", rating);
  }

  if (bad) {
    params.set("bad", "true");
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
          : "rounded-full border border-[var(--border)] bg-white/64 px-4 py-2 text-sm font-black text-[var(--muted-foreground)] transition hover:bg-white hover:text-[var(--primary-dark)]"
      }
    >
      {label}
    </Link>
  );
}

function AdminMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card soft className="p-4">
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
      <p className="mt-1 text-sm font-black">{value ? `${value}/5` : "—"}</p>
    </div>
  );
}

function SmallFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
        <Icon size={13} />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-black" title={value}>
        {value}
      </p>
    </div>
  );
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}