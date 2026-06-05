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
  markBookingRefundedManuallyAction,
  resolveBookingAsCompletedAction,
} from "@/server/actions/admin-dispute.actions";

type AdminDisputesPageProps = {
  searchParams?: Promise<{
    page?: string;
    status?: string;
  }>;
};

const DISPUTES_PAGE_SIZE = 30;

export default async function AdminDisputesPage({
  searchParams,
}: AdminDisputesPageProps) {
  await requireRole(["admin"]);

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const statusFilter = resolvedSearchParams.status ?? "open";

  const requestedPage = Number(resolvedSearchParams.page ?? 1);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const reportWhere =
    statusFilter === "all"
      ? {}
      : statusFilter === "closed"
        ? { status: "CLOSED" }
        : { status: "OPEN" };

  const filteredReportsCount = await prisma.bookingReport.count({
    where: reportWhere,
  });

  const totalPages = Math.max(
    Math.ceil(filteredReportsCount / DISPUTES_PAGE_SIZE),
    1,
  );

  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * DISPUTES_PAGE_SIZE;

  const [
    reports,
    openReportsCount,
    closedReportsCount,
    totalReportsCount,
    disputedBookingsCount,
  ] = await Promise.all([
    prisma.bookingReport.findMany({
      where: reportWhere,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: DISPUTES_PAGE_SIZE,
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
    }),

    prisma.bookingReport.count({
      where: {
        status: "OPEN",
      },
    }),

    prisma.bookingReport.count({
      where: {
        status: "CLOSED",
      },
    }),

    prisma.bookingReport.count(),

    prisma.booking.count({
      where: {
        status: BookingStatus.DISPUTED,
      },
    }),
  ]);

  const isOpenView = statusFilter !== "closed" && statusFilter !== "all";

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
              value={String(openReportsCount)}
              hint="Need admin review"
            />

            <MetricCard
              icon={Clock3}
              label="Disputed bookings"
              value={String(disputedBookingsCount)}
              hint="Booking status disputed"
            />

            <MetricCard
              icon={CheckCircle2}
              label="Closed reports"
              value={String(closedReportsCount)}
              hint="Already reviewed"
            />

            <MetricCard
              icon={MessageCircle}
              label="Total reports"
              value={String(totalReportsCount)}
              hint="All-time reports"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <DisputeFilterLink current={statusFilter} value="open" label="Open" />
            <DisputeFilterLink current={statusFilter} value="closed" label="Closed" />
            <DisputeFilterLink current={statusFilter} value="all" label="All" />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6">
          <Card
            className={
              isOpenView
                ? "border-[var(--danger)]/20 bg-[var(--danger-soft)] p-5 md:p-6"
                : "p-5 md:p-6"
            }
          >
            <Badge variant={isOpenView ? "danger" : "accent"}>
              {isOpenView ? (
                <>
                  <AlertTriangle size={14} />
                  Needs review
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  Reports
                </>
              )}
            </Badge>

            <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-3xl font-black tracking-[-0.05em]">
                  {statusFilter === "closed"
                    ? "Closed reports"
                    : statusFilter === "all"
                      ? "All reports"
                      : "Open reports"}
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-muted">
                  Showing {reports.length} of {filteredReportsCount} report
                  {filteredReportsCount === 1 ? "" : "s"}.
                </p>
              </div>

              <Badge>
                Page {safePage} / {totalPages}
              </Badge>
            </div>

            <div className="mt-6 grid gap-4">
              {reports.length > 0 ? (
                reports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    compact={report.status === "CLOSED"}
                  />
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-white/55 p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--success-soft)] text-[var(--success)]">
                    <CheckCircle2 size={24} />
                  </div>

                  <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
                    No reports found
                  </h2>

                  <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-muted">
                    Change the filter or come back later when a booking problem
                    is reported.
                  </p>
                </div>
              )}
            </div>

            {filteredReportsCount > DISPUTES_PAGE_SIZE ? (
              <PaginationControls
                page={safePage}
                totalPages={totalPages}
                status={statusFilter}
              />
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
  status,
}: {
  page: number;
  totalPages: number;
  status: string;
}) {
  const previousPage = Math.max(page - 1, 1);
  const nextPage = Math.min(page + 1, totalPages);

  return (
    <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/64 p-4 sm:flex-row">
      <p className="text-sm font-bold text-muted">
        Page {page} of {totalPages}
      </p>

      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={buildAdminDisputesHref({
              page: previousPage,
              status,
            })}
            className="btn btn-secondary"
          >
            Previous
          </Link>
        ) : null}

        {page < totalPages ? (
          <Link
            href={buildAdminDisputesHref({
              page: nextPage,
              status,
            })}
            className="btn btn-primary"
          >
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function DisputeFilterLink({
  current,
  value,
  label,
}: {
  current: string;
  value: string;
  label: string;
}) {
  const isActive = current === value || (!current && value === "open");

  return (
    <Link
      href={buildAdminDisputesHref({
        page: 1,
        status: value,
      })}
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

function buildAdminDisputesHref({
  page,
  status,
}: {
  page: number;
  status: string;
}) {
  const params = new URLSearchParams();

  if (status && status !== "open") {
    params.set("status", status);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();

  return queryString ? `/admin/disputes?${queryString}` : "/admin/disputes";
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
            <div className="rounded-2xl border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-3 text-xs font-bold leading-5 text-[var(--warning)]">
               For refunds: issue the refund in Stripe Dashboard first, then mark it as
               refunded manually here.
            </div>
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

            <form action={markBookingRefundedManuallyAction}>
                <input type="hidden" name="reportId" value={report.id} />
                <input type="hidden" name="bookingId" value={booking.id} />

                <textarea
                  name="resolution"
                  rows={2}
                  placeholder="Refund note, e.g. Refunded manually in Stripe Dashboard..."
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold outline-none"
                />

                <button type="submit" className="btn btn-danger mt-2 w-full">
                    Mark refunded manually
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