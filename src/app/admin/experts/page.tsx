import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ExpertStatus } from "@prisma/client";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CheckCircle2,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  toggleExpertVerificationAction,
  updateExpertStatusAction,
} from "@/server/actions/admin.actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type AdminExpertsPageProps = {
  searchParams?: Promise<{
    updated?: string;
    error?: string;
    q?: string;
    status?: string;
    verified?: string;
    risk?: string;
  }>;
};

export default async function AdminExpertsPage({
  searchParams,
}: AdminExpertsPageProps) {
  await requireRole(["admin"]);

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const query = resolvedSearchParams.q?.trim() ?? "";
  const statusFilter = resolvedSearchParams.status ?? "all";
  const verifiedFilter = resolvedSearchParams.verified ?? "all";
  const riskFilter = resolvedSearchParams.risk ?? "all";

  const now = new Date();

  const expertWhere: Prisma.ExpertProfileWhereInput = {
    ...(statusFilter === "all"
      ? {}
      : isExpertStatus(statusFilter)
        ? {
            status: statusFilter.toUpperCase() as ExpertStatus,
          }
        : {}),

    ...(verifiedFilter === "all"
      ? {}
      : {
          isVerified: verifiedFilter === "true",
        }),

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
          ],
        }
      : {}),
  };

  const [
    rawExperts,
    totalExperts,
    approvedExperts,
    pendingExperts,
    rejectedExperts,
    suspendedExperts,
    verifiedExperts,
  ] = await Promise.all([
    prisma.expertProfile.findMany({
      where: expertWhere,
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
            startTime: {
              gte: now,
            },
            isBooked: false,
          },
          orderBy: {
            startTime: "asc",
          },
        },
        reviews: {
          select: {
            id: true,
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
          take: 20,
        },
      },
      orderBy: [
        {
          status: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
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

    prisma.expertProfile.count({
      where: {
        status: "SUSPENDED",
      },
    }),

    prisma.expertProfile.count({
      where: {
        isVerified: true,
      },
    }),
  ]);

  const experts = rawExperts
    .map((expert) => {
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
          reviews: expert.reviews,
          qualityScore,
        }),
      };
    })
    .filter((expert) => {
      if (riskFilter === "all") {
        return true;
      }

      return expert.riskLevel.toLowerCase() === riskFilter.toLowerCase();
    })
    .sort((a, b) => {
      const statusPriority = {
        PENDING: 0,
        APPROVED: 1,
        SUSPENDED: 2,
        REJECTED: 3,
      };

      const aPriority =
        statusPriority[a.status as keyof typeof statusPriority] ?? 9;
      const bPriority =
        statusPriority[b.status as keyof typeof statusPriority] ?? 9;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      if (b.qualityScore !== a.qualityScore) {
        return b.qualityScore - a.qualityScore;
      }

      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const averageQuality =
    experts.length > 0
      ? Math.round(
          experts.reduce((sum, expert) => sum + expert.qualityScore, 0) /
            experts.length,
        )
      : 0;

  const highRiskExperts = experts.filter(
    (expert) => expert.riskLevel === "HIGH",
  );

  const mediumRiskExperts = experts.filter(
    (expert) => expert.riskLevel === "MEDIUM",
  );

  const payoutReadyExperts = experts.filter((expert) =>
    Boolean(expert.stripeAccountId),
  );

  const hasActiveFilters =
    query ||
    statusFilter !== "all" ||
    verifiedFilter !== "all" ||
    riskFilter !== "all";

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

          {resolvedSearchParams.updated ? (
            <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black text-[var(--success)]">
              Expert updated successfully.
            </div>
          ) : null}

          {resolvedSearchParams.error ? (
            <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-black text-[var(--danger)]">
              {formatAdminError(resolvedSearchParams.error)}
            </div>
          ) : null}

          <Badge variant="primary" className="mt-8">
            <ShieldCheck size={14} />
            Expert moderation
          </Badge>

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
            <div>
              <h1 className="heading-lg max-w-4xl text-balance">
                Review and manage expert profiles.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Approve experts, monitor quality, suspend unsafe profiles and
                manage manual verification.
              </p>
            </div>

            <Card className="p-5">
              <Badge variant="accent">
                <Sparkles size={14} />
                Filtered results
              </Badge>

              <div className="mt-5 grid gap-3">
                <SummaryRow label="Shown experts" value={String(experts.length)} />
                <SummaryRow label="High risk" value={String(highRiskExperts.length)} />
                <SummaryRow
                  label="Medium risk"
                  value={String(mediumRiskExperts.length)}
                />
                <SummaryRow
                  label="Payout ready"
                  value={String(payoutReadyExperts.length)}
                />
              </div>
            </Card>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <AdminMiniStat label="Experts" value={String(totalExperts)} />
            <AdminMiniStat label="Approved" value={String(approvedExperts)} />
            <AdminMiniStat label="Pending" value={String(pendingExperts)} />
            <AdminMiniStat label="Rejected" value={String(rejectedExperts)} />
            <AdminMiniStat label="Suspended" value={String(suspendedExperts)} />
            <AdminMiniStat label="Verified" value={String(verifiedExperts)} />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AdminMiniStat label="Average quality" value={`${averageQuality}/100`} />
            <AdminMiniStat label="High risk shown" value={String(highRiskExperts.length)} />
            <AdminMiniStat
              label="Medium risk shown"
              value={String(mediumRiskExperts.length)}
            />
          </div>

          <form action="/admin/experts" className="mt-6">
            <div className="grid gap-3 rounded-[28px] border border-[var(--border)] bg-white/64 p-3 shadow-[var(--shadow-sm)] xl:grid-cols-[1fr_180px_180px_auto_auto] xl:items-center">
              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                />

                <input
                  name="q"
                  type="search"
                  defaultValue={query}
                  placeholder="Search experts by name, email, headline or country..."
                  className="input min-h-12 w-full pl-11"
                />
              </div>

              <select
                name="status"
                defaultValue={statusFilter}
                className="input min-h-12"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>

              <select
                name="verified"
                defaultValue={verifiedFilter}
                className="input min-h-12"
              >
                <option value="all">All verification</option>
                <option value="true">Verified only</option>
                <option value="false">Not verified</option>
              </select>

              {riskFilter !== "all" ? (
                <input type="hidden" name="risk" value={riskFilter} />
              ) : null}

              <button type="submit" className="btn btn-primary">
                Search
              </button>

              {hasActiveFilters ? (
                <Link href="/admin/experts" className="btn btn-secondary">
                  Clear
                </Link>
              ) : null}
            </div>
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            <FilterLink
              q={query}
              status="all"
              verified={verifiedFilter}
              risk={riskFilter}
              current={statusFilter}
              label="All"
            />
            <FilterLink
              q={query}
              status="pending"
              verified={verifiedFilter}
              risk={riskFilter}
              current={statusFilter}
              label="Pending"
            />
            <FilterLink
              q={query}
              status="approved"
              verified={verifiedFilter}
              risk={riskFilter}
              current={statusFilter}
              label="Approved"
            />
            <FilterLink
              q={query}
              status="rejected"
              verified={verifiedFilter}
              risk={riskFilter}
              current={statusFilter}
              label="Rejected"
            />
            <FilterLink
              q={query}
              status="suspended"
              verified={verifiedFilter}
              risk={riskFilter}
              current={statusFilter}
              label="Suspended"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <RiskFilterLink
              q={query}
              status={statusFilter}
              verified={verifiedFilter}
              risk="all"
              current={riskFilter}
              label="All risk"
            />

            <RiskFilterLink
              q={query}
              status={statusFilter}
              verified={verifiedFilter}
              risk="high"
              current={riskFilter}
              label="High risk"
            />

            <RiskFilterLink
              q={query}
              status={statusFilter}
              verified={verifiedFilter}
              risk="medium"
              current={riskFilter}
              label="Medium risk"
            />

            <RiskFilterLink
              q={query}
              status={statusFilter}
              verified={verifiedFilter}
              risk="low"
              current={riskFilter}
              label="Low risk"
            />
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm font-black text-muted">
            Showing {experts.length} expert{experts.length === 1 ? "" : "s"}
          </p>

          <div className="flex flex-wrap gap-2">
            <Badge>Search: {query || "none"}</Badge>
            <Badge>Status: {statusFilter}</Badge>
            <Badge>Verified: {verifiedFilter}</Badge>
            <Badge>Risk: {riskFilter}</Badge>
          </div>
        </div>

        <div className="grid gap-5">
          {experts.length > 0 ? (
            experts.map((expert) => (
              <ExpertAdminCard key={expert.id} expert={expert} />
            ))
          ) : (
            <Card className="p-8 text-center">
              <h2 className="text-2xl font-black tracking-[-0.04em]">
                No experts found
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-muted">
                Try another search query, status, risk or verification filter.
              </p>

              <div className="mt-5">
                <Link href="/admin/experts" className="btn btn-secondary">
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

function ExpertAdminCard({
  expert,
}: {
  expert: {
    id: string;
    headline: string;
    country: string | null;
    status: string;
    isVerified: boolean;
    rating: number;
    qualityScore: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    totalReviews: number;
    totalSessions: number;
    stripeAccountId: string | null;
    createdAt: Date;
    user: {
      name: string | null;
      email: string;
    };
    services: {
      id: string;
      title: string;
      priceCents: number;
      durationMinutes: number;
      isActive: boolean;
    }[];
    availability: {
      id: string;
      startTime: Date;
      endTime: Date;
      isBooked: boolean;
    }[];
    reviews: {
      id: string;
      rating: number;
      helpfulness: number | null;
      clarity: number | null;
      professionalism: number | null;
      wouldRecommend: boolean | null;
      createdAt: Date;
    }[];
  };
}) {
  const helpfulnessAvg = averageNullable(
    expert.reviews.map((review) => review.helpfulness),
  );

  const clarityAvg = averageNullable(
    expert.reviews.map((review) => review.clarity),
  );

  const professionalismAvg = averageNullable(
    expert.reviews.map((review) => review.professionalism),
  );

  const recommendationReviews = expert.reviews.filter(
    (review) => review.wouldRecommend !== null,
  );

  const recommendationRate =
    recommendationReviews.length > 0
      ? Math.round(
          (recommendationReviews.filter((review) => review.wouldRecommend)
            .length /
            recommendationReviews.length) *
            100,
        )
      : null;

  const startingService = expert.services[0] ?? null;
  const nextSlot = expert.availability[0] ?? null;

  return (
    <Card className="p-5 md:p-6 hover-lift">
      <div className="grid gap-5 xl:grid-cols-[1fr_280px] xl:items-start">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
            <UserRound size={24} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={expert.status} />

              {expert.isVerified ? (
                <Badge variant="success">
                  <BadgeCheck size={14} />
                  Verified
                </Badge>
              ) : (
                <Badge variant="accent">Not verified</Badge>
              )}

              {expert.stripeAccountId ? (
                <Badge variant="success">
                  <WalletCards size={14} />
                  Payout ready
                </Badge>
              ) : (
                <Badge variant="danger">
                  <WalletCards size={14} />
                  Payout missing
                </Badge>
              )}

              <Badge variant={expert.qualityScore >= 80 ? "success" : "primary"}>
                <Sparkles size={14} />
                Quality {expert.qualityScore}/100
              </Badge>

              <RiskBadge riskLevel={expert.riskLevel} />

              <Badge>
                <Star size={14} />
                {expert.rating ? expert.rating.toFixed(1) : "New"}
              </Badge>
            </div>

            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
              {expert.user.name ?? expert.user.email}
            </h2>

            <p className="mt-1 break-all text-sm font-bold text-muted">
              {expert.user.email}
            </p>

            <p className="mt-3 text-sm font-semibold leading-6 text-muted">
              {expert.headline || "No headline yet."}
            </p>

            <div className="mt-4 grid gap-2 md:grid-cols-4">
              <SmallFact label="Country" value={expert.country ?? "—"} />
              <SmallFact label="Services" value={String(expert.services.length)} />
              <SmallFact label="Open slots" value={String(expert.availability.length)} />
              <SmallFact label="Sessions" value={String(expert.totalSessions)} />
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-5">
              <SmallFact label="Reviews" value={String(expert.totalReviews)} />
              <SmallFact
                label="Helpful"
                value={
                  typeof helpfulnessAvg === "number"
                    ? `${helpfulnessAvg.toFixed(1)}/5`
                    : "—"
                }
              />
              <SmallFact
                label="Clarity"
                value={
                  typeof clarityAvg === "number"
                    ? `${clarityAvg.toFixed(1)}/5`
                    : "—"
                }
              />
              <SmallFact
                label="Pro"
                value={
                  typeof professionalismAvg === "number"
                    ? `${professionalismAvg.toFixed(1)}/5`
                    : "—"
                }
              />
              <SmallFact
                label="Recommend"
                value={
                  recommendationRate !== null ? `${recommendationRate}%` : "—"
                }
              />
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <SmallFact
                label="From"
                value={startingService ? formatMoney(startingService.priceCents) : "—"}
              />
              <SmallFact
                label="Service"
                value={startingService?.title ?? "—"}
              />
              <SmallFact
                label="Next slot"
                value={nextSlot ? formatDateTime(nextSlot.startTime) : "—"}
              />
            </div>

            {expert.qualityScore < 45 ? (
              <div className="mt-4 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-3 text-sm font-black leading-6 text-[var(--danger)]">
                Low quality signal. Review this expert before promoting.
              </div>
            ) : null}

            {expert.riskLevel === "HIGH" ? (
              <div className="mt-4 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-3 text-sm font-black leading-6 text-[var(--danger)]">
                High risk expert. Check recent reviews, complaints and booking
                history before approving or promoting.
              </div>
            ) : null}

            {expert.riskLevel === "MEDIUM" ? (
              <div className="mt-4 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-3 text-sm font-black leading-6 text-[var(--accent-dark)]">
                Medium risk signal. Monitor this expert before promotion.
              </div>
            ) : null}

            {expert.qualityScore >= 80 ? (
              <div className="mt-4 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-3 text-sm font-black leading-6 text-[var(--success)]">
                Strong quality signal. Good candidate for promotion.
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/experts/${expert.id}`} className="btn btn-secondary">
                View public profile
              </Link>

              <Link
                href={`/admin/bookings?q=${encodeURIComponent(expert.user.email)}`}
                className="btn btn-secondary"
              >
                Related bookings
              </Link>

              <Link
                href={`/admin/reviews?q=${encodeURIComponent(expert.user.email)}`}
                className="btn btn-secondary"
              >
                Related reviews
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-[24px] border border-[var(--border)] bg-white/64 p-4">
          <form action={updateExpertStatusAction} className="grid gap-2">
            <input type="hidden" name="expertId" value={expert.id} />
            <input type="hidden" name="status" value="APPROVED" />

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={expert.status === "APPROVED"}
            >
              <CheckCircle2 size={17} />
              Approve
            </button>
          </form>

          <form action={updateExpertStatusAction} className="grid gap-2">
            <input type="hidden" name="expertId" value={expert.id} />
            <input type="hidden" name="status" value="REJECTED" />

            <button
              type="submit"
              className="btn btn-secondary w-full"
              disabled={expert.status === "REJECTED"}
            >
              <XCircle size={17} />
              Reject
            </button>
          </form>

          <form action={updateExpertStatusAction} className="grid gap-2">
            <input type="hidden" name="expertId" value={expert.id} />
            <input type="hidden" name="status" value="SUSPENDED" />

            <button
              type="submit"
              className="btn btn-danger w-full"
              disabled={expert.status === "SUSPENDED"}
            >
              <Ban size={17} />
              Suspend
            </button>
          </form>

          <form action={toggleExpertVerificationAction} className="grid gap-2">
            <input type="hidden" name="expertId" value={expert.id} />

            <button type="submit" className="btn btn-secondary w-full">
              <BadgeCheck size={17} />
              {expert.isVerified ? "Remove verification" : "Verify manually"}
            </button>
          </form>

          <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
              Created
            </p>
            <p className="mt-1 text-sm font-black">
              {formatDateTime(expert.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function FilterLink({
  q,
  status,
  verified,
  risk,
  current,
  label,
}: {
  q: string;
  status: string;
  verified: string;
  risk: string;
  current: string;
  label: string;
}) {
  const isActive = current === status;

  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (status !== "all") {
    params.set("status", status);
  }

  if (verified !== "all") {
    params.set("verified", verified);
  }

  if (risk !== "all") {
    params.set("risk", risk);
  }

  const href = params.toString()
    ? `/admin/experts?${params.toString()}`
    : "/admin/experts";

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

function RiskFilterLink({
  q,
  status,
  verified,
  risk,
  current,
  label,
}: {
  q: string;
  status: string;
  verified: string;
  risk: string;
  current: string;
  label: string;
}) {
  const isActive = current === risk;

  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (status !== "all") {
    params.set("status", status);
  }

  if (verified !== "all") {
    params.set("verified", verified);
  }

  if (risk !== "all") {
    params.set("risk", risk);
  }

  const href = params.toString()
    ? `/admin/experts?${params.toString()}`
    : "/admin/experts";

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

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED") {
    return <Badge variant="success">Approved</Badge>;
  }

  if (status === "REJECTED") {
    return <Badge variant="danger">Rejected</Badge>;
  }

  if (status === "SUSPENDED") {
    return <Badge variant="danger">Suspended</Badge>;
  }

  return <Badge variant="accent">Pending</Badge>;
}

function SmallFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 break-words text-sm font-black" title={value}>
        {value}
      </p>
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

function isExpertStatus(status: string) {
  return ["pending", "approved", "rejected", "suspended"].includes(
    status.toLowerCase(),
  );
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

function formatAdminError(error: string) {
  if (error === "expert-not-found") {
    return "This expert could not be found.";
  }

  if (error === "invalid-status") {
    return "This expert status is invalid.";
  }

  if (error === "not-admin") {
    return "Only admins can update experts.";
  }

  return "Something went wrong while updating this expert.";
}