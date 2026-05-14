import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Eye,
  LineChart,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Video,
  WalletCards,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  calculatePricingBreakdown,
  formatMoneyFromCents,
} from "@/config/pricing";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const activeBookingStatuses: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.PAID,
  BookingStatus.CONFIRMED,
];

export default async function ExpertStatsPage() {
  const { user } = await requireRole(["expert", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const now = new Date();

  const expert = await prisma.expertProfile.findFirst({
    where: {
      user: {
        email,
      },
    },
    include: {
      user: true,
      services: true,
      availability: {
        include: {
          bookings: {
            where: {
              status: {
                in: activeBookingStatuses,
              },
            },
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true,
            },
          },
        },
        orderBy: {
          startTime: "asc",
        },
      },
      bookings: {
        include: {
          service: true,
          buyer: true,
        },
        orderBy: {
          startTime: "desc",
        },
      },
      reviews: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  const completedBookings = expert.bookings.filter(
    (booking) => booking.status === BookingStatus.COMPLETED,
  );

  const upcomingBookings = expert.bookings.filter(
    (booking) =>
      booking.startTime >= now &&
      booking.status !== BookingStatus.CANCELLED &&
      booking.status !== BookingStatus.REFUNDED &&
      booking.status !== BookingStatus.COMPLETED &&
      booking.status !== BookingStatus.DISPUTED &&
      booking.status !== BookingStatus.EXPIRED,
  );

  const cancelledBookings = expert.bookings.filter(
    (booking) =>
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.REFUNDED,
  );

  const activeServices = expert.services.filter((service) => service.isActive);

  const openSlots = expert.availability.filter(
    (window) =>
      window.isActive &&
      window.endTime >= now &&
      getWindowFreeMinutes(window) > 0,
  );

  const completedRevenueCents = completedBookings.reduce(
    (sum, booking) => sum + booking.priceCents,
    0,
  );

  const upcomingRevenueCents = upcomingBookings.reduce(
    (sum, booking) => sum + booking.priceCents,
    0,
  );

  const totalRevenueCents = completedRevenueCents + upcomingRevenueCents;

  const platformFeeCents = [...completedBookings, ...upcomingBookings].reduce(
    (sum, booking) => sum + getBookingPricing(booking).platformFeeCents,
    0,
  );

  const estimatedPayoutCents = [...completedBookings, ...upcomingBookings].reduce(
    (sum, booking) => sum + getBookingPricing(booking).providerNetCents,
    0,
  );

  const averageBookingValueCents =
    expert.bookings.length > 0
      ? Math.round(
          expert.bookings.reduce((sum, booking) => sum + booking.priceCents, 0) /
            expert.bookings.length,
        )
      : 0;

  const verificationProgress = calculateVerificationProgress({
    totalSessions: expert.totalSessions,
    rating: expert.rating,
    isVerified: expert.isVerified,
  });

  const growthScore = calculateGrowthScore({
    hasBio: expert.bio.length >= 120,
    hasServices: activeServices.length > 0,
    hasAvailability: openSlots.length > 0,
    hasReviews: expert.reviews.length > 0,
    hasSkills: expert.skills.length >= 3,
    hasCompletedCalls: completedBookings.length > 0,
    isVerified: expert.isVerified,
  });

  const monthlyStats = buildMonthlyStats(expert.bookings);

  const serviceStats = expert.services.map((service) => {
    const serviceBookings = expert.bookings.filter(
      (booking) => booking.serviceId === service.id,
    );

    const completedServiceBookings = serviceBookings.filter(
      (booking) => booking.status === BookingStatus.COMPLETED,
    );

    const revenueCents = completedServiceBookings.reduce(
      (sum, booking) => sum + booking.priceCents,
      0,
    );

    return {
      id: service.id,
      title: service.title,
      isActive: service.isActive,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      bookingsCount: serviceBookings.length,
      completedCount: completedServiceBookings.length,
      revenueCents,
    };
  });

  const bestService = [...serviceStats].sort(
    (a, b) => b.revenueCents - a.revenueCents,
  )[0];

  const recentReviews = expert.reviews.slice(0, 4);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <Link
                href="/expert"
                className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
              >
                <ArrowLeft size={16} />
                Back to dashboard
              </Link>

              <div className="mt-6">
                <Badge variant="primary">
                  <BarChart3 size={14} />
                  Statistics
                </Badge>
              </div>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Your provider performance.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Track earnings, calls, trust, services and growth in one clean
                dashboard.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <ButtonLink href={`/experts/${expert.id}`}>
                <Eye size={18} />
                Public profile
              </ButtonLink>

              <ButtonLink href="/expert/services" variant="secondary">
                Improve offers
                <ArrowRight size={18} />
              </ButtonLink>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={CircleDollarSign}
              label="Total value"
              value={formatMoney(totalRevenueCents)}
              hint="Completed + upcoming"
            />

            <Metric
              icon={WalletCards}
              label="Estimated payout"
              value={formatMoney(estimatedPayoutCents)}
              hint="After SkillDrop commission"
            />

            <Metric
              icon={Video}
              label="Completed calls"
              value={String(completedBookings.length)}
              hint={`${upcomingBookings.length} upcoming`}
            />

            <Metric
              icon={Star}
              label="Rating"
              value={expert.rating ? expert.rating.toFixed(1) : "New"}
              hint={`${expert.totalReviews} reviews`}
            />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-5">
          <div className="grid gap-5 xl:grid-cols-[1fr_0.82fr]">
            <Card className="overflow-hidden p-5 md:p-6">
              <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
                <div>
                  <Badge variant="primary">
                    <Sparkles size={14} />
                    Growth score
                  </Badge>

                  <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                    {growthScore}% ready to grow
                  </h2>

                  <p className="mt-3 leading-7 text-muted">
                    This score combines profile quality, services, availability,
                    reviews and completed calls.
                  </p>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[#8b5cf6]"
                      style={{ width: `${growthScore}%` }}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <HealthCheck done={expert.bio.length >= 120} text="Strong biography" />
                  <HealthCheck done={activeServices.length > 0} text="Active offer" />
                  <HealthCheck done={openSlots.length > 0} text="Open availability" />
                  <HealthCheck done={expert.skills.length >= 3} text="Searchable skills" />
                  <HealthCheck done={expert.reviews.length > 0} text="Client reviews" />
                  <HealthCheck done={expert.isVerified} text="Verified badge" />
                </div>
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant={expert.isVerified ? "success" : "accent"}>
                <BadgeCheck size={14} />
                Verification
              </Badge>

              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black tracking-[-0.05em]">
                    {expert.isVerified ? "Verified" : "In progress"}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    Verified after 3 successful calls and 3.8+ rating.
                  </p>
                </div>

                <p className="text-5xl font-black tracking-[-0.06em]">
                  {verificationProgress}%
                </p>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--success)] to-[#22c55e]"
                  style={{ width: `${verificationProgress}%` }}
                />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <TinyStat
                  value={`${Math.min(expert.totalSessions, 3)}/3`}
                  label="calls"
                />
                <TinyStat
                  value={expert.rating ? expert.rating.toFixed(1) : "New"}
                  label="rating"
                />
                <TinyStat value={expert.isVerified ? "Yes" : "No"} label="badge" />
              </div>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <WalletCards size={14} />
                Earnings
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Money flow
              </h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MoneyBox
                  label="Completed"
                  value={formatMoney(completedRevenueCents)}
                  hint="Finished calls"
                />

                <MoneyBox
                  label="Upcoming"
                  value={formatMoney(upcomingRevenueCents)}
                  hint="Scheduled calls"
                />

                <MoneyBox
                  label="Commission"
                  value={formatMoney(platformFeeCents)}
                  hint="SkillDrop fee estimate"
                />

                <MoneyBox
                  label="Payout"
                  value={formatMoney(estimatedPayoutCents)}
                  hint="Estimated net"
                  strong
                />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <LineChart size={14} />
                Last 6 months
              </Badge>

              <div className="mt-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-3xl font-black tracking-[-0.05em]">
                    Monthly overview
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    Completed calls and revenue.
                  </p>
                </div>

                <Badge>{formatMoney(completedRevenueCents)} total</Badge>
              </div>

              <div className="mt-6 grid gap-3">
                {monthlyStats.map((month) => (
                  <MonthBar key={month.label} month={month} />
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
            <Card className="p-5 md:p-6">
              <Badge variant="success">
                <Target size={14} />
                Offer performance
              </Badge>

              <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-3xl font-black tracking-[-0.05em]">
                    Services
                  </h2>

                  {bestService ? (
                    <p className="mt-2 text-sm leading-6 text-muted">
                      Best performer:{" "}
                      <span className="font-black text-[var(--foreground)]">
                        {bestService.title}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-muted">
                      Add services to start tracking performance.
                    </p>
                  )}
                </div>

                <ButtonLink href="/expert/services" variant="secondary">
                  Manage offers
                </ButtonLink>
              </div>

              <div className="mt-6 grid gap-3">
                {serviceStats.length > 0 ? (
                  serviceStats.map((service) => (
                    <ServiceRow key={service.id} service={service} />
                  ))
                ) : (
                  <EmptyMini
                    title="No services yet"
                    text="Create your first offer to see performance."
                  />
                )}
              </div>
            </Card>

            <div className="grid gap-5">
              <Card className="p-5 md:p-6">
                <Badge variant="primary">
                  <CalendarDays size={14} />
                  Activity
                </Badge>

                <div className="mt-5 grid gap-3">
                  <ActivityRow label="Upcoming calls" value={upcomingBookings.length} />
                  <ActivityRow label="Completed calls" value={completedBookings.length} />
                  <ActivityRow label="Cancelled calls" value={cancelledBookings.length} />
                  <ActivityRow label="Open availability" value={openSlots.length} />
                  <ActivityRow
                    label="Average booking"
                    value={formatMoney(averageBookingValueCents)}
                  />
                  <ActivityRow label="Active offers" value={activeServices.length} />
                </div>
              </Card>

              <Card soft className="p-5 md:p-6">
                <Badge variant="accent">
                  <TrendingUp size={14} />
                  Smart tips
                </Badge>

                <div className="mt-5 grid gap-3">
                  <SmartTip
                    icon={openSlots.length > 0 ? BadgeCheck : ShieldCheck}
                    text={
                      openSlots.length > 0
                        ? "You have open availability. Keep it fresh weekly."
                        : "Add open availability for the next 7 days."
                    }
                  />

                  <SmartTip
                    icon={activeServices.length > 1 ? BadgeCheck : ShieldCheck}
                    text={
                      activeServices.length > 1
                        ? "Multiple offers help clients choose faster."
                        : "Add one more offer for a different need."
                    }
                  />

                  <SmartTip
                    icon={expert.reviews.length > 0 ? BadgeCheck : ShieldCheck}
                    text={
                      expert.reviews.length > 0
                        ? "Reviews build trust. Keep asking after calls."
                        : "Complete calls and ask clients to leave reviews."
                    }
                  />
                </div>
              </Card>
            </div>
          </div>

          <Card className="p-5 md:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <Badge variant="accent">Recent feedback</Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  Client reviews
                </h2>
              </div>

              <Badge>{expert.reviews.length} total</Badge>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {recentReviews.length > 0 ? (
                recentReviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-[22px] border border-[var(--border)] bg-white/64 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 font-black">
                        <Star size={16} fill="currentColor" />
                        {review.rating}/5
                      </p>

                      <p className="text-xs font-bold text-muted">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
                      {review.comment || "No comment left."}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyMini
                  title="No reviews yet"
                  text="Reviews will appear here after completed calls."
                />
              )}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Star;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card soft className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
          <Icon size={20} />
        </div>

        <ArrowRight size={16} className="text-muted" />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{value}</p>

      <p className="mt-1 text-sm font-semibold text-muted">{hint}</p>
    </Card>
  );
}

function HealthCheck({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/64 px-4 py-3 text-sm font-bold text-[var(--muted-foreground)]">
      <div
        className={
          done
            ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]"
            : "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"
        }
      >
        {done ? <BadgeCheck size={15} /> : <ShieldCheck size={15} />}
      </div>

      <span className="min-w-0 leading-5">{text}</span>
    </div>
  );
}

function TinyStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-xl font-black tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
    </div>
  );
}

function MoneyBox({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint: string;
  strong?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? "rounded-[22px] border border-[var(--primary)]/20 bg-[var(--primary-soft)] p-4"
          : "rounded-[22px] border border-[var(--border)] bg-white/64 p-4"
      }
    >
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-xs font-semibold text-muted">{hint}</p>
    </div>
  );
}

function MonthBar({
  month,
}: {
  month: {
    label: string;
    bookings: number;
    revenueCents: number;
  };
}) {
  const maxRevenueForVisual = 10000;
  const width = Math.min((month.revenueCents / maxRevenueForVisual) * 100, 100);

  return (
    <div className="grid grid-cols-[56px_1fr_auto] items-center gap-3">
      <p className="text-sm font-black">{month.label}</p>

      <div className="h-3 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[#8b5cf6]"
          style={{ width: `${width}%` }}
        />
      </div>

      <p className="text-xs font-bold text-muted">
        {month.bookings} · {formatMoney(month.revenueCents)}
      </p>
    </div>
  );
}

function ServiceRow({
  service,
}: {
  service: {
    id: string;
    title: string;
    isActive: boolean;
    durationMinutes: number;
    priceCents: number;
    bookingsCount: number;
    completedCount: number;
    revenueCents: number;
  };
}) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={service.isActive ? "success" : "accent"}>
              {service.isActive ? "Active" : "Inactive"}
            </Badge>

            <Badge>{service.durationMinutes} min</Badge>
          </div>

          <h3 className="mt-3 font-black tracking-[-0.02em]">
            {service.title}
          </h3>

          <p className="mt-1 text-sm text-muted">
            {service.bookingsCount} bookings · {service.completedCount} completed
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-xl font-black tracking-[-0.04em]">
            {formatMoney(service.revenueCents)}
          </p>
          <p className="text-xs font-bold text-muted">revenue</p>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}

function SmartTip({
  icon: Icon,
  text,
}: {
  icon: typeof BadgeCheck;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-white/62 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={16} />
      </div>

      <p className="text-sm font-bold leading-6 text-muted">{text}</p>
    </div>
  );
}

function EmptyMini({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[var(--border-strong)] bg-white/55 p-6 text-center md:col-span-2">
      <h3 className="text-xl font-black tracking-[-0.03em]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{text}</p>
    </div>
  );
}

function calculateVerificationProgress({
  totalSessions,
  rating,
  isVerified,
}: {
  totalSessions: number;
  rating: number;
  isVerified: boolean;
}) {
  if (isVerified) {
    return 100;
  }

  const callProgress = Math.min(totalSessions / 3, 1) * 60;
  const ratingProgress = rating >= 3.8 ? 40 : rating > 0 ? 20 : 0;

  return Math.round(callProgress + ratingProgress);
}

function calculateGrowthScore({
  hasBio,
  hasServices,
  hasAvailability,
  hasReviews,
  hasSkills,
  hasCompletedCalls,
  isVerified,
}: {
  hasBio: boolean;
  hasServices: boolean;
  hasAvailability: boolean;
  hasReviews: boolean;
  hasSkills: boolean;
  hasCompletedCalls: boolean;
  isVerified: boolean;
}) {
  const checks = [
    hasBio,
    hasServices,
    hasAvailability,
    hasReviews,
    hasSkills,
    hasCompletedCalls,
    isVerified,
  ];

  const completed = checks.filter(Boolean).length;

  return Math.round((completed / checks.length) * 100);
}

function buildMonthlyStats(
  bookings: {
    startTime: Date;
    status: string;
    priceCents: number;
  }[],
) {
  const months = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));

    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      label: new Intl.DateTimeFormat("en", {
        month: "short",
      }).format(date),
      bookings: 0,
      revenueCents: 0,
    };
  });

  bookings.forEach((booking) => {
    if (booking.status !== BookingStatus.COMPLETED) {
      return;
    }

    const bookingDate = booking.startTime;

    const month = months.find(
      (item) =>
        item.year === bookingDate.getFullYear() &&
        item.month === bookingDate.getMonth(),
    );

    if (!month) {
      return;
    }

    month.bookings += 1;
    month.revenueCents += booking.priceCents;
  });

  return months;
}

