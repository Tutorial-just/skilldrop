import Link from "next/link";
import { BookingStatus } from "@prisma/client";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircle,
  ShieldAlert,
  UserRound,
  Video,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getBookingStatusUi } from "@/lib/booking-status-ui";

export default async function AdminHealthPage() {
  await requireRole(["admin"]);

  const now = new Date();
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    paidNotConfirmed,
    endedNotCompleted,
    completedWithoutReview,
    openDisputes,
    bookingsWithoutCallRoom,
    pendingTooLong,
    expertsNotReady,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: BookingStatus.PAID,
        paidAt: {
          lt: thirtyMinutesAgo,
        },
      },
      include: bookingInclude,
      orderBy: {
        paidAt: "asc",
      },
      take: 20,
    }),

    prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        endTime: {
          lt: now,
        },
      },
      include: bookingInclude,
      orderBy: {
        endTime: "asc",
      },
      take: 20,
    }),

    prisma.booking.findMany({
      where: {
        status: BookingStatus.COMPLETED,
        review: null,
        completedAt: {
          lt: oneDayAgo,
        },
      },
      include: bookingInclude,
      orderBy: {
        completedAt: "asc",
      },
      take: 20,
    }),

    prisma.bookingReport.findMany({
      where: {
        status: "OPEN",
      },
      include: {
        reporter: true,
        booking: {
          include: bookingInclude,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 20,
    }),

    prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        callRoom: null,
      },
      include: bookingInclude,
      orderBy: {
        confirmedAt: "asc",
      },
      take: 20,
    }),

    prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        createdAt: {
          lt: oneHourAgo,
        },
      },
      include: bookingInclude,
      orderBy: {
        createdAt: "asc",
      },
      take: 20,
    }),

    prisma.expertProfile.findMany({
      where: {
        status: "APPROVED",
        OR: [
          {
            services: {
              none: {
                isActive: true,
              },
            },
          },
          {
            availability: {
              none: {
                isActive: true,
                endTime: {
                  gte: now,
                },
              },
            },
          },
          {
            stripeAccountId: null,
          },
        ],
      },
      include: {
        user: true,
        services: {
          where: {
            isActive: true,
          },
          take: 1,
        },
        availability: {
          where: {
            isActive: true,
            endTime: {
              gte: now,
            },
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 20,
    }),
  ]);

  const criticalCount =
    paidNotConfirmed.length +
    openDisputes.length +
    bookingsWithoutCallRoom.length;

  const attentionCount =
    endedNotCompleted.length +
    completedWithoutReview.length +
    pendingTooLong.length +
    expertsNotReady.length;

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

          <div className="mt-6">
            <Badge variant={criticalCount > 0 ? "danger" : "success"}>
              {criticalCount > 0 ? (
                <>
                  <ShieldAlert size={14} />
                  Critical issues found
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  Marketplace health
                </>
              )}
            </Badge>

            <h1 className="heading-lg mt-5 max-w-4xl text-balance">
              SkillDrop health dashboard.
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
              Find stuck bookings, missing call rooms, open disputes, missing
              reviews and experts who cannot receive bookings yet.
            </p>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <HealthStat
              icon={ShieldAlert}
              label="Critical"
              value={String(criticalCount)}
              hint="Needs fast admin action"
              danger={criticalCount > 0}
            />

            <HealthStat
              icon={Clock3}
              label="Attention"
              value={String(attentionCount)}
              hint="Can create user confusion"
              danger={attentionCount > 0}
            />

            <HealthStat
              icon={MessageCircle}
              label="Open disputes"
              value={String(openDisputes.length)}
              hint="Reported problems"
              danger={openDisputes.length > 0}
            />

            <HealthStat
              icon={Video}
              label="Missing call rooms"
              value={String(bookingsWithoutCallRoom.length)}
              hint="Confirmed without room"
              danger={bookingsWithoutCallRoom.length > 0}
            />
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="grid gap-6">
          <HealthSection
            title="Paid but not confirmed"
            description="Payment was received more than 30 minutes ago, but the booking is still not confirmed. Check Stripe webhook logs."
            count={paidNotConfirmed.length}
            danger
          >
            {paidNotConfirmed.length > 0 ? (
              paidNotConfirmed.map((booking) => (
                <BookingHealthRow key={booking.id} booking={booking} />
              ))
            ) : (
              <EmptyHealthState text="No paid bookings stuck in processing." />
            )}
          </HealthSection>

          <HealthSection
            title="Confirmed calls ended but not completed"
            description="The scheduled call time already ended, but the booking is still confirmed. Expert may need to mark it completed."
            count={endedNotCompleted.length}
            danger={endedNotCompleted.length > 0}
          >
            {endedNotCompleted.length > 0 ? (
              endedNotCompleted.map((booking) => (
                <BookingHealthRow key={booking.id} booking={booking} />
              ))
            ) : (
              <EmptyHealthState text="No ended confirmed calls waiting for completion." />
            )}
          </HealthSection>

          <HealthSection
            title="Completed bookings without review"
            description="The call is completed, but the buyer has not left a review after 24 hours."
            count={completedWithoutReview.length}
            danger={completedWithoutReview.length > 0}
          >
            {completedWithoutReview.length > 0 ? (
              completedWithoutReview.map((booking) => (
                <BookingHealthRow key={booking.id} booking={booking} />
              ))
            ) : (
              <EmptyHealthState text="No completed bookings waiting too long for review." />
            )}
          </HealthSection>

          <HealthSection
            title="Open disputes"
            description="Buyer or helper reported a booking problem. These should be reviewed quickly."
            count={openDisputes.length}
            danger={openDisputes.length > 0}
          >
            {openDisputes.length > 0 ? (
              openDisputes.map((report) => (
                <ReportHealthRow key={report.id} report={report} />
              ))
            ) : (
              <EmptyHealthState text="No open disputes." />
            )}
          </HealthSection>

          <HealthSection
            title="Confirmed bookings without call room"
            description="Confirmed bookings should have a call room. Missing room can block users from joining."
            count={bookingsWithoutCallRoom.length}
            danger={bookingsWithoutCallRoom.length > 0}
          >
            {bookingsWithoutCallRoom.length > 0 ? (
              bookingsWithoutCallRoom.map((booking) => (
                <BookingHealthRow key={booking.id} booking={booking} />
              ))
            ) : (
              <EmptyHealthState text="No confirmed bookings missing call rooms." />
            )}
          </HealthSection>

          <HealthSection
            title="Old pending bookings"
            description="Pending bookings older than 1 hour should normally be expired. If they remain, expiration cleanup may need review."
            count={pendingTooLong.length}
            danger={pendingTooLong.length > 0}
          >
            {pendingTooLong.length > 0 ? (
              pendingTooLong.map((booking) => (
                <BookingHealthRow key={booking.id} booking={booking} />
              ))
            ) : (
              <EmptyHealthState text="No old pending bookings." />
            )}
          </HealthSection>

          <HealthSection
            title="Approved experts not ready to sell"
            description="Approved experts with no active service, no future availability, or missing Stripe payout setup."
            count={expertsNotReady.length}
            danger={expertsNotReady.length > 0}
          >
            {expertsNotReady.length > 0 ? (
              expertsNotReady.map((expert) => (
                <ExpertHealthRow key={expert.id} expert={expert} />
              ))
            ) : (
              <EmptyHealthState text="All approved experts look ready enough to sell." />
            )}
          </HealthSection>
        </div>
      </section>
    </main>
  );
}

