import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Euro,
  Search,
  ShieldCheck,
  Star,
  Video,
  XCircle,
} from "lucide-react";

import { cancelBookingAction } from "@/server/actions/booking.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type BuyerBookingsPageProps = {
  searchParams?: Promise<{
    booked?: string;
  }>;
};

export default async function BuyerBookingsPage({
  searchParams,
}: BuyerBookingsPageProps) {
  const { user } = await requireRole(["buyer", "expert", "admin"]);
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
    },
    orderBy: {
      startTime: "asc",
    },
  });

  const upcomingBookings = bookings.filter(
    (booking) =>
      booking.startTime >= now &&
      booking.status !== "CANCELLED" &&
      booking.status !== "REFUNDED",
  );

  const completedBookings = bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const cancelledBookings = bookings.filter(
    (booking) => booking.status === "CANCELLED" || booking.status === "REFUNDED",
  );

  const pastBookings = bookings.filter(
    (booking) =>
      booking.startTime < now &&
      booking.status !== "COMPLETED" &&
      booking.status !== "CANCELLED" &&
      booking.status !== "REFUNDED",
  );

  const nextBooking = upcomingBookings[0] ?? null;

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

          {resolvedSearchParams.booked ? (
            <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black text-[var(--success)]">
              Booking confirmed. Your call is now saved here.
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
                See upcoming calls, join video rooms, review past sessions and
                manage your bookings.
              </p>
            </div>

            <ButtonLink href="/" variant="secondary">
              <Search size={18} />
              Find more help
            </ButtonLink>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MiniStat
              icon={Video}
              label="Upcoming"
              value={String(upcomingBookings.length)}
              hint="Scheduled calls"
            />

            <MiniStat
              icon={CheckCircle2}
              label="Completed"
              value={String(completedBookings.length)}
              hint="Finished sessions"
            />

            <MiniStat
              icon={Clock3}
              label="Past"
              value={String(pastBookings.length)}
              hint="Needs status update"
            />

            <MiniStat
              icon={XCircle}
              label="Cancelled"
              value={String(cancelledBookings.length)}
              hint="Cancelled / refunded"
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
                <div className="mt-5">
                  <h2 className="text-3xl font-black tracking-[-0.05em]">
                    {nextBooking.service?.title ?? "Booked call"}
                  </h2>

                  <p className="mt-3 text-sm font-semibold leading-6 text-muted">
                    With{" "}
                    <span className="font-black text-[var(--foreground)]">
                      {nextBooking.expert.user.name ?? "Expert"}
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
                    {nextBooking.callRoom?.roomUrl ? (
                      <Link
                        href={nextBooking.callRoom.roomUrl}
                        className="btn btn-primary"
                      >
                        Join call
                        <Video size={18} />
                      </Link>
                    ) : null}

                    <ButtonLink
                      href={`/experts/${nextBooking.expertId}`}
                      variant="secondary"
                    >
                      View expert
                    </ButtonLink>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[24px] border border-dashed border-[var(--border-strong)] bg-white/55 p-6 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                    <CalendarDays size={24} />
                  </div>

                  <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
                    No upcoming calls
                  </h2>

                  <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-muted">
                    Find an expert, choose a service and book a time that works
                    for you.
                  </p>

                  <div className="mt-5">
                    <ButtonLink href="/">
                      Find help
                      <Search size={18} />
                    </ButtonLink>
                  </div>
                </div>
              )}
            </Card>

            <Card soft className="p-5 md:p-6">
              <Badge variant="primary">
                <ShieldCheck size={14} />
                Booking tips
              </Badge>

              <div className="mt-5 grid gap-3">
                <Tip text="Prepare one clear question before the call." />
                <Tip text="Join a few minutes early to test your connection." />
                <Tip text="After the call, leave a review to help other clients." />
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

                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  Upcoming, completed and cancelled calls appear here.
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
                    highlighted={booking.id === resolvedSearchParams.booked}
                  />
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-white/55 p-8 text-center">
                  <h3 className="text-2xl font-black tracking-[-0.04em]">
                    No bookings yet
                  </h3>

                  <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-muted">
                    Once you book your first expert, it will appear here.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function BookingCard({
  booking,
  highlighted,
}: {
  booking: {
    id: string;
    expertId: string;
    startTime: Date;
    endTime: Date;
    priceCents: number;
    status: string;
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
  };
  highlighted: boolean;
}) {
  const isCancelled =
    booking.status === "CANCELLED" || booking.status === "REFUNDED";
  const isCompleted = booking.status === "COMPLETED";
  const isUpcoming = booking.startTime >= new Date() && !isCancelled && !isCompleted;

  return (
    <div
      className={
        highlighted
          ? "rounded-[26px] border border-[var(--success)]/30 bg-[var(--success-soft)] p-4"
          : "rounded-[26px] border border-[var(--border)] bg-white/64 p-4"
      }
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={booking.status} />

            {highlighted ? <Badge variant="success">New booking</Badge> : null}
          </div>

          <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
            {booking.service?.title ?? "Booked call"}
          </h3>

          <p className="mt-2 text-sm font-semibold leading-6 text-muted">
            With{" "}
            <span className="font-black text-[var(--foreground)]">
              {booking.expert.user.name ?? booking.expert.user.email}
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
            <SmallPill icon={Euro} text={formatMoney(booking.priceCents)} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 md:min-w-[160px]">
          {isUpcoming && booking.callRoom?.roomUrl ? (
            <Link href={booking.callRoom.roomUrl} className="btn btn-primary">
              Join call
              <Video size={17} />
            </Link>
          ) : null}

          <Link
            href={`/experts/${booking.expertId}`}
            className="btn btn-secondary"
          >
            View expert
          </Link>

          {isUpcoming ? (
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

  if (status === "CANCELLED" || status === "REFUNDED") {
    return <Badge variant="danger">{status.toLowerCase()}</Badge>;
  }

  if (status === "CONFIRMED") {
    return <Badge variant="primary">Confirmed</Badge>;
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="text-right text-sm font-black">{value}</p>
    </div>
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