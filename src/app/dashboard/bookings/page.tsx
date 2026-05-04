import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Euro,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Star,
  UserRound,
  Video,
  XCircle,
} from "lucide-react";

import {
  cancelBookingAction,
  updateBookingStatusAction,
} from "@/server/actions/booking.actions";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type BookingPageProps = {
  params: Promise<{
    bookingId: string;
  }>;
  searchParams?: Promise<{
    payment?: string;
    error?: string;
  }>;
};

export default async function BookingPage({
  params,
  searchParams,
}: BookingPageProps) {
  const { bookingId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const session = await getCurrentUser();
  const currentUser = session.user;

  if (!currentUser?.email) {
    redirect("/sign-in");
  }

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      buyer: true,
      expert: {
        include: {
          user: true,
        },
      },
      service: true,
      review: true,
      callRoom: true,
      availability: true,
    },
  });

  if (!booking) {
    notFound();
  }

  const isBuyer = booking.buyerId === currentUser.id;
  const isExpert = booking.expert.userId === currentUser.id;
  const isAdmin = currentUser.role === "ADMIN";

  if (!isBuyer && !isExpert && !isAdmin) {
    redirect("/");
  }

  const now = new Date();

  const isPending = booking.status === "PENDING";
  const isConfirmed = booking.status === "CONFIRMED";
  const isCompleted = booking.status === "COMPLETED";
  const isCancelled = booking.status === "CANCELLED";
  const isRefunded = booking.status === "REFUNDED";
  const isDisputed = booking.status === "DISPUTED";
  const isClosed = isCancelled || isRefunded || isDisputed;

  const canPay = isBuyer && isPending;
  const canJoin = isConfirmed && Boolean(booking.callRoom?.roomUrl);
  const canCancel = isPending || isConfirmed;
  const canComplete =
    (isExpert || isAdmin) && isConfirmed && booking.endTime <= now;
  const canReview = isBuyer && isCompleted && !booking.review;

  const backHref = getBackHref({
    isBuyer,
    isExpert,
    isAdmin,
  });

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative container-page py-8 md:py-10 lg:py-14">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to bookings
          </Link>

          {resolvedSearchParams.payment === "success" && isPending ? (
            <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black text-[var(--success)]">
              Checkout completed. If the status is still pending, wait a few
              seconds while Stripe webhook confirms the payment.
            </div>
          ) : null}

          {resolvedSearchParams.payment === "cancelled" && isPending ? (
            <div className="mt-6 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-4 text-sm font-black text-[var(--accent)]">
              Checkout was cancelled. You can still complete payment or cancel
              the booking to release the slot.
            </div>
          ) : null}

          {resolvedSearchParams.error ? (
            <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-black text-[var(--danger)]">
              {formatBookingError(resolvedSearchParams.error)}
            </div>
          ) : null}

          <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_360px] xl:items-start">
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={booking.status} />

                <Badge>
                  <CalendarDays size={14} />
                  {formatDateTime(booking.startTime)}
                </Badge>

                <Badge>
                  <Clock3 size={14} />
                  {getDurationMinutes(booking.startTime, booking.endTime)} min
                </Badge>

                <Badge variant="primary">
                  <Euro size={14} />
                  {formatMoney(booking.priceCents)}
                </Badge>
              </div>

              <h1 className="heading-lg mt-6 max-w-4xl text-balance">
                {getHeroTitle(booking.status)}
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                {getHeroDescription(booking.status)}
              </p>
            </div>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <ShieldCheck size={14} />
                Booking summary
              </Badge>

              <div className="mt-5 grid gap-3">
                <SummaryRow label="Status" value={booking.status} />
                <SummaryRow
                  label="Price"
                  value={formatMoney(booking.priceCents)}
                />
                <SummaryRow
                  label="Duration"
                  value={`${getDurationMinutes(
                    booking.startTime,
                    booking.endTime,
                  )} min`}
                />
                <SummaryRow
                  label="Currency"
                  value={booking.currency.toUpperCase()}
                />
                <SummaryRow
                  label="Slot"
                  value={booking.availabilityId ? "Linked" : "Not linked"}
                />
              </div>

              <div className="mt-6 grid gap-2">
                {canPay ? (
                  <Link
                    href={`/buyer/bookings/${booking.id}/checkout`}
                    className="btn btn-primary"
                  >
                    Complete payment
                  </Link>
                ) : null}

                {canJoin ? (
                  <Link href={`/calls/${booking.id}`} className="btn btn-primary">
                    Join protected call
                    <Video size={17} />
                  </Link>
                ) : null}

                {canComplete ? (
                  <form action={updateBookingStatusAction}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <input type="hidden" name="status" value="COMPLETED" />

                    <button type="submit" className="btn btn-primary w-full">
                      Mark as completed
                      <CheckCircle2 size={17} />
                    </button>
                  </form>
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

                {canCancel ? (
                  <form action={cancelBookingAction}>
                    <input type="hidden" name="bookingId" value={booking.id} />

                    <button type="submit" className="btn btn-danger w-full">
                      Cancel booking
                      <XCircle size={17} />
                    </button>
                  </form>
                ) : null}

                <Link href={backHref} className="btn btn-secondary">
                  View all bookings
                </Link>

                <Link href={`/experts/${booking.expertId}`} className="btn btn-secondary">
                  View expert profile
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-start">
          <div className="grid gap-6">
            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <Video size={14} />
                Session details
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                {booking.service.title}
              </h2>

              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-muted">
                {booking.service.description}
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <DetailCard
                  icon={UserRound}
                  label="Expert"
                  value={booking.expert.user.name ?? booking.expert.user.email}
                />

                <DetailCard
                  icon={UserRound}
                  label="Buyer"
                  value={booking.buyer.name ?? booking.buyer.email}
                />

                <DetailCard
                  icon={CalendarDays}
                  label="Date"
                  value={formatDate(booking.startTime)}
                />

                <DetailCard
                  icon={Clock3}
                  label="Time"
                  value={`${formatTime(booking.startTime)} — ${formatTime(
                    booking.endTime,
                  )}`}
                />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <Clock3 size={14} />
                Booking lifecycle
              </Badge>

              <div className="mt-6 grid gap-4">
                <LifecycleStep
                  number="01"
                  title="Created"
                  text="The buyer selected a service and an availability slot."
                  active
                />

                <LifecycleStep
                  number="02"
                  title="Payment"
                  text="Stripe Checkout confirms the payment and the booking becomes confirmed."
                  active={isConfirmed || isCompleted}
                />

                <LifecycleStep
                  number="03"
                  title="Confirmed"
                  text="The protected call room is available through SkillDrop."
                  active={isConfirmed || isCompleted}
                />

                <LifecycleStep
                  number="04"
                  title="Completed"
                  text="The session happened and the buyer can leave a review."
                  active={isCompleted}
                />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <MessageCircle size={14} />
                Review
              </Badge>

              {isClosed ? (
                <ReviewDisabled
                  title="Reviews are disabled"
                  text="Cancelled, refunded or disputed bookings cannot receive normal reviews."
                />
              ) : !isCompleted ? (
                <ReviewDisabled
                  title="Review available after completion"
                  text="The buyer can leave a review after the expert marks the call as completed."
                />
              ) : booking.review ? (
                <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-white/64 p-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="success">
                      <Star size={14} />
                      {booking.review.rating}/5
                    </Badge>

                    {booking.review.wouldRecommend === true ? (
                      <Badge variant="primary">Recommended</Badge>
                    ) : null}

                    {booking.review.wouldRecommend === false ? (
                      <Badge variant="accent">Not recommended</Badge>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-3">
                    <ReviewMiniScore
                      label="Helpfulness"
                      value={booking.review.helpfulness}
                    />

                    <ReviewMiniScore
                      label="Clarity"
                      value={booking.review.clarity}
                    />

                    <ReviewMiniScore
                      label="Professionalism"
                      value={booking.review.professionalism}
                    />
                  </div>

                  <p className="mt-4 text-sm font-semibold leading-6 text-muted">
                    {booking.review.comment || "No comment left."}
                  </p>
                </div>
              ) : canReview ? (
                <div className="mt-5 rounded-[24px] border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-5">
                  <h3 className="text-2xl font-black tracking-[-0.04em]">
                    This call is ready for review.
                  </h3>

                  <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                    Leave detailed feedback to help other clients choose safely.
                  </p>

                  <div className="mt-5">
                    <Link
                      href={`/buyer/reviews?bookingId=${booking.id}`}
                      className="btn btn-primary"
                    >
                      Leave review
                      <Star size={17} />
                    </Link>
                  </div>
                </div>
              ) : (
                <ReviewDisabled
                  title="Waiting for review"
                  text="The buyer can leave a review from their review page."
                />
              )}
            </Card>
          </div>

          <aside className="grid content-start gap-5 xl:sticky xl:top-[96px]">
            <Card className="p-5">
              <Badge variant={isClosed ? "danger" : "success"}>
                {isClosed ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                Safety
              </Badge>

              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                Protected booking flow
              </h2>

              <p className="mt-3 text-sm font-semibold leading-6 text-muted">
                Calls open through SkillDrop only. Direct room URLs are not
                shown here.
              </p>

              <div className="mt-5 grid gap-3">
                <SideFact
                  label="Call room"
                  value={booking.callRoom ? "Created" : "Not ready"}
                />

                <SideFact
                  label="Access"
                  value={canJoin ? "Protected link active" : "Not joinable yet"}
                />

                <SideFact
                  label="Review"
                  value={
                    booking.review
                      ? "Submitted"
                      : canReview
                        ? "Waiting"
                        : "Not available"
                  }
                />
              </div>
            </Card>

            <Card soft className="p-5">
              <Badge variant="accent">
                <ShieldCheck size={14} />
                Good to know
              </Badge>

              <p className="mt-4 text-sm font-bold leading-6 text-muted">
                If something goes wrong, SkillDrop can review the booking,
                dispute status and payment history from the admin panel.
              </p>
            </Card>
          </aside>
        </div>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return <Badge variant="success">Completed</Badge>;
  }

  if (status === "CONFIRMED") {
    return <Badge variant="primary">Confirmed</Badge>;
  }

  if (status === "PENDING") {
    return <Badge variant="accent">Pending payment</Badge>;
  }

  if (status === "CANCELLED" || status === "REFUNDED" || status === "DISPUTED") {
    return <Badge variant="danger">{status.toLowerCase()}</Badge>;
  }

  return <Badge>{status.toLowerCase()}</Badge>;
}

function DetailCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={18} />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-sm font-black leading-6">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="text-right text-sm font-black">{value}</p>
    </div>
  );
}

function LifecycleStep({
  number,
  title,
  text,
  active,
}: {
  number: string;
  title: string;
  text: string;
  active: boolean;
}) {
  return (
    <div
      className={
        active
          ? "flex gap-4 rounded-[22px] border border-[var(--primary)]/20 bg-[var(--primary-soft)] p-4"
          : "flex gap-4 rounded-[22px] border border-[var(--border)] bg-white/64 p-4"
      }
    >
      <div
        className={
          active
            ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)] text-sm font-black text-white"
            : "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--border)] text-sm font-black text-muted"
        }
      >
        {number}
      </div>

      <div>
        <p className="font-black tracking-[-0.02em]">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-muted">{text}</p>
      </div>
    </div>
  );
}

