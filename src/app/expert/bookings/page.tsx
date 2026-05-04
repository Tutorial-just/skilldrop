import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Euro,
  Mail,
  ShieldCheck,
  Star,
  UserRound,
  Video,
  XCircle,
} from "lucide-react";

import { updateBookingStatusAction } from "@/server/actions/booking.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function ExpertBookingsPage() {
  const { user } = await requireRole(["expert", "admin"]);

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
          startTime: "asc",
        },
      },
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  const now = new Date();

  const upcomingBookings = expert.bookings.filter(
    (booking) =>
      booking.startTime >= now &&
      booking.status !== "CANCELLED" &&
      booking.status !== "REFUNDED" &&
      booking.status !== "COMPLETED" &&
      booking.status !== "DISPUTED",
  );

  const completedBookings = expert.bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const cancelledBookings = expert.bookings.filter(
    (booking) =>
      booking.status === "CANCELLED" ||
      booking.status === "REFUNDED" ||
      booking.status === "DISPUTED",
  );

  const pastUncompletedBookings = expert.bookings.filter(
    (booking) => booking.endTime < now && booking.status === "CONFIRMED",
  );

  const nextBooking = upcomingBookings[0] ?? null;

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <Link
            href="/expert"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Badge variant="primary">
                <CalendarDays size={14} />
                Bookings
              </Badge>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Manage your client calls.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Join upcoming sessions, complete finished calls and manage
                cancellations from one clean workspace.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
              <ButtonLink href="/expert/availability">
                Add availability
              </ButtonLink>

              <ButtonLink href="/expert/stats" variant="secondary">
                View statistics
              </ButtonLink>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Video}
              label="Upcoming"
              value={String(upcomingBookings.length)}
              hint="Scheduled calls"
            />

            <MetricCard
              icon={Clock3}
              label="Needs status"
              value={String(pastUncompletedBookings.length)}
              hint="Past calls not completed"
            />

            <MetricCard
              icon={CheckCircle2}
              label="Completed"
              value={String(completedBookings.length)}
              hint="Finished sessions"
            />

            <MetricCard
              icon={XCircle}
              label="Closed"
              value={String(cancelledBookings.length)}
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
                <div className="mt-5">
                  <h2 className="text-3xl font-black tracking-[-0.05em]">
                    {nextBooking.service?.title ?? "Client call"}
                  </h2>

                  <p className="mt-3 text-sm font-semibold leading-6 text-muted">
                    Client:{" "}
                    <span className="font-black text-[var(--foreground)]">
                      {nextBooking.buyer.name ?? nextBooking.buyer.email}
                    </span>
                  </p>

                  <div className="mt-5 grid gap-3">
                    <InfoRow
                      label="Date"
                      value={formatDateTime(nextBooking.startTime)}
                    />

                    <InfoRow
                      label="Duration"
                      value={`${getDurationMinutes(
                        nextBooking.startTime,
                        nextBooking.endTime,
                      )} minutes`}
                    />

                    <InfoRow
                      label="Price"
                      value={formatMoney(nextBooking.priceCents)}
                    />

                    <InfoRow label="Status" value={nextBooking.status} />
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    {nextBooking.status === "CONFIRMED" &&
                    nextBooking.callRoom?.roomUrl ? (
                      <Link
                        href={`/calls/${nextBooking.id}`}
                        className="btn btn-primary"
                      >
                        Join call
                        <Video size={18} />
                      </Link>
                    ) : null}

                    {nextBooking.status === "CONFIRMED" &&
                    nextBooking.endTime <= now ? (
                      <CompleteCallForm bookingId={nextBooking.id} />
                    ) : null}

                    {nextBooking.status === "PENDING" ||
                    nextBooking.status === "CONFIRMED" ? (
                      <CancelCallForm bookingId={nextBooking.id} />
                    ) : null}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="No upcoming calls"
                  text="When clients book your open slots, the next call will appear here."
                />
              )}
            </Card>

            <Card soft className="p-5 md:p-6">
              <Badge variant="primary">
                <ShieldCheck size={14} />
                Provider tips
              </Badge>

              <div className="mt-5 grid gap-3">
                <Tip text="Complete calls after the session so clients can leave reviews." />
                <Tip text="Keep your availability fresh every week." />
                <Tip text="If a client cancels or misses a call, update the status quickly." />
              </div>
            </Card>
          </div>

          <div className="grid gap-6">
            {pastUncompletedBookings.length > 0 ? (
              <Card className="border-[var(--accent)]/20 bg-[var(--accent-soft)] p-5 md:p-6">
                <Badge variant="accent">
                  <Clock3 size={14} />
                  Needs action
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  Past calls waiting for status
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted">
                  Mark completed calls as completed so clients can leave reviews.
                </p>

                <div className="mt-6 grid gap-4">
                  {pastUncompletedBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      important
                    />
                  ))}
                </div>
              </Card>
            ) : null}

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

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                    Upcoming, completed and cancelled client calls.
                  </p>
                </div>

                <Badge>{expert.bookings.length} total</Badge>
              </div>

              <div className="mt-6 grid gap-4">
                {expert.bookings.length > 0 ? (
                  expert.bookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))
                ) : (
                  <EmptyState
                    title="No bookings yet"
                    text="Bookings will appear here after clients reserve your time."
                  />
                )}
              </div>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