const bookingInclude = {
  buyer: true,
  expert: {
    include: {
      user: true,
    },
  },
  service: true,
  callRoom: true,
  review: true,
} as const;

type BookingHealthRowBooking = {
  id: string;
  status: BookingStatus;
  startTime: Date;
  endTime: Date;
  priceCents: number;
  buyer: {
    name: string | null;
    email: string;
  };
  expert: {
    id: string;
    user: {
      name: string | null;
      email: string;
    };
  };
  service: {
    title: string;
  } | null;
  callRoom: {
    roomUrl: string;
  } | null;
  review: {
    id: string;
    rating: number;
  } | null;
};

function BookingHealthRow({ booking }: { booking: BookingHealthRowBooking }) {
  const statusUi = getBookingStatusUi({
    status: booking.status,
    role: "admin",
  });

  return (
    <Link
      href={`/admin/bookings?booking=${booking.id}`}
      className="interactive rounded-2xl border border-[var(--border)] bg-white/64 p-4 hover:bg-white"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={toBadgeVariant(statusUi.variant)}>
              {statusUi.label}
            </Badge>

            {!booking.callRoom ? (
              <Badge variant="danger">No call room</Badge>
            ) : null}

            {!booking.review && booking.status === BookingStatus.COMPLETED ? (
              <Badge variant="accent">No review</Badge>
            ) : null}
          </div>

          <p className="mt-3 font-black tracking-[-0.02em]">
            {booking.service?.title ?? "Booked call"}
          </p>

          <p className="mt-1 text-sm font-semibold text-muted">
            Buyer: {booking.buyer.name ?? booking.buyer.email}
          </p>

          <p className="mt-1 text-sm font-semibold text-muted">
            Helper: {booking.expert.user.name ?? booking.expert.user.email}
          </p>
        </div>

        <div className="text-right text-sm font-bold text-muted">
          <p>{formatDateTime(booking.startTime)}</p>
          <p>{formatMoney(booking.priceCents)}</p>
        </div>
      </div>

      <p className="mt-3 text-sm font-semibold leading-6 text-muted">
        {statusUi.description}
      </p>
    </Link>
  );
}