function getBookingPricing(booking: {
  priceCents: number;
  platformFeeCents?: number | null;
  providerNetCents?: number | null;
  clientServiceFeeCents?: number | null;
  clientTotalCents?: number | null;
}) {
  const fallback = calculatePricingBreakdown(booking.priceCents);

  return {
    servicePriceCents: booking.priceCents,
    platformFeeCents:
      typeof booking.platformFeeCents === "number"
        ? booking.platformFeeCents
        : fallback.providerCommissionCents,
    providerNetCents:
      typeof booking.providerNetCents === "number"
        ? booking.providerNetCents
        : fallback.providerNetCents,
    clientServiceFeeCents:
      typeof booking.clientServiceFeeCents === "number"
        ? booking.clientServiceFeeCents
        : fallback.clientServiceFeeCents,
    clientTotalCents:
      typeof booking.clientTotalCents === "number"
        ? booking.clientTotalCents
        : fallback.clientTotalCents,
  };
}

function getWindowFreeMinutes(window: {
  startTime: Date;
  endTime: Date;
  bookings: {
    startTime: Date;
    endTime: Date;
    status: BookingStatus;
  }[];
}) {
  const totalMinutes = getDurationMinutes(window.startTime, window.endTime);

  const bookedMinutes = window.bookings
    .filter((booking) => activeBookingStatuses.includes(booking.status))
    .reduce(
      (sum, booking) =>
        sum + getDurationMinutes(booking.startTime, booking.endTime),
      0,
    );

  return Math.max(totalMinutes - bookedMinutes, 0);
}

function getDurationMinutes(startTime: Date, endTime: Date) {
  return Math.max(
    Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60),
    0,
  );
}

function formatMoney(cents: number) {
  return formatMoneyFromCents(cents);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}