function BookingCard({
  booking,
  important = false,
}: {
  booking: {
    id: string;
    startTime: Date;
    endTime: Date;
    status: string;
    priceCents: number;
    buyer: {
      name: string | null;
      email: string;
    };
    service: {
      title: string;
      durationMinutes: number;
    };
    callRoom: {
      roomUrl: string;
    } | null;
    review: {
      rating: number;
      comment: string | null;
    } | null;
  };
  important?: boolean;
}) {
  const now = new Date();

  const isPending = booking.status === "PENDING";
  const isConfirmed = booking.status === "CONFIRMED";
  const isCompleted = booking.status === "COMPLETED";
  const isCancelled =
    booking.status === "CANCELLED" || booking.status === "REFUNDED";
  const isDisputed = booking.status === "DISPUTED";

  const isJoinable =
    isConfirmed && booking.startTime >= now && Boolean(booking.callRoom?.roomUrl);

  const canComplete = isConfirmed && booking.endTime <= now;

  const canCancel = isPending || isConfirmed;

  return (
    <div
      className={
        important
          ? "rounded-[26px] border border-[var(--accent)]/30 bg-white/70 p-4"
          : "rounded-[26px] border border-[var(--border)] bg-white/64 p-4"
      }
    >
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={booking.status} />

            {booking.review ? (
              <Badge variant="success">
                <Star size={14} />
                Reviewed
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
            {booking.service?.title ?? "Client call"}
          </h3>

          <div className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-muted">
            <p className="inline-flex items-center gap-2">
              <UserRound size={15} />
              {booking.buyer.name ?? "Client"}
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

            <SmallPill icon={Euro} text={formatMoney(booking.priceCents)} />
          </div>

          {isCancelled ? (
            <p className="mt-4 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-3 text-sm font-bold text-[var(--danger)]">
              This booking is closed and the slot is no longer active.
            </p>
          ) : null}

          {isDisputed ? (
            <p className="mt-4 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-3 text-sm font-bold text-[var(--danger)]">
              This booking is disputed and is under SkillDrop review.
            </p>
          ) : null}

          {booking.review ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
              <p className="flex items-center gap-2 text-sm font-black">
                <Star size={15} fill="currentColor" />
                Client review: {booking.review.rating}/5
              </p>

              <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                {booking.review.comment || "No comment left."}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 lg:min-w-[170px]">
          {isJoinable ? (
            <Link href={`/calls/${booking.id}`} className="btn btn-primary">
              Join call
              <Video size={17} />
            </Link>
          ) : null}

          {canComplete ? <CompleteCallForm bookingId={booking.id} /> : null}

          {canCancel ? <CancelCallForm bookingId={booking.id} /> : null}
        </div>
      </div>
    </div>
  );
}

function CompleteCallForm({ bookingId }: { bookingId: string }) {
  return (
    <form action={updateBookingStatusAction}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="status" value="COMPLETED" />

      <button type="submit" className="btn btn-primary w-full">
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

  if (status === "CANCELLED" || status === "REFUNDED") {
    return <Badge variant="danger">{status.toLowerCase()}</Badge>;
  }

  if (status === "CONFIRMED") {
    return <Badge variant="primary">Confirmed</Badge>;
  }

  if (status === "PAID") {
    return <Badge variant="success">Paid</Badge>;
  }

  if (status === "DISPUTED") {
    return <Badge variant="danger">Disputed</Badge>;
  }

  if (status === "PENDING") {
    return <Badge variant="accent">Pending</Badge>;
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="text-right text-sm font-black">{value}</p>
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

function getDurationMinutes(startTime: Date, endTime: Date) {
  return Math.max(
    Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60),
    0,
  );
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