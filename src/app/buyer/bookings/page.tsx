import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Euro,
  MessageCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Video,
  XCircle,
} from "lucide-react";
import { BookingStatus } from "@prisma/client";
import {
  formatDateTime,
  getDurationMinutes,
  getUserTimezone,
  isBookingJoinAvailable,
} from "@/lib/date-time";
import { ReportBookingForm } from "@/components/bookings/report-booking-form";
import {
  cancelBookingAction,
  releaseExpiredPendingBookings,
} from "@/server/actions/booking.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  calculatePricingBreakdown,
  formatMoneyFromCents,
} from "@/config/pricing";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getBookingStatusUi } from "@/lib/booking-status-ui";

type BuyerBookingsPageProps = {
  searchParams?: Promise<{
    booked?: string;
    paid?: string;
    payment?: string;
    error?: string;
    booking?: string;
    page?: string;
  }>;
};

const BOOKINGS_PAGE_SIZE = 20;

const upcomingBookingStatuses: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.PAID,
  BookingStatus.CONFIRMED,
];

const closedBookingStatuses: BookingStatus[] = [
  BookingStatus.CANCELLED,
  BookingStatus.REFUNDED,
  BookingStatus.DISPUTED,
  BookingStatus.EXPIRED,
];

export default async function BuyerBookingsPage({
  searchParams,
}: BuyerBookingsPageProps) {
  const { user } = await requireRole(["buyer", "admin"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const requestedPage = Number(resolvedSearchParams.page ?? 1);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const buyer = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    include: {
      buyerSettings: true,
    },
  });

  if (!buyer) {
    redirect("/sign-in");
  }

  await releaseExpiredPendingBookings();

  const userTimezone = getUserTimezone(
    buyer.buyerSettings?.preferredTimezone,
  );

  const now = new Date();

  const highlightedBookingId =
    resolvedSearchParams.booked ??
    resolvedSearchParams.paid ??
    resolvedSearchParams.booking ??
    "";

  const topMessage = getTopMessage({
    payment: resolvedSearchParams.payment,
    paid: resolvedSearchParams.paid,
    booked: resolvedSearchParams.booked,
    error: resolvedSearchParams.error,
  });

  const totalBookingsCount = await prisma.booking.count({
    where: {
      buyerId: buyer.id,
    },
  });

  const totalPages = Math.max(
    Math.ceil(totalBookingsCount / BOOKINGS_PAGE_SIZE),
    1,
  );

  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * BOOKINGS_PAGE_SIZE;

  const [
    bookings,
    nextBooking,
    upcomingBookingsCount,
    confirmedUpcomingBookingsCount,
    pendingPaymentBookingsCount,
    paidWaitingConfirmationBookingsCount,
    waitingReviewBookingsCount,
    closedBookingsCount,
    pendingPaymentBookings,
    paidWaitingConfirmationBookings,
    waitingReviewBookings,
    paidBookingsForTotal,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: {
        buyerId: buyer.id,
      },
      include: {
        expert: {
          include: {
            user: true,
          },
        },
        service: true,
        callRoom: true,
        review: true,
      outcome: true,
      },
      orderBy: {
        startTime: "desc",
      },
      skip,
      take: BOOKINGS_PAGE_SIZE,
    }),

    prisma.booking.findFirst({
      where: {
        buyerId: buyer.id,
        startTime: {
          gte: now,
        },
        status: {
          in: upcomingBookingStatuses,
        },
      },
      include: {
        expert: {
          include: {
            user: true,
          },
        },
        service: true,
        callRoom: true,
        review: true,
      outcome: true,
      },
      orderBy: {
        startTime: "asc",
      },
    }),

    prisma.booking.count({
      where: {
        buyerId: buyer.id,
        startTime: {
          gte: now,
        },
        status: {
          in: upcomingBookingStatuses,
        },
      },
    }),

    prisma.booking.count({
      where: {
        buyerId: buyer.id,
        startTime: {
          gte: now,
        },
        status: BookingStatus.CONFIRMED,
      },
    }),

    prisma.booking.count({
      where: {
        buyerId: buyer.id,
        startTime: {
          gte: now,
        },
        status: BookingStatus.PENDING,
      },
    }),

    prisma.booking.count({
      where: {
        buyerId: buyer.id,
        startTime: {
          gte: now,
        },
        status: BookingStatus.PAID,
      },
    }),

    prisma.booking.count({
      where: {
        buyerId: buyer.id,
        status: BookingStatus.COMPLETED,
        review: {
          is: null,
        },
      },
    }),

    prisma.booking.count({
      where: {
        buyerId: buyer.id,
        status: {
          in: closedBookingStatuses,
        },
      },
    }),

    prisma.booking.findMany({
      where: {
        buyerId: buyer.id,
        startTime: {
          gte: now,
        },
        status: BookingStatus.PENDING,
      },
      include: {
        expert: {
          include: {
            user: true,
          },
        },
        service: true,
        callRoom: true,
        review: true,
      outcome: true,
      },
      orderBy: {
        startTime: "asc",
      },
      take: 3,
    }),

    prisma.booking.findMany({
      where: {
        buyerId: buyer.id,
        startTime: {
          gte: now,
        },
        status: BookingStatus.PAID,
      },
      include: {
        expert: {
          include: {
            user: true,
          },
        },
        service: true,
        callRoom: true,
        review: true,
      outcome: true,
      },
      orderBy: {
        startTime: "asc",
      },
      take: 3,
    }),

    prisma.booking.findMany({
      where: {
        buyerId: buyer.id,
        status: BookingStatus.COMPLETED,
        review: {
          is: null,
        },
      },
      include: {
        expert: {
          include: {
            user: true,
          },
        },
        service: true,
        callRoom: true,
        review: true,
      outcome: true,
      },
      orderBy: {
        startTime: "desc",
      },
      take: 3,
    }),

    prisma.booking.findMany({
      where: {
        buyerId: buyer.id,
        status: {
          in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
        },
      },
      select: {
        priceCents: true,
        clientServiceFeeCents: true,
        clientTotalCents: true,
      },
    }),
  ]);

  const totalPaidCents = paidBookingsForTotal.reduce(
    (sum, booking) => sum + getBookingPricing(booking).clientTotalCents,
    0,
  );

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />
        <div className="absolute left-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[420px] w-[420px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

        <div className="container-page relative py-8 md:py-10 lg:py-12">
          <Link
            href="/buyer"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>

          {topMessage ? (
            <div
              className={
                topMessage.variant === "success"
                  ? "mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]"
                  : "mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]"
              }
            >
              {topMessage.text}
            </div>
          ) : null}

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Badge variant="primary">
                <CalendarDays size={14} />
                My bookings
              </Badge>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Your calls, payments and reviews.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                Manage reserved calls, complete payments, join confirmed
                sessions, review completed calls and keep your help history in
                one place.
              </p>
            </div>

            <ButtonLink href="/experts" variant="secondary">
              <Search size={18} />
              Find more help
            </ButtonLink>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MiniStat
              icon={Video}
              label="Upcoming"
              value={String(upcomingBookingsCount)}
              hint="Reserved or scheduled calls"
            />

            <MiniStat
              icon={CheckCircle2}
              label="Confirmed"
              value={String(confirmedUpcomingBookingsCount)}
              hint="Ready for call window"
            />

            <MiniStat
              icon={Clock3}
              label="Payment"
              value={String(pendingPaymentBookingsCount)}
              hint="Waiting for payment"
            />

            <MiniStat
              icon={Star}
              label="Reviews"
              value={String(waitingReviewBookingsCount)}
              hint="Waiting feedback"
            />

            <MiniStat
              icon={Euro}
              label="Paid"
              value={formatMoney(totalPaidCents)}
              hint="Confirmed and completed"
            />
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
          <div className="grid gap-6">
            <Card className="p-5 md:p-6">
              <Badge variant={nextBooking ? "success" : "accent"}>
                <Video size={14} />
                Next call
              </Badge>

              {nextBooking ? (
                <NextBookingPanel
                  booking={nextBooking}
                  timezone={userTimezone}
                />
              ) : (
                <EmptyBookingsState />
              )}
            </Card>

            {pendingPaymentBookings.length > 0 ? (
              <Card className="border-[var(--warning)]/20 bg-[var(--warning-soft)] p-5 md:p-6">
                <Badge variant="accent">
                  <Clock3 size={14} />
                  Payment waiting
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                  Complete payment to confirm your calls.
                </h2>

                <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                  Pending reservations are held only for a short time. If payment
                  expires, the time slot becomes available again.
                </p>

                <div className="mt-6 grid gap-4">
                  {pendingPaymentBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      highlighted={booking.id === highlightedBookingId}
                      timezone={userTimezone}
                    />
                  ))}
                </div>
              </Card>
            ) : null}

            {paidWaitingConfirmationBookings.length > 0 ? (
              <Card className="border-[var(--primary)]/20 bg-[var(--primary-soft)] p-5 md:p-6">
                <Badge variant="primary">
                  <Euro size={14} />
                  Confirming payments
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                  Payment received, confirmation pending.
                </h2>

                <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                  These bookings have payment received but are waiting for final
                  confirmation. If this stays here too long, contact support.
                </p>

                <div className="mt-6 grid gap-4">
                  {paidWaitingConfirmationBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      highlighted={booking.id === highlightedBookingId}
                      timezone={userTimezone}
                    />
                  ))}
                </div>
              </Card>
            ) : null}

            {waitingReviewBookings.length > 0 ? (
              <Card className="border-[var(--accent)]/20 bg-[var(--accent-soft)] p-5 md:p-6">
                <Badge variant="accent">
                  <Star size={14} />
                  Reviews waiting
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                  Leave feedback after your calls.
                </h2>

                <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                  Reviews help good helpers grow and help other buyers choose
                  safely.
                </p>

                <div className="mt-6 grid gap-4">
                  {waitingReviewBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      highlighted={booking.id === highlightedBookingId}
                      timezone={userTimezone}
                    />
                  ))}
                </div>
              </Card>
            ) : null}

            <Card soft className="p-5 md:p-6">
              <Badge variant="primary">
                <ShieldCheck size={14} />
                What to do next
              </Badge>

              <div className="mt-5 grid gap-3">
                <Tip
                  icon={Clock3}
                  title="Pending payment"
                  text="Open checkout and complete payment before the reservation expires."
                />
                <Tip
                  icon={MessageCircle}
                  title="Booking note"
                  text="Your note helps the helper understand your problem before the call."
                />
                <Tip
                  icon={Video}
                  title="Confirmed call"
                  text="The call button appears when the join window opens around the scheduled time."
                />
                <Tip
                  icon={Star}
                  title="Completed call"
                  text="Leave a review after the session to help other buyers choose safely."
                />
              </div>
            </Card>
          </div>

          <Card className="p-5 md:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <Badge variant="accent">
                  <CalendarDays size={14} />
                  All bookings
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                  Booking history
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                  Upcoming, completed, cancelled, expired, refunded and disputed
                  calls appear here.
                </p>
              </div>

              <Badge>
                {totalBookingsCount} total
              </Badge>
            </div>

            <div className="mt-6 grid gap-4">
              {bookings.length > 0 ? (
                bookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    highlighted={booking.id === highlightedBookingId}
                    timezone={userTimezone}
                  />
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card-soft)] p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                    <Search size={24} />
                  </div>

                  <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
                    No bookings yet
                  </h3>

                  <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                    Find a helper, choose an offer and pick an available time.
                    Your booking will appear here.
                  </p>

                  <div className="mt-5">
                    <ButtonLink href="/experts">
                      Browse helpers
                      <Search size={18} />
                    </ButtonLink>
                  </div>
                </div>
              )}
            </div>

            {totalBookingsCount > BOOKINGS_PAGE_SIZE ? (
              <PaginationControls
                page={safePage}
                totalPages={totalPages}
              />
            ) : null}

            {closedBookingsCount > 0 ? (
              <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
                <div className="flex items-center gap-3">
                  <XCircle
                    size={18}
                    className="text-[var(--muted-foreground)]"
                  />

                  <p className="text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                    You have {closedBookingsCount} closed booking
                    {closedBookingsCount === 1 ? "" : "s"}.
                  </p>
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </section>
    </main>
  );
}