type ReportHealthRowReport = {
  id: string;
  reason: string;
  message: string | null;
  createdAt: Date;
  reporter: {
    name: string | null;
    email: string;
  };
  booking: BookingHealthRowBooking;
};

function ReportHealthRow({ report }: { report: ReportHealthRowReport }) {
  return (
    <Link
      href="/admin/disputes"
      className="interactive rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge variant="danger">
            <ShieldAlert size={14} />
            {formatReason(report.reason)}
          </Badge>

          <p className="mt-3 font-black tracking-[-0.02em]">
            {report.booking.service?.title ?? "Booking report"}
          </p>

          <p className="mt-1 text-sm font-semibold text-muted">
            Reporter: {report.reporter.name ?? report.reporter.email}
          </p>

          <p className="mt-1 text-sm font-semibold text-muted">
            Booking: {report.booking.id}
          </p>
        </div>

        <p className="text-right text-sm font-bold text-muted">
          {formatDateTime(report.createdAt)}
        </p>
      </div>

      <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-muted">
        {report.message || "No message provided."}
      </p>
    </Link>
  );
}

type ExpertHealthRowExpert = {
  id: string;
  headline: string | null;
  stripeAccountId: string | null;
  user: {
    name: string | null;
    email: string;
  };
  services: {
    id: string;
  }[];
  availability: {
    id: string;
  }[];
};

function ExpertHealthRow({ expert }: { expert: ExpertHealthRowExpert }) {
  const hasService = expert.services.length > 0;
  const hasAvailability = expert.availability.length > 0;
  const hasPayouts = Boolean(expert.stripeAccountId);

  return (
    <Link
      href={`/experts/${expert.id}`}
      className="interactive rounded-2xl border border-[var(--border)] bg-white/64 p-4 hover:bg-white"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-black tracking-[-0.02em]">
            {expert.user.name ?? expert.user.email}
          </p>

          <p className="mt-1 line-clamp-1 text-sm font-semibold text-muted">
            {expert.headline ?? "No headline"}
          </p>
        </div>

        <Badge variant="accent">Needs setup</Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {hasService ? (
          <Badge variant="success">Service ready</Badge>
        ) : (
          <Badge variant="danger">No service</Badge>
        )}

        {hasAvailability ? (
          <Badge variant="success">Availability ready</Badge>
        ) : (
          <Badge variant="danger">No availability</Badge>
        )}

        {hasPayouts ? (
          <Badge variant="success">Payout connected</Badge>
        ) : (
          <Badge variant="danger">Payout missing</Badge>
        )}
      </div>
    </Link>
  );
}

function HealthSection({
  title,
  description,
  count,
  danger,
  children,
}: {
  title: string;
  description: string;
  count: number;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={
        danger
          ? "border-[var(--danger)]/20 bg-[var(--danger-soft)] p-5 md:p-6"
          : "p-5 md:p-6"
      }
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <Badge variant={danger ? "danger" : "success"}>
            {danger ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
            {count} issue{count === 1 ? "" : "s"}
          </Badge>

          <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
            {title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-muted">
            {description}
          </p>
        </div>

        <Link href="/admin/bookings" className="btn btn-secondary">
          Open bookings
        </Link>
      </div>

      <div className="mt-6 grid gap-3">{children}</div>
    </Card>
  );
}

function HealthStat({
  icon: Icon,
  label,
  value,
  hint,
  danger,
}: {
  icon: typeof ShieldAlert;
  label: string;
  value: string;
  hint: string;
  danger?: boolean;
}) {
  return (
    <Card soft className="p-4">
      <div
        className={
          danger
            ? "flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--danger-soft)] text-[var(--danger)]"
            : "flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]"
        }
      >
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

function EmptyHealthState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <p className="font-black">Everything looks good.</p>
      <p className="mt-1 text-sm font-semibold text-muted">{text}</p>
    </div>
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

function toBadgeVariant(
  variant: "warning" | "primary" | "success" | "danger" | "muted" | "accent",
) {
  if (variant === "warning") {
    return "accent";
  }

  if (variant === "muted") {
    return "accent";
  }

  return variant;
}