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

type BuyerBookingsPageProps = {
  searchParams?: Promise<{
    booked?: string;
    paid?: string;
    payment?: string;
    error?: string;
    booking?: string;
  }>;
};

export default async function BuyerBookingsPage({
  searchParams,
}: BuyerBookingsPageProps) {
  const { user } = await requireRole(["buyer", "admin"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const buyer = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!buyer) {
    redirect("/sign-in");
  }

  await releaseExpiredPendingBookings();

  const now = new Date();

  const bookings = await prisma.booking.findMany({
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
    },
    orderBy: {
      startTime: "desc",
    },
  });

  const upcomingBookings = bookings
    .filter(
      (booking) =>
        booking.startTime >= now &&
        booking.status !== "CANCELLED" &&
        booking.status !== "REFUNDED" &&
        booking.status !== "COMPLETED" &&
        booking.status !== "DISPUTED",
    )
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const confirmedUpcomingBookings = upcomingBookings.filter(
    (booking) => booking.status === "CONFIRMED",
  );

  const completedBookings = bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const closedBookings = bookings.filter(
    (booking) =>
      booking.status === "CANCELLED" ||
      booking.status === "REFUNDED" ||
      booking.status === "DISPUTED",
  );

  const waitingReviewBookings = bookings.filter(
    (booking) => booking.status === "COMPLETED" && !booking.review,
  );

  const pendingPaymentBookings = bookings.filter(
    (booking) => booking.status === "PENDING" && booking.startTime >= now,
  );

  const paidWaitingConfirmationBookings = bookings.filter(
    (booking) => booking.status === "PAID",
  );

  const nextBooking = upcomingBookings[0] ?? null;

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

  const totalPaidCents = bookings
    .filter(
      (booking) =>
        booking.status === "PAID" ||
        booking.status === "CONFIRMED" ||
        booking.status === "COMPLETED",
    )
    .reduce(
      (sum, booking) => sum + getBookingPricing(booking).clientTotalCents,
      0,
    );

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <Link
            href="/buyer"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>

          {topMessage ? (
            <div
              className={
                topMessage.variant === "success"
                  ? "mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black text-[var(--success)]"
                  : "mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-black text-[var(--danger)]"
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
                Your calls and reservations.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Complete payments, join confirmed calls, review past sessions and
                manage every booking from one place.
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
              value={String(upcomingBookings.length)}
              hint="Reserved or scheduled calls"
            />

            <MiniStat
              icon={CheckCircle2}
              label="Confirmed"
              value={String(confirmedUpcomingBookings.length)}
              hint="Ready for call window"
            />

            <MiniStat
              icon={Clock3}
              label="Payment"
              value={String(pendingPaymentBookings.length)}
              hint="Waiting for payment"
            />

            <MiniStat
              icon={Star}
              label="Reviews"
              value={String(waitingReviewBookings.length)}
              hint="Waiting feedback"
            />

            <MiniStat
              icon={Euro}
              label="Paid"
              value={formatMoney(totalPaidCents)}
              hint="Total confirmed spend"
            />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
          <div className="grid gap-6">
            <Card className="p-5 md:p-6">
              <Badge variant={nextBooking ? "success" : "accent"}>
                <Video size={14} />
                Next call
              </Badge>

              {nextBooking ? (
                <NextBookingPanel booking={nextBooking} />
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

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  Complete payment to confirm your calls.
                </h2>

                <p className="mt-2 text-sm font-bold leading-6 text-muted">
                  Pending reservations are held only for a short time. If the
                  countdown expires, the slot becomes available again.
                </p>

                <div className="mt-6 grid gap-4">
                  {pendingPaymentBookings.slice(0, 3).map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      highlighted={booking.id === highlightedBookingId}
                    />
                  ))}
                </div>
              </Card>
            ) : null}

            {paidWaitingConfirmationBookings.length > 0 ? (
              <Card className="border-[var(--primary)]/20 bg-[var(--primary-soft)] p-5 md:p-6">
                <Badge variant="primary">
                  <Euro size={14} />
                  Paid bookings
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  Payment received, confirmation pending.
                </h2>

                <p className="mt-2 text-sm font-bold leading-6 text-muted">
                  These bookings have payment received but are waiting for final
                  confirmation. If this stays here too long, contact support.
                </p>

                <div className="mt-6 grid gap-4">
                  {paidWaitingConfirmationBookings.slice(0, 3).map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      highlighted={booking.id === highlightedBookingId}
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

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  Leave feedback after your calls.
                </h2>

                <p className="mt-2 text-sm font-bold leading-6 text-muted">
                  Reviews help good providers grow and help other clients choose
                  safely.
                </p>

                <div className="mt-6 grid gap-4">
                  {waitingReviewBookings.slice(0, 3).map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      highlighted={booking.id === highlightedBookingId}
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
                  text="Your note helps the provider understand your problem before the call."
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

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  Booking history
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-muted">
                  Upcoming, completed, cancelled, refunded and disputed calls
                  appear here.
                </p>
              </div>

              <Badge>{bookings.length} total</Badge>
            </div>

            <div className="mt-6 grid gap-4">
              {bookings.length > 0 ? (
                bookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    highlighted={booking.id === highlightedBookingId}
                  />
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-white/55 p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                    <Search size={24} />
                  </div>

                  <h3 className="mt-5 text-2xl font-black tracking-[-0.04em]">
                    No bookings yet
                  </h3>

                  <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-muted">
                    Find an expert, choose a service and pick an available time.
                    Your booking will appear here.
                  </p>

                  <div className="mt-5">
                    <ButtonLink href="/experts">
                      Browse experts
                      <Search size={18} />
                    </ButtonLink>
                  </div>
                </div>
              )}
            </div>

            {closedBookings.length > 0 ? (
              <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white/55 p-4">
                <div className="flex items-center gap-3">
                  <XCircle size={18} className="text-muted" />
                  <p className="text-sm font-bold leading-6 text-muted">
                    You have {closedBookings.length} closed booking
                    {closedBookings.length === 1 ? "" : "s"}.
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

function NextBookingPanel({ booking }: { booking: BookingCardBooking }) {
  const pricing = getBookingPricing(booking);
  const providerName = booking.expert.user.name ?? booking.expert.user.email;
  const canJoin = canJoinBooking(booking);

  return (
    <div className="mt-5">
      <h2 className="text-3xl font-black tracking-[-0.05em]">
        {booking.service?.title ?? "Booked call"}
      </h2>

      <p className="mt-3 text-sm font-semibold leading-6 text-muted">
        With{" "}
        <span className="font-black text-[var(--foreground)]">
          {providerName}
        </span>
      </p>

      <div className="mt-5 grid gap-3">
        <InfoRow label="Date" value={formatDateTime(booking.startTime)} />

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
          View provider
        </ButtonLink>
      </div>

      {booking.status === "CONFIRMED" && !canJoin ? (
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
          <div className="flex gap-3">
            <Clock3 size={18} className="mt-0.5 text-[var(--primary-dark)]" />
            <p className="text-sm font-bold leading-6 text-muted">
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
    <div className="mt-6 rounded-[24px] border border-dashed border-[var(--border-strong)] bg-white/55 p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <CalendarDays size={24} />
      </div>

      <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
        No upcoming calls
      </h2>

      <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-muted">
        Find a provider, choose a service and book a time that works for you.
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
};

function BookingCard({
  booking,
  highlighted,
}: {
  booking: BookingCardBooking;
  highlighted: boolean;
}) {
  const now = new Date();

  const pricing = getBookingPricing(booking);

  const isPending = booking.status === "PENDING";
  const isPaid = booking.status === "PAID";
  const isConfirmed = booking.status === "CONFIRMED";
  const isCompleted = booking.status === "COMPLETED";
  const isDisputed = booking.status === "DISPUTED";
  const isRefunded = booking.status === "REFUNDED";
  const isCancelled = booking.status === "CANCELLED" || isRefunded;

  const isUpcoming = booking.startTime >= now && !isCancelled && !isCompleted;
  const canJoin = canJoinBooking(booking);
  const canCancel =
    (booking.status === "PENDING" || booking.status === "CONFIRMED") &&
    booking.startTime > now;
  const canReview = isCompleted && !booking.review;

  const providerName = booking.expert.user.name ?? booking.expert.user.email;

  return (
    <div
      className={
        highlighted
          ? "rounded-[26px] border border-[var(--success)]/30 bg-[var(--success-soft)] p-4"
          : canReview
            ? "rounded-[26px] border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-4"
            : isPending
              ? "rounded-[26px] border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-4"
              : "rounded-[26px] border border-[var(--border)] bg-white/64 p-4"
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
          </div>

          <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
            {booking.service?.title ?? "Booked call"}
          </h3>

          <p className="mt-2 text-sm font-semibold leading-6 text-muted">
            With{" "}
            <span className="font-black text-[var(--foreground)]">
              {providerName}
            </span>
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <SmallPill icon={Clock3} text={formatDateTime(booking.startTime)} />

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
              label="Service"
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

          {isConfirmed && !canJoin ? (
            <StatusExplanation
              variant="success"
              text="Booking confirmed. The call room opens near the scheduled time."
            />
          ) : null}

          {isDisputed ? (
            <StatusExplanation
              variant="danger"
              text="This booking is under SkillDrop review."
            />
          ) : null}

          {isCancelled ? (
            <StatusExplanation variant="danger" text="This booking is closed." />
          ) : null}

          {!isUpcoming && !isCompleted && !isCancelled && !isDisputed ? (
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

          <Link
            href={`/experts/${booking.expertId}`}
            className="btn btn-secondary"
          >
            View provider
          </Link>

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
      className={`rounded-2xl border border-[var(--border)] bg-white/64 p-4 ${className}`}
    >
      <div className="flex gap-3">
        <MessageCircle
          size={18}
          className="mt-0.5 shrink-0 text-[var(--primary-dark)]"
        />

        <div>
          <p className="text-sm font-black">Your note</p>
          <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-muted">
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

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{value}</p>

      <p className="mt-1 text-sm font-semibold text-muted">{hint}</p>
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

  if (status === "CONFIRMED") {
    return <Badge variant="success">Confirmed</Badge>;
  }

  if (status === "PAID") {
    return <Badge variant="primary">Paid</Badge>;
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
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/64 px-3 py-1.5 text-xs font-black text-[var(--muted-foreground)]">
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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p
        className={
          strong
            ? "text-right text-sm font-black text-[var(--primary-dark)]"
            : "text-right text-sm font-black"
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
    <div className="rounded-2xl border border-[var(--border)] bg-white/55 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p
        className={
          strong
            ? "mt-1 font-black text-[var(--primary-dark)]"
            : "mt-1 font-black"
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
  variant: "warning" | "primary" | "success" | "danger" | "muted";
}) {
  const className =
    variant === "warning"
      ? "mt-4 rounded-2xl border border-[var(--warning)]/20 bg-white/55 p-3 text-sm font-bold text-[var(--warning)]"
      : variant === "primary"
        ? "mt-4 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary-soft)] p-3 text-sm font-bold text-[var(--primary-dark)]"
        : variant === "success"
          ? "mt-4 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-3 text-sm font-bold text-[var(--success)]"
          : variant === "danger"
            ? "mt-4 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-3 text-sm font-bold text-[var(--danger)]"
            : "mt-4 rounded-2xl border border-[var(--border)] bg-white/55 p-3 text-sm font-bold text-muted";

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
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <Icon size={17} className="mt-0.5 shrink-0 text-[var(--accent)]" />
      <div>
        <p className="font-black tracking-[-0.02em]">{title}</p>
        <p className="mt-1 text-sm font-bold leading-6 text-muted">{text}</p>
      </div>
    </div>
  );
}

function canJoinBooking(booking: {
  startTime: Date;
  endTime: Date;
  status: string;
  callRoom: {
    roomUrl: string;
  } | null;
}) {
  const now = new Date();
  const joinWindowStart = new Date(booking.startTime.getTime() - 10 * 60 * 1000);
  const joinWindowEnd = new Date(booking.endTime.getTime() + 15 * 60 * 1000);

  return (
    booking.status === "CONFIRMED" &&
    Boolean(booking.callRoom?.roomUrl) &&
    now >= joinWindowStart &&
    now <= joinWindowEnd
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

function getDurationMinutes(startTime: Date, endTime: Date) {
  return Math.max(
    Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60),
    0,
  );
}

function formatMoney(cents: number) {
  return formatMoneyFromCents(cents);
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

function formatStatus(status: string) {
  if (status === "PENDING") {
    return "Pending payment";
  }

  if (status === "PAID") {
    return "Paid";
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
      text: "Payment received. Your booking is being confirmed.",
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

  if (error === "checkout-cancelled") {
    return {
      variant: "danger" as const,
      text: "Checkout was cancelled. Your booking still needs payment to be confirmed.",
    };
  }

  return null;
}