function PaginationControls({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
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
            href={`/buyer/bookings?page=${previousPage}`}
            className="btn btn-secondary"
          >
            Previous
          </Link>
        ) : null}

        {page < totalPages ? (
          <Link
            href={`/buyer/bookings?page=${nextPage}`}
            className="btn btn-primary"
          >
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function NextBookingPanel({
  booking,
  timezone,
}: {
  booking: BookingCardBooking;
  timezone: string;
}) {
  const pricing = getBookingPricing(booking);
  const helperName = booking.expert.user.name ?? booking.expert.user.email;
  const canJoin = isBookingJoinAvailable({
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    hasRoom: Boolean(booking.callRoom?.roomUrl),
  });

  return (
    <div className="mt-5">
      <h2 className="text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
        {booking.service?.title ?? "Booked call"}
      </h2>

      <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
        With{" "}
        <span className="font-bold text-[var(--foreground)]">
          {helperName}
        </span>
      </p>

      <div className="mt-5 grid gap-3">
        <InfoRow
          label="Date"
          value={formatDateTime(booking.startTime, timezone)}
        />

        <InfoRow
          label="Duration"
          value={`${getDurationMinutes(
            booking.startTime,
            booking.endTime,
          )} minutes`}
        />

        <InfoRow
          label="Total"
          value={formatMoney(pricing.clientTotalCents)}
          strong
        />

        <InfoRow label="Status" value={formatStatus(booking.status)} />
      </div>

      {booking.note ? <BookingNote note={booking.note} className="mt-5" /> : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {booking.status === "PENDING" ? (
          <Link
            href={`/buyer/bookings/${booking.id}/checkout`}
            className="btn btn-primary"
          >
            Complete payment
          </Link>
        ) : null}

        {canJoin ? (
          <Link href={`/calls/${booking.id}`} className="btn btn-primary">
            Join call
            <Video size={18} />
          </Link>
        ) : null}

        <ButtonLink href={`/experts/${booking.expertId}`} variant="secondary">
          View helper
        </ButtonLink>
      </div>

      {booking.status === "CONFIRMED" && !canJoin ? (
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
          <div className="flex gap-3">
            <Clock3
              size={18}
              className="mt-0.5 shrink-0 text-[var(--primary-dark)]"
            />

            <p className="text-sm font-medium leading-6 text-[var(--muted-foreground)]">
              The call room opens 10 minutes before the start time and remains
              available for 15 minutes after the scheduled end.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmptyBookingsState() {
  return (
    <div className="mt-6 rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card-soft)] p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <CalendarDays size={24} />
      </div>

      <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
        No upcoming calls
      </h2>

      <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-6 text-[var(--muted-foreground)]">
        Find a helper, choose an offer and book a time that works for you.
      </p>

      <div className="mt-5">
        <ButtonLink href="/experts">
          Find help
          <Search size={18} />
        </ButtonLink>
      </div>
    </div>
  );
}

type BookingCardBooking = {
  id: string;
  expertId: string;
  startTime: Date;
  endTime: Date;
  priceCents: number;
  status: string;
  note: string | null;
  clientServiceFeeCents?: number | null;
  clientTotalCents?: number | null;
  platformFeeCents?: number | null;
  providerNetCents?: number | null;
  expert: {
    user: {
      name: string | null;
      email: string;
    };
  };
  service: {
    title: string;
    durationMinutes: number;
  } | null;
  callRoom: {
    roomUrl: string;
  } | null;
  review: {
    id: string;
    rating: number;
  } | null;
  outcome: {
    id: string;
    isVisibleToBuyer: boolean;
  } | null;
};

function BookingCard({
  booking,
  highlighted,
  timezone,
}: {
  booking: BookingCardBooking;
  highlighted: boolean;
  timezone: string;
}) {
  const now = new Date();
  const pricing = getBookingPricing(booking);

  const statusUi = getBookingStatusUi({
    status: booking.status,
    role: "buyer",
  });

  const isPending = booking.status === "PENDING";
  const isPaid = booking.status === "PAID";
  const isConfirmed = booking.status === "CONFIRMED";
  const isCompleted = booking.status === "COMPLETED";
  const isDisputed = booking.status === "DISPUTED";
  const isRefunded = booking.status === "REFUNDED";
  const isExpired = booking.status === "EXPIRED";
  const isCancelled = booking.status === "CANCELLED";
  const isClosed = isCancelled || isRefunded || isExpired || isDisputed;

  const isUpcoming = booking.startTime >= now && !isClosed && !isCompleted;
  const canJoin = isBookingJoinAvailable({
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    hasRoom: Boolean(booking.callRoom?.roomUrl),
  });
  const canCancel = booking.status === "PENDING" && booking.startTime > now;
  const needsSupportForCancellation =
    booking.status === "CONFIRMED" && booking.startTime > now;
  const canReview = isCompleted && !booking.review;
  const canReport = ["CONFIRMED", "COMPLETED"].includes(booking.status);
  const helperName = booking.expert.user.name ?? booking.expert.user.email;

  return (
    <div
      className={
        highlighted
          ? "rounded-[26px] border border-[var(--success)]/30 bg-[var(--success-soft)] p-4"
          : canReview
            ? "rounded-[26px] border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-4"
            : isPending
              ? "rounded-[26px] border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-4"
              : "rounded-[26px] border border-[var(--border)] bg-[var(--card-soft)] p-4"
      }
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={booking.status} />

            {booking.note ? (
              <Badge variant="primary">
                <MessageCircle size={14} />
                Note added
              </Badge>
            ) : null}

            {highlighted ? <Badge variant="success">Selected booking</Badge> : null}

            {canJoin ? (
              <Badge variant="success">
                <Video size={14} />
                Join now
              </Badge>
            ) : null}

            {canReview ? (
              <Badge variant="accent">
                <Star size={14} />
                Review waiting
              </Badge>
            ) : null}

            {booking.review ? (
              <Badge variant="success">
                <Star size={14} />
                Reviewed {booking.review.rating}/5
              </Badge>
            ) : null}

            {booking.outcome?.isVisibleToBuyer ? (
              <Badge variant="success">
                <CheckCircle2 size={14} />
                Action plan ready
              </Badge>
            ) : isCompleted ? (
              <Badge variant="accent">Action plan pending</Badge>
            ) : null}
          </div>

          <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
            {booking.service?.title ?? "Booked call"}
          </h3>

          <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            With{" "}
            <span className="font-bold text-[var(--foreground)]">
              {helperName}
            </span>
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <SmallPill
              icon={Clock3}
              text={formatDateTime(booking.startTime, timezone)}
            />

            <SmallPill
              icon={Video}
              text={`${getDurationMinutes(
                booking.startTime,
                booking.endTime,
              )} min`}
            />

            <SmallPill icon={Euro} text={formatMoney(pricing.clientTotalCents)} />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <MiniMoney
              label="Offer"
              value={formatMoney(pricing.servicePriceCents)}
            />
            <MiniMoney
              label="SkillDrop fee"
              value={formatMoney(pricing.clientServiceFeeCents)}
            />
            <MiniMoney
              label="Total"
              value={formatMoney(pricing.clientTotalCents)}
              strong
            />
          </div>

          {booking.note ? (
            <BookingNote note={booking.note} className="mt-4" />
          ) : null}

          <StatusExplanation
            variant={statusUi.variant}
            text={`${statusUi.description} Next step: ${statusUi.nextAction}.`}
          />

          {isPending ? (
            <StatusExplanation
              variant="warning"
              text="Payment is required to confirm this reservation."
            />
          ) : null}

          {isPaid ? (
            <StatusExplanation
              variant="primary"
              text="Payment was received. This booking is waiting for final confirmation."
            />
          ) : null}

          {isCompleted && booking.outcome?.isVisibleToBuyer ? (
            <StatusExplanation
              variant="success"
              text="Your helper added an action plan with the key points and next steps from the call."
            />
          ) : isCompleted ? (
            <StatusExplanation
              variant="primary"
              text="This call is completed. The helper can still add an action plan with your next steps."
            />
          ) : null}

          {isConfirmed && !canJoin ? (
            <StatusExplanation
              variant="success"
              text="Booking confirmed. The call room opens near the scheduled time."
            />
          ) : null}

          {needsSupportForCancellation ? (
            <StatusExplanation
              variant="primary"
              text="Need to cancel this paid booking? Contact support so the refund policy can be applied correctly."
            />
          ) : null}

          {isDisputed ? (
            <StatusExplanation
              variant="danger"
              text="This booking is under SkillDrop review."
            />
          ) : null}

          {isExpired ? (
            <StatusExplanation
              variant="muted"
              text="This booking expired because payment was not completed in time."
            />
          ) : null}

          {isCancelled || isRefunded ? (
            <StatusExplanation variant="danger" text="This booking is closed." />
          ) : null}

          {!isUpcoming && !isCompleted && !isClosed && !isDisputed ? (
            <StatusExplanation variant="muted" text="This call time has passed." />
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 md:min-w-[170px]">
          {isPending ? (
            <Link
              href={`/buyer/bookings/${booking.id}/checkout`}
              className="btn btn-primary"
            >
              Complete payment
            </Link>
          ) : null}

          {canJoin ? (
            <Link href={`/calls/${booking.id}`} className="btn btn-primary">
              Join call
              <Video size={17} />
            </Link>
          ) : null}

          {canReview ? (
            <Link
              href={`/buyer/reviews?bookingId=${booking.id}`}
              className="btn btn-primary"
            >
              Leave review
              <Star size={17} />
            </Link>
          ) : null}

          {isCompleted && booking.review ? (
            <Link href="/buyer/reviews" className="btn btn-secondary">
              View review
            </Link>
          ) : null}

          {isCompleted && booking.outcome?.isVisibleToBuyer ? (
            <Link
              href={`/buyer/bookings/${booking.id}/outcome`}
              className="btn btn-primary"
            >
              View action plan
            </Link>
          ) : null}

          <Link
            href={`/experts/${booking.expertId}`}
            className="btn btn-secondary"
          >
            View helper
          </Link>

          {needsSupportForCancellation ? (
            <Link
              href={`/contact?subject=${encodeURIComponent(
                `Cancel booking ${booking.id}`,
              )}`}
              className="btn btn-secondary"
            >
              Contact support
            </Link>
          ) : null}

          {canCancel ? (
            <form action={cancelBookingAction}>
              <input type="hidden" name="bookingId" value={booking.id} />

              <button type="submit" className="btn btn-danger w-full">
                Cancel
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {canReport ? (
        <div className="mt-4">
          <ReportBookingForm bookingId={booking.id} />
        </div>
      ) : null}
    </div>
  );
}

function BookingNote({
  note,
  className = "",
}: {
  note: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 ${className}`}
    >
      <div className="flex gap-3">
        <MessageCircle
          size={18}
          className="mt-0.5 shrink-0 text-[var(--primary-dark)]"
        />

        <div>
          <p className="text-sm font-bold text-[var(--foreground)]">
            Your note
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            {note}
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Video;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card soft className="p-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={20} />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
        {value}
      </p>

      <p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]">
        {hint}
      </p>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return <Badge variant="success">Completed</Badge>;
  }

  if (status === "CANCELLED") {
    return <Badge variant="danger">Cancelled</Badge>;
  }

  if (status === "REFUNDED") {
    return <Badge variant="danger">Refunded</Badge>;
  }

  if (status === "EXPIRED") {
    return <Badge variant="accent">Expired</Badge>;
  }

  if (status === "CONFIRMED") {
    return <Badge variant="success">Confirmed</Badge>;
  }

  if (status === "PAID") {
    return <Badge variant="primary">Confirming</Badge>;
  }

  if (status === "PENDING") {
    return <Badge variant="accent">Pending payment</Badge>;
  }

  if (status === "DISPUTED") {
    return (
      <Badge variant="danger">
        <ShieldAlert size={14} />
        Disputed
      </Badge>
    );
  }

  return <Badge variant="accent">{status.toLowerCase()}</Badge>;
}

function SmallPill({
  icon: Icon,
  text,
}: {
  icon: typeof Clock3;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-xs font-bold text-[var(--muted-foreground)]">
      <Icon size={13} />
      {text}
    </span>
  );
}

function InfoRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3">
      <p className="text-sm font-medium text-[var(--muted-foreground)]">
        {label}
      </p>
      <p
        className={
          strong
            ? "text-right text-sm font-bold text-[var(--primary-dark)]"
            : "text-right text-sm font-bold text-[var(--foreground)]"
        }
      >
        {value}
      </p>
    </div>
  );
}

function MiniMoney({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p
        className={
          strong
            ? "mt-1 font-bold text-[var(--primary-dark)]"
            : "mt-1 font-bold text-[var(--foreground)]"
        }
      >
        {value}
      </p>
    </div>
  );
}

function StatusExplanation({
  text,
  variant,
}: {
  text: string;
  variant: "warning" | "primary" | "success" | "danger" | "muted" | "accent";
}) {
  const className =
    variant === "warning"
      ? "mt-4 rounded-2xl border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-3 text-sm font-bold text-[var(--warning)]"
      : variant === "primary"
        ? "mt-4 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary-soft)] p-3 text-sm font-bold text-[var(--primary-dark)]"
        : variant === "success"
          ? "mt-4 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-3 text-sm font-bold text-[var(--success)]"
          : variant === "danger"
            ? "mt-4 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-3 text-sm font-bold text-[var(--danger)]"
            : variant === "accent"
              ? "mt-4 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-3 text-sm font-bold text-[var(--accent)]"
              : "mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3 text-sm font-medium text-[var(--muted-foreground)]";

  return <p className={className}>{text}</p>;
}

function Tip({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Star;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <Icon size={17} className="mt-0.5 shrink-0 text-[var(--accent)]" />
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

function getBookingPricing(booking: {
  priceCents: number;
  clientServiceFeeCents?: number | null;
  clientTotalCents?: number | null;
}) {
  const fallback = calculatePricingBreakdown(booking.priceCents);

  return {
    servicePriceCents: booking.priceCents,
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

function formatMoney(cents: number) {
  return formatMoneyFromCents(cents);
}

function formatStatus(status: string) {
  if (status === "PENDING") {
    return "Pending payment";
  }

  if (status === "PAID") {
    return "Confirming";
  }

  if (status === "CONFIRMED") {
    return "Confirmed";
  }

  if (status === "COMPLETED") {
    return "Completed";
  }

  if (status === "CANCELLED") {
    return "Cancelled";
  }

  if (status === "REFUNDED") {
    return "Refunded";
  }

  if (status === "EXPIRED") {
    return "Expired";
  }

  if (status === "DISPUTED") {
    return "Disputed";
  }

  return status.toLowerCase();
}

function getTopMessage({
  payment,
  paid,
  booked,
  error,
}: {
  payment?: string;
  paid?: string;
  booked?: string;
  error?: string;
}) {
  if (payment === "success" || paid) {
    return {
      variant: "success" as const,
      text: "Payment received. If confirmation is not visible yet, it will appear shortly.",
    };
  }

  if (booked) {
    return {
      variant: "success" as const,
      text: "Booking saved. Complete payment to confirm your call.",
    };
  }

  if (error === "booking-expired") {
    return {
      variant: "danger" as const,
      text: "This booking expired. Please choose a new time slot.",
    };
  }

  if (error === "booking-not-found") {
    return {
      variant: "danger" as const,
      text: "This booking could not be found.",
    };
  }

  if (error === "cannot-cancel") {
    return {
      variant: "danger" as const,
      text: "This booking cannot be cancelled anymore.",
    };
  }

  if (error === "confirmed-booking-needs-refund") {
    return {
      variant: "danger" as const,
      text: "This booking is already confirmed. Please contact support so the refund policy can be applied correctly.",
    };
  }

  if (error === "refund-must-use-stripe") {
    return {
      variant: "danger" as const,
      text: "Refunds must be processed through Stripe and support/admin workflow.",
    };
  }

  if (error === "booking-closed") {
    return {
      variant: "danger" as const,
      text: "This booking is already closed.",
    };
  }

  if (error === "checkout-cancelled") {
    return {
      variant: "danger" as const,
      text: "Checkout was cancelled. Your booking still needs payment to be confirmed.",
    };
  }

  return null;
}