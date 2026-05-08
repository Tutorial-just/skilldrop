import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Star,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const PLATFORM_FEE_RATE = 0.05;

export default async function AdminPage() {
  await requireRole(["admin"]);

  const [
    usersCount,
    buyersCount,
    expertsUsersCount,
    adminsCount,
    expertsCount,
    approvedExpertsCount,
    pendingExpertsCount,
    rejectedExpertsCount,
    bookingsCount,
    pendingBookingsCount,
    paidBookingsCount,
    confirmedBookingsCount,
    completedBookingsCount,
    cancelledBookingsCount,
    disputedBookingsCount,
    refundedBookingsCount,
    reviewsCount,
    lowReviewsCount,
    notRecommendedReviewsCount,
    completedBookings,
    recentReviews,
    rawExperts,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.user.count({
      where: {
        role: "BUYER",
      },
    }),

    prisma.user.count({
      where: {
        role: "EXPERT",
      },
    }),

    prisma.user.count({
      where: {
        role: "ADMIN",
      },
    }),

    prisma.expertProfile.count(),

    prisma.expertProfile.count({
      where: {
        status: "APPROVED",
      },
    }),

    prisma.expertProfile.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.expertProfile.count({
      where: {
        status: "REJECTED",
      },
    }),

    prisma.booking.count(),

    prisma.booking.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.booking.count({
      where: {
        status: "PAID",
      },
    }),

    prisma.booking.count({
      where: {
        status: "CONFIRMED",
      },
    }),

    prisma.booking.count({
      where: {
        status: "COMPLETED",
      },
    }),

    prisma.booking.count({
      where: {
        status: "CANCELLED",
      },
    }),

    prisma.booking.count({
      where: {
        status: "DISPUTED",
      },
    }),

    prisma.booking.count({
      where: {
        status: "REFUNDED",
      },
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
          {
            wouldRecommend: false,
          },
        ],
      },
    }),

    prisma.review.count({
      where: {
        wouldRecommend: false,
      },
    }),

    prisma.booking.findMany({
      where: {
        status: "COMPLETED",
      },
      select: {
        priceCents: true,
      },
    }),

    prisma.review.findMany({
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
      include: {
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
      take: 5,
    }),

    prisma.expertProfile.findMany({
      include: {
        user: true,
        availability: {
          where: {
            startTime: {
              gte: new Date(),
            },
            isBooked: false,
          },
        },
        services: {
          where: {
            isActive: true,
          },
          orderBy: {
            priceCents: "asc",
          },
          take: 1,
        },
        reviews: {
          select: {
            rating: true,
            helpfulness: true,
            clarity: true,
            professionalism: true,
            wouldRecommend: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    }),
  ]);

  const grossCompletedCents = completedBookings.reduce(
    (sum, booking) => sum + booking.priceCents,
    0,
  );

  const estimatedPlatformFeeCents = Math.round(
    grossCompletedCents * PLATFORM_FEE_RATE,
  );

  const expertsWithRisk = rawExperts.map((expert) => {
    const qualityScore = calculateQualityScore({
      rating: expert.rating,
      totalReviews: expert.totalReviews,
      totalSessions: expert.totalSessions,
      isVerified: expert.isVerified,
      openSlots: expert.availability.length,
      reviews: expert.reviews,
    });

    return {
      ...expert,
      qualityScore,
      riskLevel: calculateRiskLevel({
        qualityScore,
        reviews: expert.reviews,
      }),
    };
  });

  const highRiskExperts = expertsWithRisk.filter(
    (expert) => expert.riskLevel === "HIGH",
  );

  const mediumRiskExperts = expertsWithRisk.filter(
    (expert) => expert.riskLevel === "MEDIUM",
  );

  const topRiskExperts = expertsWithRisk
    .filter((expert) => expert.riskLevel !== "LOW")
    .sort((a, b) => {
      const riskPriority = {
        HIGH: 0,
        MEDIUM: 1,
        LOW: 2,
      };

      const aPriority = riskPriority[a.riskLevel];
      const bPriority = riskPriority[b.riskLevel];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return a.qualityScore - b.qualityScore;
    })
    .slice(0, 5);

  const hasUrgentWork =
    pendingExpertsCount > 0 ||
    disputedBookingsCount > 0 ||
    highRiskExperts.length > 0 ||
    lowReviewsCount > 0;

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative container-page py-8 md:py-10 lg:py-14">
          <Badge variant={hasUrgentWork ? "danger" : "primary"}>
            {hasUrgentWork ? (
              <>
                <ShieldAlert size={14} />
                Admin attention needed
              </>
            ) : (
              <>
                <ShieldCheck size={14} />
                Admin control center
              </>
            )}
          </Badge>

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
            <div>
              <h1 className="heading-lg max-w-4xl text-balance">
                SkillDrop operations center.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Monitor users, experts, bookings, payments, reviews, disputes
                and marketplace risk from one dashboard.
              </p>
            </div>

            <Card className="p-5">
              <Badge variant="accent">
                <ShieldCheck size={14} />
                Admin summary
              </Badge>

              <div className="mt-5 grid gap-3">
                <SummaryRow label="Buyers" value={String(buyersCount)} />
                <SummaryRow label="Expert users" value={String(expertsUsersCount)} />
                <SummaryRow label="Admins" value={String(adminsCount)} />
                <SummaryRow
                  label="Rejected experts"
                  value={String(rejectedExpertsCount)}
                />
              </div>
            </Card>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <AdminStat
              icon={UsersRound}
              label="Users"
              value={String(usersCount)}
              hint="Total accounts"
            />

            <AdminStat
              icon={UserRound}
              label="Experts"
              value={String(expertsCount)}
              hint={`${approvedExpertsCount} approved · ${pendingExpertsCount} pending`}
            />

            <AdminStat
              icon={CalendarDays}
              label="Bookings"
              value={String(bookingsCount)}
              hint={`${confirmedBookingsCount} confirmed · ${disputedBookingsCount} disputed`}
            />

            <AdminStat
              icon={CircleDollarSign}
              label="Est. commission"
              value={formatMoney(estimatedPlatformFeeCents)}
              hint="Estimated from completed calls"
            />
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr] xl:items-start">
          <div className="grid gap-6">
            <Card className="p-5 md:p-6">
              <Badge variant={hasUrgentWork ? "danger" : "success"}>
                <AlertTriangle size={14} />
                Early warning
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Marketplace health signals
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted">
                These are the most important things to check before they become
                bigger problems.
              </p>

              <div className="mt-6 grid gap-3">
                <WarningRow
                  label="Pending experts"
                  value={String(pendingExpertsCount)}
                  href="/admin/experts?status=pending"
                  danger={pendingExpertsCount > 0}
                />

                <WarningRow
                  label="Disputed bookings"
                  value={String(disputedBookingsCount)}
                  href="/admin/bookings?status=disputed"
                  danger={disputedBookingsCount > 0}
                />

                <WarningRow
                  label="High-risk experts"
                  value={String(highRiskExperts.length)}
                  href="/admin/experts?risk=high"
                  danger={highRiskExperts.length > 0}
                />

                <WarningRow
                  label="Medium-risk experts"
                  value={String(mediumRiskExperts.length)}
                  href="/admin/experts?risk=medium"
                  danger={mediumRiskExperts.length > 3}
                />

                <WarningRow
                  label="Low / risky reviews"
                  value={String(lowReviewsCount)}
                  href="/admin/reviews?bad=true"
                  danger={lowReviewsCount > 0}
                />

                <WarningRow
                  label="Not recommended"
                  value={String(notRecommendedReviewsCount)}
                  href="/admin/reviews?recommend=no"
                  danger={notRecommendedReviewsCount > 0}
                />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <WalletCards size={14} />
                Marketplace status
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Operations overview
              </h2>

              <div className="mt-6 grid gap-3">
                <StatusRow
                  label="Pending experts"
                  value={String(pendingExpertsCount)}
                />
                <StatusRow
                  label="Approved experts"
                  value={String(approvedExpertsCount)}
                />
                <StatusRow
                  label="Rejected experts"
                  value={String(rejectedExpertsCount)}
                />
                <StatusRow
                  label="Pending bookings"
                  value={String(pendingBookingsCount)}
                />
                <StatusRow
                  label="Paid bookings"
                  value={String(paidBookingsCount)}
                />
                <StatusRow
                  label="Confirmed bookings"
                  value={String(confirmedBookingsCount)}
                />
                <StatusRow
                  label="Completed bookings"
                  value={String(completedBookingsCount)}
                />
                <StatusRow
                  label="Cancelled bookings"
                  value={String(cancelledBookingsCount)}
                />
                <StatusRow
                  label="Refunded bookings"
                  value={String(refundedBookingsCount)}
                />
                <StatusRow label="Reviews" value={String(reviewsCount)} />
                <StatusRow
                  label="Completed booking volume"
                  value={formatMoney(grossCompletedCents)}
                />
                <StatusRow
                  label="Estimated platform commission"
                  value={formatMoney(estimatedPlatformFeeCents)}
                />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="danger">
                <ShieldAlert size={14} />
                Risk watchlist
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Experts to review
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted">
                Risk is calculated from recent reviews, low scores,
                recommendation signals and overall quality.
              </p>

              <div className="mt-6 grid gap-3">
                {topRiskExperts.length > 0 ? (
                  topRiskExperts.map((expert) => (
                    <RiskExpertRow key={expert.id} expert={expert} />
                  ))
                ) : (
                  <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-4">
                    <p className="font-black">No risky experts right now.</p>
                    <p className="mt-1 text-sm font-semibold text-muted">
                      Keep monitoring reviews and disputes as marketplace volume
                      grows.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <MessageCircle size={14} />
                Admin tools
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Manage platform
              </h2>

              <div className="mt-6 grid gap-3">
                <AdminLink
                  href="/admin/users"
                  title="Users"
                  text="View platform users and account roles."
                />

                <AdminLink
                  href="/admin/experts"
                  title="Experts"
                  text="Review approvals, quality, risk and provider profiles."
                />

                <AdminLink
                  href="/admin/bookings"
                  title="Bookings"
                  text="Monitor pending, paid, confirmed, disputed and refunded calls."
                />

                <AdminLink
                  href="/admin/reviews"
                  title="Reviews"
                  text="Find low ratings, bad signals and client feedback."
                />

                <AdminLink
                  href="/admin/audit"
                  title="Audit log"
                  text="Review sensitive admin actions and changes."
                />

                <AdminLink
                  href="/notifications"
                  title="Notifications"
                  text="View your SkillDrop account notifications."
                />

                <AdminLink
                  href="/admin/launch"
                  title="Launch checklist"
                  text="Check production readiness before public launch."
                />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="danger">
                <Star size={14} />
                Recent quality issues
              </Badge>

              <div className="mt-6 grid gap-3">
                {recentReviews.length > 0 ? (
                  recentReviews.map((review) => (
                    <RecentReviewRow key={review.id} review={review} />
                  ))
                ) : (
                  <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-4">
                    <p className="font-black">No recent quality issues.</p>
                    <p className="mt-1 text-sm font-semibold text-muted">
                      Low ratings and not recommended reviews will appear here.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5">
                <Link
                  href="/admin/reviews?bad=true"
                  className="btn btn-secondary"
                >
                  View quality issues
                </Link>
              </div>
            </Card>

            <Card soft className="p-5 md:p-6">
              <Badge variant="success">
                <CheckCircle2 size={14} />
                Operating rule
              </Badge>

              <p className="mt-4 text-sm font-bold leading-6 text-muted">
                Approve slowly, monitor reviews weekly, resolve disputes fast,
                and promote only experts with strong quality and low risk.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

function AdminStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof UsersRound;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card soft className="p-4 hover-lift">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={20} />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{value}</p>

      <p className="mt-1 text-sm font-semibold text-muted">{hint}</p>
    </Card>
  );
}

function WarningRow({
  label,
  value,
  href,
  danger,
}: {
  label: string;
  value: string;
  href: string;
  danger: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        danger
          ? "interactive flex items-center justify-between gap-4 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-[var(--danger)]"
          : "interactive flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-4 hover:bg-white"
      }
    >
      <p className="text-sm font-black">{label}</p>
      <p className="text-sm font-black">{value}</p>
    </Link>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="text-sm font-black">{value}</p>
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

function AdminLink({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="interactive rounded-2xl border border-[var(--border)] bg-white/64 p-4 hover:bg-white"
    >
      <p className="font-black tracking-[-0.02em]">{title}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-muted">{text}</p>
    </Link>
  );
}

function RiskExpertRow({
  expert,
}: {
  expert: {
    id: string;
    qualityScore: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    rating: number;
    totalReviews: number;
    status: string;
    isVerified: boolean;
    stripeAccountId: string | null;
    services: {
      title: string;
      priceCents: number;
    }[];
    availability: {
      startTime: Date;
    }[];
    user: {
      name: string | null;
      email: string;
    };
  };
}) {
  const startingPrice = expert.services[0]?.priceCents ?? null;
  const nextSlot = expert.availability[0]?.startTime ?? null;

  return (
    <Link
      href={`/experts/${expert.id}`}
      className="interactive rounded-2xl border border-[var(--border)] bg-white/64 p-4 hover:bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-black tracking-[-0.02em]">
            {expert.user.name ?? expert.user.email}
          </p>
          <p className="mt-1 text-xs font-bold text-muted">
            {expert.user.email}
          </p>
        </div>

        <RiskBadge riskLevel={expert.riskLevel} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge status={expert.status} />

        {expert.isVerified ? (
          <Badge variant="success">Verified</Badge>
        ) : (
          <Badge variant="accent">Not verified</Badge>
        )}

        {expert.stripeAccountId ? (
          <Badge variant="success">Payout ready</Badge>
        ) : (
          <Badge variant="danger">Payout missing</Badge>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <MiniFact label="Quality" value={`${expert.qualityScore}/100`} />
        <MiniFact
          label="Rating"
          value={expert.rating ? `${expert.rating.toFixed(1)}/5` : "New"}
        />
        <MiniFact label="Reviews" value={String(expert.totalReviews)} />
        <MiniFact
          label="From"
          value={startingPrice ? formatMoney(startingPrice) : "—"}
        />
        <MiniFact
          label="Next slot"
          value={nextSlot ? formatDateTime(nextSlot) : "—"}
        />
      </div>
    </Link>
  );
}

function RecentReviewRow({
  review,
}: {
  review: {
    id: string;
    rating: number;
    comment: string | null;
    wouldRecommend: boolean | null;
    createdAt: Date;
    expert: {
      id: string;
      user: {
        name: string | null;
        email: string;
      };
    };
    booking: {
      service: {
        title: string;
      } | null;
    };
  };
}) {
  return (
    <Link
      href="/admin/reviews?bad=true"
      className="interactive rounded-2xl border border-[var(--border)] bg-white/64 p-4 hover:bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant={review.rating <= 2 ? "danger" : "accent"}>
          <Star size={14} />
          {review.rating}/5
        </Badge>

        {review.wouldRecommend === false ? (
          <Badge variant="danger">Not recommended</Badge>
        ) : null}
      </div>

      <p className="mt-3 font-black tracking-[-0.02em]">
        {review.booking.service?.title ?? "Booked call"}
      </p>

      <p className="mt-1 text-sm font-bold text-muted">
        Expert: {review.expert.user.name ?? review.expert.user.email}
      </p>

      <p className="mt-3 text-xs font-black text-[var(--primary-dark)]">
        {formatDateTime(review.createdAt)}
      </p>

      <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-muted">
        {review.comment || "No comment left."}
      </p>
    </Link>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white/64 p-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-1 text-xs font-black">{value}</p>
    </div>
  );
}

function RiskBadge({
  riskLevel,
}: {
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}) {
  if (riskLevel === "HIGH") {
    return <Badge variant="danger">Risk: High</Badge>;
  }

  if (riskLevel === "MEDIUM") {
    return <Badge variant="accent">Risk: Medium</Badge>;
  }

  return <Badge variant="success">Risk: Low</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED") {
    return <Badge variant="success">Approved</Badge>;
  }

  if (status === "PENDING") {
    return <Badge variant="accent">Pending</Badge>;
  }

  if (status === "REJECTED") {
    return <Badge variant="danger">Rejected</Badge>;
  }

  if (status === "COMPLETED") {
    return <Badge variant="success">Completed</Badge>;
  }

  if (status === "CONFIRMED") {
    return <Badge variant="success">Confirmed</Badge>;
  }

  if (status === "PAID") {
    return <Badge variant="primary">Paid</Badge>;
  }

  if (status === "CANCELLED") {
    return <Badge variant="danger">Cancelled</Badge>;
  }

  if (status === "REFUNDED") {
    return <Badge variant="danger">Refunded</Badge>;
  }

  if (status === "DISPUTED") {
    return <Badge variant="danger">Disputed</Badge>;
  }

  return <Badge>{status.toLowerCase()}</Badge>;
}

function calculateRiskLevel({
  reviews,
  qualityScore,
}: {
  qualityScore: number;
  reviews: {
    rating: number;
    helpfulness: number | null;
    clarity: number | null;
    professionalism: number | null;
    wouldRecommend: boolean | null;
    createdAt: Date;
  }[];
}): "LOW" | "MEDIUM" | "HIGH" {
  const recentReviews = reviews.slice(0, 10);

  const badSignals = recentReviews.reduce((count, review) => {
    let signals = 0;

    if (review.rating <= 2) {
      signals += 1;
    }

    if (review.helpfulness !== null && review.helpfulness <= 2) {
      signals += 1;
    }

    if (review.clarity !== null && review.clarity <= 2) {
      signals += 1;
    }

    if (review.professionalism !== null && review.professionalism <= 2) {
      signals += 1;
    }

    if (review.wouldRecommend === false) {
      signals += 1;
    }

    return count + signals;
  }, 0);

  const notRecommendedCount = recentReviews.filter(
    (review) => review.wouldRecommend === false,
  ).length;

  const lowRatingCount = recentReviews.filter(
    (review) => review.rating <= 2,
  ).length;

  if (
    qualityScore < 40 ||
    badSignals >= 4 ||
    notRecommendedCount >= 2 ||
    lowRatingCount >= 2
  ) {
    return "HIGH";
  }

  if (qualityScore < 60 || badSignals >= 2 || notRecommendedCount >= 1) {
    return "MEDIUM";
  }

  return "LOW";
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

function averageNullable(values: (number | null)[]) {
  const cleanValues = values.filter(
    (value): value is number => typeof value === "number",
  );

  if (cleanValues.length === 0) {
    return null;
  }

  return cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatMoney(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".00", "")}`;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}