function ReviewDisabled({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-white/64 p-5">
      <p className="font-black">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-muted">{text}</p>
    </div>
  );
}

function ReviewMiniScore({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>

      <p className="mt-1 text-sm font-black">{value ? `${value}/5` : "—"}</p>
    </div>
  );
}

function SideFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="text-right text-sm font-black">{value}</p>
    </div>
  );
}

function getBackHref({
  isBuyer,
  isExpert,
  isAdmin,
}: {
  isBuyer: boolean;
  isExpert: boolean;
  isAdmin: boolean;
}) {
  if (isAdmin) {
    return "/admin/bookings";
  }

  if (isExpert) {
    return "/expert/bookings";
  }

  if (isBuyer) {
    return "/buyer/bookings";
  }

  return "/";
}

function getHeroTitle(status: string) {
  const titles: Record<string, string> = {
    PENDING: "Your booking is waiting for payment.",
    PAID: "Your payment is being processed.",
    CONFIRMED: "Your session is confirmed.",
    COMPLETED: "This session is completed.",
    CANCELLED: "This booking has been cancelled.",
    REFUNDED: "This booking has been refunded.",
    DISPUTED: "This booking is under review.",
  };

  return titles[status] ?? "Booking details";
}

function getHeroDescription(status: string) {
  const descriptions: Record<string, string> = {
    PENDING:
      "Complete payment to confirm the call. The selected slot is reserved temporarily.",
    PAID:
      "Payment was received. The booking should become confirmed after the webhook finishes processing.",
    CONFIRMED:
      "The call is confirmed. Join through the protected SkillDrop call page when it is time.",
    COMPLETED:
      "The expert marked this session as completed. The buyer can leave a review.",
    CANCELLED:
      "This booking is cancelled. If it had an availability slot, that slot was released.",
    REFUNDED:
      "This booking was refunded. The session is closed.",
    DISPUTED:
      "This booking is being reviewed by SkillDrop.",
  };

  return descriptions[status] ?? "Review the session details below.";
}

function formatBookingError(error: string) {
  if (error === "cannot-cancel") {
    return "This booking cannot be cancelled anymore.";
  }

  if (error === "cannot-complete") {
    return "This booking cannot be completed.";
  }

  if (error === "call-not-ended") {
    return "You can complete a call only after its scheduled end time.";
  }

  if (error === "not-allowed") {
    return "You are not allowed to perform this action.";
  }

  return "Something went wrong. Please try again.";
}

function getDurationMinutes(startTime: Date, endTime: Date) {
  return Math.max(
    Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60),
    0,
  );
}

function formatMoney(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".00", "")}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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