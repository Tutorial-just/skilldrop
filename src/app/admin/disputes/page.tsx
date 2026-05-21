import Link from "next/link";
import { BookingStatus, UserRole } from "@prisma/client";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Euro,
  MessageCircle,
  ShieldAlert,
  UserRound,
  Video,
  XCircle,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  closeBookingReportAction,
  keepBookingDisputedAction,
  resolveBookingAsCompletedAction,
} from "@/server/actions/admin-dispute.actions";

export default async function AdminDisputesPage() {
  await requireRole(["admin"]);
  const reports = await prisma.bookingReport.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      reporter: true,
      booking: {
        include: {
          buyer: true,
          expert: {
            include: {
              user: true,
            },
          },
          service: true,
          callRoom: true,
          review: true,
        },
      },
    },
  });

  const openReports = reports.filter((report) => report.status === "OPEN");
  const closedReports = reports.filter((report) => report.status === "CLOSED");

  const disputedBookings = reports.filter(
    (report) => report.booking.status === BookingStatus.DISPUTED,
  );

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to admin
          </Link>

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Badge variant="danger">
                <ShieldAlert size={14} />
                Disputes
              </Badge>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Booking reports and disputes.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Review no-shows, refund requests, call quality issues and other
                booking problems reported by buyers or helpers.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
              <ButtonLink href="/admin/bookings" variant="secondary">
                Admin bookings
              </ButtonLink>

              <ButtonLink href="/admin" variant="secondary">
                Admin dashboard
              </ButtonLink>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={ShieldAlert}
              label="Open reports"
              value={String(openReports.length)}
              hint="Need admin review"
            />

            <MetricCard
              icon={Clock3}
              label="Disputed bookings"
              value={String(disputedBookings.length)}
              hint="Booking status disputed"
            />

            <MetricCard
              icon={CheckCircle2}
              label="Closed reports"
              value={String(closedReports.length)}
              hint="Already reviewed"
            />

            <MetricCard
              icon={MessageCircle}
              label="Total reports"
              value={String(reports.length)}
              hint="All-time reports"
            />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6">
          {openReports.length > 0 ? (
            <Card className="border-[var(--danger)]/20 bg-[var(--danger-soft)] p-5 md:p-6">
              <Badge variant="danger">
                <AlertTriangle size={14} />
                Needs review
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Open reports
              </h2>

              <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-muted">
                These reports are still open. Check the booking, reporter,
                reason and message before taking action.
              </p>

              <div className="mt-6 grid gap-4">
                {openReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--success-soft)] text-[var(--success)]">
                <CheckCircle2 size={24} />
              </div>

              <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
                No open disputes
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-muted">
                When a buyer or helper reports a booking problem, it will appear
                here.
              </p>
            </Card>
          )}

          {closedReports.length > 0 ? (
            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <CheckCircle2 size={14} />
                Closed reports
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Review history
              </h2>

              <div className="mt-6 grid gap-4">
                {closedReports.slice(0, 20).map((report) => (
                  <ReportCard key={report.id} report={report} compact />
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
  );
}

type ReportCardProps = {
  report: {
    id: string;
    bookingId: string;
    reporterId: string;
    reason: string;
    message: string | null;
    status: string;
    createdAt: Date;
    booking: {
      id: string;
      status: BookingStatus;
      startTime: Date;
      endTime: Date;
      priceCents: number;
      buyer: {
        id: string;
        name: string | null;
        email: string;
      };
      expert: {
        id: string;
        user: {
          id: string;
          name: string | null;
          email: string;
        };
      };
      service: {
        title: string;
        durationMinutes: number;
      } | null;
      review: {
        rating: number;
        comment: string | null;
      } | null;
      callRoom: {
        roomUrl: string;
      } | null;
    };
    reporter: {
      id: string;
      name: string | null;
      email: string;
      role: UserRole;
    };
  };
  compact?: boolean;
};

function ReportCard({ report, compact = false }: ReportCardProps) {
  const booking = report.booking;
  const buyerName = booking.buyer.name ?? booking.buyer.email;
  const expertName = booking.expert.user.name ?? booking.expert.user.email;
  const reporterName = report.reporter.name ?? report.reporter.email;

  return (
    <div className="rounded-[26px] border border-[var(--border)] bg-white/75 p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={report.status} />
            <BookingStatusBadge status={booking.status} />

            <Badge variant="accent">
              <MessageCircle size={14} />
              {formatReason(report.reason)}
            </Badge>

            {booking.review ? (
              <Badge variant="success">
                <BadgeCheck size={14} />
                Reviewed {booking.review.rating}/5
              </Badge>
            ) : null}
          </div>

          <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
            {booking.service?.title ?? "Booking report"}
          </h3>

          <div className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-muted">
            <p className="inline-flex items-center gap-2">
              <UserRound size={15} />
              Buyer:{" "}
              <span className="font-black text-[var(--foreground)]">
                {buyerName}
              </span>
            </p>

            <p className="inline-flex items-center gap-2">
              <UserRound size={15} />
              Helper:{" "}
              <span className="font-black text-[var(--foreground)]">
                {expertName}
              </span>
            </p>

            <p className="inline-flex items-center gap-2">
              <ShieldAlert size={15} />
              Reporter:{" "}
              <span className="font-black text-[var(--foreground)]">
                {reporterName}
              </span>{" "}
              ({report.reporter.role.toLowerCase()})
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <SmallPill
              icon={CalendarDays}
              text={formatDateTime(booking.startTime)}
            />

            <SmallPill
              icon={Video}
              text={`${getDurationMinutes(
                booking.startTime,
                booking.endTime,
              )} min`}
            />

            <SmallPill icon={Euro} text={formatMoney(booking.priceCents)} />

            <SmallPill
              icon={Clock3}
              text={`Reported ${formatDateTime(report.createdAt)}`}
            />
          </div>

          {report.message ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/70 p-4">
              <p className="text-sm font-black">Report message</p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-muted">
                {report.message}
              </p>
            </div>
          ) : null}

          {booking.review ? (
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/70 p-4">
              <p className="text-sm font-black">
                Buyer review: {booking.review.rating}/5
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-muted">
                {booking.review.comment || "No comment left."}
              </p>
            </div>
          ) : null}
        </div>

        {!compact ? (
          <div className="flex shrink-0 flex-col gap-2 lg:min-w-[210px]">
            <Link
              href={`/admin/bookings?booking=${booking.id}`}
              className="btn btn-secondary"
            >
              Open booking
            </Link>

            {booking.callRoom?.roomUrl ? (
              <Link href={`/calls/${booking.id}`} className="btn btn-secondary">
                Open call room
              </Link>
            ) : null}

            <form action={resolveBookingAsCompletedAction}>
              <input type="hidden" name="reportId" value={report.id} />
              <input type="hidden" name="bookingId" value={booking.id} />

              <button type="submit" className="btn btn-primary w-full">
                Mark completed
              </button>
            </form>

            <form action={keepBookingDisputedAction}>
              <input type="hidden" name="reportId" value={report.id} />
              <input type="hidden" name="bookingId" value={booking.id} />

              <button type="submit" className="btn btn-secondary w-full">
                Keep disputed
              </button>
            </form>

            <form action={closeBookingReportAction}>
              <input type="hidden" name="reportId" value={report.id} />
              <input type="hidden" name="bookingId" value={booking.id} />

              <textarea
                name="resolution"
                rows={2}
                placeholder="Internal resolution note..."
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold outline-none"
              />

              <button type="submit" className="btn btn-danger mt-2 w-full">
                Close report
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
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

function StatusBadge({ status }: { status: string }) {
  if (status === "OPEN") {
    return (
      <Badge variant="danger">
        <ShieldAlert size={14} />
        Open
      </Badge>
    );
  }

  if (status === "CLOSED") {
    return (
      <Badge variant="success">
        <CheckCircle2 size={14} />
        Closed
      </Badge>
    );
  }

  return <Badge variant="accent">{status.toLowerCase()}</Badge>;
}

function BookingStatusBadge({ status }: { status: BookingStatus }) {
  if (status === BookingStatus.DISPUTED) {
    return (
      <Badge variant="danger">
        <ShieldAlert size={14} />
        Disputed booking
      </Badge>
    );
  }

  if (status === BookingStatus.COMPLETED) {
    return (
      <Badge variant="success">
        <CheckCircle2 size={14} />
        Completed
      </Badge>
    );
  }

  if (status === BookingStatus.CONFIRMED) {
    return (
      <Badge variant="success">
        <Video size={14} />
        Confirmed
      </Badge>
    );
  }

  if (status === BookingStatus.PAID) {
    return (
      <Badge variant="primary">
        <Euro size={14} />
        Paid
      </Badge>
    );
  }

  return <Badge variant="accent">{status.toLowerCase()}</Badge>;
}

function SmallPill({
  icon: Icon,
  text,
}: {
  icon: typeof CalendarDays;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/70 px-3 py-1.5 text-xs font-black text-[var(--muted-foreground)]">
      <Icon size={13} />
      {text}
    </span>
  );
}

function formatReason(reason: string) {
  if (reason === "EXPERT_NO_SHOW") {
    return "Expert no-show";
  }

  if (reason === "BUYER_NO_SHOW") {
    return "Buyer no-show";
  }

  if (reason === "CALL_QUALITY_PROBLEM") {
    return "Call quality";
  }

  if (reason === "WRONG_SERVICE") {
    return "Wrong service";
  }

  if (reason === "ABUSIVE_BEHAVIOR") {
    return "Abusive behavior";
  }

  if (reason === "REFUND_REQUEST") {
    return "Refund request";
  }

  return "Other problem";
}

function getDurationMinutes(startTime: Date, endTime: Date) {
  return Math.max(
    Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60),
    0,
  );
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

function formatMoney(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".00", "")}`;
}