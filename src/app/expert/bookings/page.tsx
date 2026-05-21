import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Euro,
  Mail,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Star,
  UserRound,
  Video,
  WalletCards,
  XCircle,
} from "lucide-react";
import {
  formatDateTime,
  getDurationMinutes,
  isBookingJoinAvailable,
} from "@/lib/date-time";
import {
  releaseExpiredPendingBookings,
  updateBookingStatusAction,
} from "@/server/actions/booking.actions";
import { markCallCompletedAction } from "@/server/actions/call.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  calculatePricingBreakdown,
  formatMoneyFromCents,
} from "@/config/pricing";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReportBookingForm } from "@/components/bookings/report-booking-form";
import { getBookingStatusUi } from "@/lib/booking-status-ui";

type ExpertBookingsPageProps = {
  searchParams?: Promise<{
    error?: string;
    completed?: string;
  }>;
};

export default async function ExpertBookingsPage({
  searchParams,
}: ExpertBookingsPageProps) {
  const { user } = await requireRole(["expert", "admin"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};

  await releaseExpiredPendingBookings();

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const expert = await prisma.expertProfile.findFirst({
    where: {
      user: {
        email,
      },
    },
    include: {
      user: true,
      bookings: {
        include: {
          buyer: true,
          service: true,
          callRoom: true,
          review: true,
        },
        orderBy: {
          startTime: "desc",
        },
      },
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  const now = new Date();

  const upcomingBookings = expert.bookings
    .filter(
      (booking) =>
        booking.startTime >= now &&
        booking.status !== "CANCELLED" &&
        booking.status !== "REFUNDED" &&
        booking.status !== "COMPLETED" &&
        booking.status !== "DISPUTED",
    )
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const pendingPaymentBookings = expert.bookings.filter(
    (booking) => booking.status === "PENDING" && booking.startTime >= now,
  );

  const paidWaitingConfirmationBookings = expert.bookings.filter(
    (booking) => booking.status === "PAID" && booking.startTime >= now,
  );

  const confirmedBookings = expert.bookings.filter(
    (booking) => booking.status === "CONFIRMED" && booking.startTime >= now,
  );

  const completedBookings = expert.bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const closedBookings = expert.bookings.filter(
    (booking) =>
      booking.status === "CANCELLED" ||
      booking.status === "REFUNDED" ||
      booking.status === "DISPUTED",
  );

  const pastUncompletedBookings = expert.bookings
    .filter((booking) => booking.endTime < now && booking.status === "CONFIRMED")
    .sort((a, b) => b.endTime.getTime() - a.endTime.getTime());

  const nextBooking = upcomingBookings[0] ?? null;
  const topMessage = getTopMessage(resolvedSearchParams.error);

  const completedNetCents = completedBookings.reduce(
    (sum, booking) => sum + getBookingPricing(booking).providerNetCents,
    0,
  );

  const upcomingNetCents = confirmedBookings.reduce(
    (sum, booking) => sum + getBookingPricing(booking).providerNetCents,
    0,
  );

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />
        <div className="absolute left-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[420px] w-[420px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <Link
            href="/expert"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>

          {topMessage ? (
            <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-black text-[var(--danger)]">
              {topMessage}
            </div>
          ) : null}

          {resolvedSearchParams.completed ? (
            <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black text-[var(--success)]">
              Call marked as completed. The buyer can now leave a review.
            </div>
          ) : null}

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Badge variant="primary">
                <CalendarDays size={14} />
                Helper bookings
              </Badge>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Manage your buyer calls.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Join upcoming sessions, read buyer notes, complete finished
                calls, track payout estimates and keep every booking clear from
                one workspace.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
              <ButtonLink href="/expert/availability">
                Add availability
              </ButtonLink>

              <ButtonLink href="/expert/earnings" variant="secondary">
                Earnings
              </ButtonLink>

              <ButtonLink href="/expert/stats" variant="secondary">
                View statistics
              </ButtonLink>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              icon={Video}
              label="Upcoming"
              value={String(upcomingBookings.length)}
              hint="Reserved or scheduled calls"
            />

            <MetricCard
              icon={Clock3}
              label="Needs action"
              value={String(pastUncompletedBookings.length)}
              hint="Past calls not completed"
            />

            <MetricCard
              icon={CheckCircle2}
              label="Completed"
              value={String(completedBookings.length)}
              hint={formatMoney(completedNetCents)}
            />

            <MetricCard
              icon={WalletCards}
              label="Upcoming net"
              value={formatMoney(upcomingNetCents)}
              hint="If confirmed calls complete"
            />

            <MetricCard
              icon={XCircle}
              label="Closed"
              value={String(closedBookings.length)}
              hint="Cancelled / refunded / disputed"
            />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr] xl:items-start">
          <div className="grid gap-6">
            <Card className="p-5 md:p-6">
              <Badge variant={nextBooking ? "success" : "accent"}>
                <Video size={14} />
                Next call
              </Badge>

              {nextBooking ? (
                <NextBookingPanel booking={nextBooking} />
              ) : (
                <EmptyState
                  title="No upcoming calls"
                  text="When buyers book your open slots, the next call will appear here."
                />
              )}
            </Card>

            {pastUncompletedBookings.length > 0 ? (
              <Card className="border-[var(--accent)]/20 bg-[var(--accent-soft)] p-5 md:p-6">
                <Badge variant="accent">
                  <Clock3 size={14} />
                  Needs action
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  Past calls waiting for completion.
                </h2>

                <p className="mt-2 text-sm font-bold leading-6 text-muted">
                  Mark completed calls as completed so buyers can leave reviews
                  and your earnings can be counted correctly.
                </p>

                <div className="mt-6 grid gap-4">
                  {pastUncompletedBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      important
                      highlighted={booking.id === resolvedSearchParams.completed}
                    />
                  ))}
                </div>
              </Card>
            ) : null}

            {pendingPaymentBookings.length > 0 ? (
              <Card className="border-[var(--warning)]/20 bg-[var(--warning-soft)] p-5 md:p-6">
                <Badge variant="accent">
                  <Clock3 size={14} />
                  Waiting for payment
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  Buyers reserved these slots.
                </h2>

                <p className="mt-2 text-sm font-bold leading-6 text-muted">
                  These reservations are waiting for buyer payment. If payment
                  is not completed in time, the slot becomes available again.
                </p>

                <div className="mt-6 grid gap-4">
                  {pendingPaymentBookings.slice(0, 4).map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      important
                      highlighted={booking.id === resolvedSearchParams.completed}
                    />
                  ))}
                </div>
              </Card>
            ) : null}

            {paidWaitingConfirmationBookings.length > 0 ? (
              <Card className="border-[var(--primary)]/20 bg-[var(--primary-soft)] p-5 md:p-6">
                <Badge variant="primary">
                  <Euro size={14} />
                  Paid, confirmation pending
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  Payment received.
                </h2>

                <p className="mt-2 text-sm font-bold leading-6 text-muted">
                  These bookings have payment received but are waiting for final
                  webhook confirmation. If this stays too long, check Stripe
                  webhook logs.
                </p>

                <div className="mt-6 grid gap-4">
                  {paidWaitingConfirmationBookings.slice(0, 4).map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      important
                      highlighted={booking.id === resolvedSearchParams.completed}
                    />
                  ))}
                </div>
              </Card>
            ) : null}

            <Card soft className="p-5 md:p-6">
              <Badge variant="primary">
                <ShieldCheck size={14} />
                Helper tips
              </Badge>

              <div className="mt-5 grid gap-3">
                <Tip text="Read the buyer note before the call so you can prepare faster." />
                <Tip text="Paid bookings are confirmed automatically after Stripe webhook success." />
                <Tip text="Complete calls after the session so buyers can leave reviews." />
                <Tip text="Keep your availability fresh every week to stay bookable." />
              </div>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card className="p-5 md:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <Badge variant="primary">
                    <CalendarDays size={14} />
                    All bookings
                  </Badge>

                  <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                    Booking history
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-muted">
                    Pending, paid, confirmed, completed, cancelled, refunded and
                    disputed buyer calls.
                  </p>
                </div>

                <Badge>{expert.bookings.length} total</Badge>
              </div>

              <div className="mt-6 grid gap-4">
                {expert.bookings.length > 0 ? (
                  expert.bookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      highlighted={booking.id === resolvedSearchParams.completed}
                    />
                  ))
                ) : (
                  <EmptyState
                    title="No bookings yet"
                    text="Bookings will appear here after buyers reserve your time."
                  />
                )}
              </div>

              {confirmedBookings.length > 0 ? (
                <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white/55 p-4">
                  <div className="flex items-center gap-3">
                    <Video size={18} className="text-muted" />
                    <p className="text-sm font-bold leading-6 text-muted">
                      You have {confirmedBookings.length} confirmed booking
                      {confirmedBookings.length === 1 ? "" : "s"}.
                    </p>
                  </div>
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

type ExpertBooking = {
  id: string;
  expertId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  priceCents: number;
  platformFeeCents: number | null;
  providerNetCents: number | null;
  clientServiceFeeCents: number | null;
  clientTotalCents: number | null;
  note: string | null;
  buyer: {
    name: string | null;
    email: string;
  };
  service: {
    title: string;
    durationMinutes: number;
  } | null;
  callRoom: {
    roomUrl: string;
  } | null;
  review: {
    rating: number;
    comment: string | null;
  } | null;
};

function NextBookingPanel({ booking }: { booking: ExpertBooking }) {
  const pricing = getBookingPricing(booking);
  const canJoin = canJoinBooking(booking);
  const now = new Date();
  const buyerName = booking.buyer.name ?? booking.buyer.email;

  return (
    <div className="mt-5">
      <h2 className="text-3xl font-black tracking-[-0.05em]">
        {booking.service?.title ?? "Buyer call"}
      </h2>

      <p className="mt-3 text-sm font-semibold leading-6 text-muted">
        Buyer:{" "}
        <span className="font-black text-[var(--foreground)]">
          {buyerName}
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
          label="Offer price"
          value={formatMoney(pricing.servicePriceCents)}
        />

        <InfoRow
          label="Your net estimate"
          value={formatMoney(pricing.providerNetCents)}
          strong
        />

        <InfoRow label="Status" value={formatStatus(booking.status)} />
      </div>

      {booking.note ? <BuyerNote note={booking.note} className="mt-5" /> : null}

      {!booking.note && booking.status === "CONFIRMED" ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] bg-white/55 p-4">
          <div className="flex gap-3">
            <MessageCircle
              size={18}
              className="mt-0.5 shrink-0 text-[var(--primary-dark)]"
            />
            <p className="text-sm font-bold leading-6 text-muted">
              No buyer note was added. Prepare a few clarifying questions before
              the call.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {canJoin ? (
          <Link href={`/calls/${booking.id}`} className="btn btn-primary">
            Join call
            <Video size={18} />
          </Link>
        ) : null}

        {booking.status === "CONFIRMED" && booking.endTime <= now ? (
          <CompleteCallForm bookingId={booking.id} />
        ) : null}

        {(booking.status === "PENDING" || booking.status === "CONFIRMED") &&
        booking.startTime > now ? (
          <CancelCallForm bookingId={booking.id} />
        ) : null}
      </div>

      {booking.status === "CONFIRMED" && !canJoin ? (
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
          <div className="flex gap-3">
            <Clock3 size={18} className="mt-0.5 text-[var(--primary-dark)]" />
            <p className="text-sm font-bold leading-6 text-muted">
              The call room opens 10 minutes before start and remains available
              for 15 minutes after the scheduled end.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BookingCard({
  booking,
  important = false,
  highlighted = false,
}: {
  booking: ExpertBooking;
  important?: boolean;
  highlighted?: boolean;
}) {
  const now = new Date();
  const pricing = getBookingPricing(booking);

  const statusUi = getBookingStatusUi({
   status: booking.status,
   role: "expert",
 });

  const isPending = booking.status === "PENDING";
  const isPaid = booking.status === "PAID";
  const isConfirmed = booking.status === "CONFIRMED";
  const isCompleted = booking.status === "COMPLETED";
  const isCancelled =
    booking.status === "CANCELLED" || booking.status === "REFUNDED";
  const isDisputed = booking.status === "DISPUTED";

  const canJoin = canJoinBooking(booking);
  const canComplete = isConfirmed && booking.endTime <= now;
  const canCancel = (isPending || isConfirmed) && booking.startTime > now;
  const canReport = ["PAID", "CONFIRMED", "COMPLETED"].includes(
    booking.status,
  );
  const buyerName = booking.buyer.name ?? "Buyer";

  return (
    <div
      className={
        highlighted
          ? "rounded-[26px] border border-[var(--success)]/30 bg-[var(--success-soft)] p-4"
          : important
            ? "rounded-[26px] border border-[var(--accent)]/30 bg-white/70 p-4"
            : canComplete
              ? "rounded-[26px] border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-4"
              : isPending
                ? "rounded-[26px] border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-4"
                : "rounded-[26px] border border-[var(--border)] bg-white/64 p-4"
      }
    >
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={booking.status} />

            {highlighted ? (
              <Badge variant="success">
                <CheckCircle2 size={14} />
                Updated
              </Badge>
            ) : null}

            {booking.note ? (
              <Badge variant="primary">
                <MessageCircle size={14} />
                Buyer note
              </Badge>
            ) : null}

            {booking.review ? (
              <Badge variant="success">
                <Star size={14} />
                Reviewed
              </Badge>
            ) : null}

            {isPending ? (
              <Badge variant="accent">
                <Clock3 size={14} />
                Waiting payment
              </Badge>
            ) : null}

            {isPaid ? (
              <Badge variant="primary">
                <Euro size={14} />
                Payment received
              </Badge>
            ) : null}

            {canJoin ? (
              <Badge variant="success">
                <Video size={14} />
                Join now
              </Badge>
            ) : null}

            {canComplete ? (
              <Badge variant="accent">
                <Clock3 size={14} />
                Needs completion
              </Badge>
            ) : null}

            {isCompleted && !booking.review ? (
              <Badge variant="primary">Awaiting review</Badge>
            ) : null}
          </div>

          <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
            {booking.service?.title ?? "Buyer call"}
          </h3>

          <div className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-muted">
            <p className="inline-flex items-center gap-2">
              <UserRound size={15} />
              {buyerName}
            </p>

            <p className="inline-flex items-center gap-2">
              <Mail size={15} />
              {booking.buyer.email}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <SmallPill icon={Clock3} text={formatDateTime(booking.startTime)} />

            <SmallPill
              icon={Video}
              text={`${getDurationMinutes(
                booking.startTime,
                booking.endTime,
              )} min`}
            />

            <SmallPill
              icon={Euro}
              text={formatMoney(pricing.servicePriceCents)}
            />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <MiniMoney
              label="Offer"
              value={formatMoney(pricing.servicePriceCents)}
            />

            <MiniMoney
              label="Commission"
              value={formatMoney(pricing.providerCommissionCents)}
            />

            <MiniMoney
              label="Net estimate"
              value={formatMoney(pricing.providerNetCents)}
              strong
            />
          </div>

          {booking.note ? (
            <BuyerNote note={booking.note} className="mt-4" />
          ) : null}

          <StatusExplanation
            variant={statusUi.variant}
            text={`${statusUi.description} Next step: ${statusUi.nextAction}.`}
          />

          {isPending ? (
            <StatusExplanation
              variant="warning"
              text="This reservation is waiting for buyer payment."
            />
          ) : null}

          {isPaid ? (
            <StatusExplanation
              variant="primary"
              text="Payment was received. Final confirmation may still be processing through Stripe webhook."
            />
          ) : null}

          {isConfirmed && !canJoin && booking.endTime > now ? (
            <StatusExplanation
              variant="success"
              text="Booking confirmed. The call room opens near the scheduled time."
            />
          ) : null}

          {isCancelled ? (
            <StatusExplanation
              variant="danger"
              text="This booking is closed and the slot is no longer active."
            />
          ) : null}

          {isDisputed ? (
            <StatusExplanation
              variant="danger"
              text="This booking is disputed and is under SkillDrop review."
            />
          ) : null}

          {booking.review ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
              <p className="flex items-center gap-2 text-sm font-black">
                <Star size={15} fill="currentColor" />
                Buyer review: {booking.review.rating}/5
              </p>

              <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                {booking.review.comment || "No comment left."}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 lg:min-w-[170px]">
          {canJoin ? (
            <Link href={`/calls/${booking.id}`} className="btn btn-primary">
              Join call
              <Video size={17} />
            </Link>
          ) : null}

          {canComplete ? <CompleteCallForm bookingId={booking.id} /> : null}

          {canCancel ? <CancelCallForm bookingId={booking.id} /> : null}
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

function BuyerNote({
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
          <p className="text-sm font-black">Buyer note</p>
          <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-muted">
            {note}
          </p>
        </div>
      </div>
    </div>
  );
}

function CompleteCallForm({ bookingId }: { bookingId: string }) {
  return (
    <form action={markCallCompletedAction}>
      <input type="hidden" name="bookingId" value={bookingId} />

      <button type="submit" className="btn btn-primary w-full">
        <CheckCircle2 size={17} />
        Complete call
      </button>
    </form>
  );
}

function CancelCallForm({ bookingId }: { bookingId: string }) {
  return (
    <form action={updateBookingStatusAction}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="status" value="CANCELLED" />

      <button type="submit" className="btn btn-danger w-full">
        Cancel
      </button>
    </form>
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

  if (status === "DISPUTED") {
    return (
      <Badge variant="danger">
        <ShieldAlert size={14} />
        Disputed
      </Badge>
    );
  }

  if (status === "PENDING") {
    return <Badge variant="accent">Pending payment</Badge>;
  }

  return <Badge variant="accent">{status.toLowerCase()}</Badge>;
}

function MetricCard({
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
  variant: "warning" | "primary" | "success" | "danger" | "muted" | "accent";
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

function Tip({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <Star size={17} className="mt-0.5 shrink-0 text-[var(--accent)]" />
      <p className="text-sm font-bold leading-6 text-muted">{text}</p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-5 rounded-[24px] border border-dashed border-[var(--border-strong)] bg-white/55 p-7 text-center">
      <h3 className="text-2xl font-black tracking-[-0.04em]">{title}</h3>

      <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-muted">
        {text}
      </p>
    </div>
  );
}


function getBookingPricing(booking: {
  priceCents: number;
  platformFeeCents?: number | null;
  providerNetCents?: number | null;
}) {
  const fallback = calculatePricingBreakdown(booking.priceCents);

  return {
    servicePriceCents: booking.priceCents,
    providerCommissionCents:
      typeof booking.platformFeeCents === "number"
        ? booking.platformFeeCents
        : fallback.providerCommissionCents,
    providerNetCents:
      typeof booking.providerNetCents === "number"
        ? booking.providerNetCents
        : fallback.providerNetCents,
  };
}


function formatMoney(cents: number) {
  return formatMoneyFromCents(cents);
}

function canJoinBooking(booking: {
  startTime: Date;
  endTime: Date;
  status: string;
  callRoom: {
    roomUrl: string;
  } | null;
}) {
  return isBookingJoinAvailable({
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    hasRoom: Boolean(booking.callRoom?.roomUrl),
  });
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

function getTopMessage(error?: string) {
  if (error === "cannot-confirm") {
    return "This booking cannot be confirmed right now.";
  }

  if (error === "cannot-complete") {
    return "This booking cannot be marked as completed right now.";
  }

  if (error === "call-not-ended") {
    return "You can mark the call as completed only after the scheduled end time.";
  }

  if (error === "call-not-started") {
    return "You can mark the call as completed only after the call has started.";
  }

  if (error === "call-not-confirmed") {
    return "This call is not confirmed yet.";
  }

  if (error === "not-confirmed") {
    return "This booking is not confirmed yet.";
  }

  if (error === "cannot-cancel") {
    return "This booking cannot be cancelled anymore.";
  }

  if (error === "not-allowed") {
    return "You are not allowed to perform this action.";
  }

  if (error === "invalid-status") {
    return "Invalid booking status.";
  }

  if (error === "booking-not-found") {
    return "Booking was not found.";
  }

  return null;
}