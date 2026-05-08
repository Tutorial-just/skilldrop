import Link from "next/link";
import type { BookingStatus, Prisma } from "@prisma/client";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Euro,
  RefreshCcw,
  Search,
  ShieldAlert,
  UserRound,
  Video,
  XCircle,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  markBookingDisputedByAdminAction,
  refundBookingByAdminAction,
  resolveDisputeByAdminAction,
  updateBookingStatusByAdminAction,
} from "@/server/actions/admin.actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type AdminBookingsPageProps = {
  searchParams?: Promise<{
    updated?: string;
    error?: string;
    q?: string;
    status?: string;
  }>;
};

const bookingStatuses: BookingStatus[] = [
  "PENDING",
  "PAID",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
  "DISPUTED",
];

const activeStatuses: BookingStatus[] = [
  "PENDING",
  "PAID",
  "CONFIRMED",
  "DISPUTED",
];

export default async function AdminBookingsPage({
  searchParams,
}: AdminBookingsPageProps) {
  await requireRole(["admin"]);

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const query = resolvedSearchParams.q?.trim() ?? "";
  const statusFilter = resolvedSearchParams.status ?? "all";
  const statusValue = statusFilter.toUpperCase() as BookingStatus;

  const bookingWhere: Prisma.BookingWhereInput = {
    ...(statusFilter === "all"
      ? {}
      : statusFilter === "active"
        ? {
            status: {
              in: activeStatuses,
            },
          }
        : bookingStatuses.includes(statusValue)
          ? {
              status: statusValue,
            }
          : {}),

    ...(query
      ? {
          OR: [
            {
              id: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              buyerId: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              expertId: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              serviceId: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              availabilityId: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              buyer: {
                is: {
                  OR: [
                    {
                      email: {
                        contains: query,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      name: {
                        contains: query,
                        mode: "insensitive" as const,
                      },
                    },
                  ],
                },
              },
            },
            {
              expert: {
                is: {
                  user: {
                    is: {
                      OR: [
                        {
                          email: {
                            contains: query,
                            mode: "insensitive" as const,
                          },
                        },
                        {
                          name: {
                            contains: query,
                            mode: "insensitive" as const,
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
            {
              service: {
                is: {
                  OR: [
                    {
                      title: {
                        contains: query,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      description: {
                        contains: query,
                        mode: "insensitive" as const,
                      },
                    },
                  ],
                },
              },
            },
            {
              stripeCheckoutSessionId: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              stripePaymentIntentId: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };
  const [
    bookings,
    totalBookings,
    pendingBookings,
    paidBookings,
    confirmedBookings,
    completedBookings,
    cancelledBookings,
    refundedBookings,
    disputedBookings,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: bookingWhere,
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
      orderBy: {
        createdAt: "desc",
      },
      take: 120,
    }),

    prisma.booking.count(),

    prisma.booking.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.booking.count({
      where: {
        status: "PAID",
      },
    }),

    prisma.booking.count({
      where: {
        status: "CONFIRMED",
      },
    }),

    prisma.booking.count({
      where: {
        status: "COMPLETED",
      },
    }),

    prisma.booking.count({
      where: {
        status: "CANCELLED",
      },
    }),

    prisma.booking.count({
      where: {
        status: "REFUNDED",
      },
    }),

    prisma.booking.count({
      where: {
        status: "DISPUTED",
      },
    }),
  ]);

  const paidVolumeCents = bookings
    .filter(
      (booking) =>
        booking.status === "PAID" ||
        booking.status === "CONFIRMED" ||
        booking.status === "COMPLETED",
    )
    .reduce((sum, booking) => sum + booking.priceCents, 0);

  const shownDisputed = bookings.filter(
    (booking) => booking.status === "DISPUTED",
  ).length;

  const shownRefundable = bookings.filter(
    (booking) =>
      booking.status === "PAID" ||
      booking.status === "CONFIRMED" ||
      booking.status === "COMPLETED" ||
      booking.status === "DISPUTED",
  ).length;

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

          {resolvedSearchParams.updated ? (
            <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black text-[var(--success)]">
              Booking updated successfully.
            </div>
          ) : null}

          {resolvedSearchParams.error ? (
            <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-black text-[var(--danger)]">
              {formatBookingError(resolvedSearchParams.error)}
            </div>
          ) : null}

          <Badge variant="primary" className="mt-8">
            <CalendarDays size={14} />
            Booking operations
          </Badge>

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
            <div>
              <h1 className="heading-lg max-w-4xl text-balance">
                Manage marketplace bookings.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Track payment state, confirmed calls, disputes, refunds and
                completed sessions across SkillDrop.
              </p>
            </div>

            <Card className="p-5">
              <Badge variant="accent">
                <ShieldAlert size={14} />
                Current view
              </Badge>

              <div className="mt-5 grid gap-3">
                <SummaryRow label="Shown bookings" value={String(bookings.length)} />
                <SummaryRow label="Shown disputed" value={String(shownDisputed)} />
                <SummaryRow
                  label="Shown refundable"
                  value={String(shownRefundable)}
                />
                <SummaryRow
                  label="Shown paid volume"
                  value={formatMoney(paidVolumeCents)}
                />
              </div>
            </Card>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <AdminStat
              icon={CalendarDays}
              label="Total"
              value={String(totalBookings)}
              hint="All bookings"
            />

            <AdminStat
              icon={Clock3}
              label="Pending"
              value={String(pendingBookings)}
              hint="Waiting payment"
            />

            <AdminStat
              icon={Euro}
              label="Paid"
              value={String(paidBookings)}
              hint="Waiting confirmation"
            />

            <AdminStat
              icon={CheckCircle2}
              label="Confirmed"
              value={String(confirmedBookings)}
              hint="Ready calls"
            />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <AdminStat
              icon={Video}
              label="Completed"
              value={String(completedBookings)}
              hint="Finished calls"
            />

            <AdminStat
              icon={XCircle}
              label="Cancelled"
              value={String(cancelledBookings)}
              hint="Closed without refund"
            />

            <AdminStat
              icon={RefreshCcw}
              label="Refunded"
              value={String(refundedBookings)}
              hint="Refunded bookings"
            />

            <AdminStat
              icon={ShieldAlert}
              label="Disputed"
              value={String(disputedBookings)}
              hint="Needs admin review"
            />
          </div>

          <form action="/admin/bookings" className="mt-6">
            <div className="grid gap-3 rounded-[28px] border border-[var(--border)] bg-white/64 p-3 shadow-[var(--shadow-sm)] xl:grid-cols-[1fr_190px_auto_auto] xl:items-center">
              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                />

                <input
                  name="q"
                  type="search"
                  defaultValue={query}
                  placeholder="Search buyer, expert, service, Stripe session or payment intent..."
                  className="input min-h-12 w-full pl-11"
                />
              </div>

              <select
                name="status"
                defaultValue={statusFilter}
                className="input min-h-12"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="disputed">Disputed</option>
              </select>

              <button type="submit" className="btn btn-primary">
                Search
              </button>

              {query || statusFilter !== "all" ? (
                <Link href="/admin/bookings" className="btn btn-secondary">
                  Clear
                </Link>
              ) : null}
            </div>
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            <FilterLink current={statusFilter} value="all" label="All" q={query} />
            <FilterLink
              current={statusFilter}
              value="active"
              label="Active"
              q={query}
            />
            <FilterLink
              current={statusFilter}
              value="pending"
              label="Pending"
              q={query}
            />
            <FilterLink current={statusFilter} value="paid" label="Paid" q={query} />
            <FilterLink
              current={statusFilter}
              value="confirmed"
              label="Confirmed"
              q={query}
            />
            <FilterLink
              current={statusFilter}
              value="completed"
              label="Completed"
              q={query}
            />
            <FilterLink
              current={statusFilter}
              value="disputed"
              label="Disputed"
              q={query}
            />
            <FilterLink
              current={statusFilter}
              value="refunded"
              label="Refunded"
              q={query}
            />
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm font-black text-muted">
            Showing {bookings.length} booking{bookings.length === 1 ? "" : "s"}
          </p>

          <div className="flex flex-wrap gap-2">
            <Badge>Search: {query || "none"}</Badge>
            <Badge>Status: {statusFilter}</Badge>
          </div>
        </div>

        <div className="grid gap-5">
          {bookings.length > 0 ? (
            bookings.map((booking) => (
              <BookingAdminCard key={booking.id} booking={booking} />
            ))
          ) : (
            <Card className="p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                <CalendarDays size={24} />
              </div>

              <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
                No bookings found
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-muted">
                Try another search query or status filter.
              </p>

              <div className="mt-5">
                <Link href="/admin/bookings" className="btn btn-secondary">
                  Clear filters
                </Link>
              </div>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}

function BookingAdminCard({
  booking,
}: {
  booking: {
    id: string;
    buyerId: string;
    expertId: string;
    serviceId: string;
    availabilityId: string | null;
    startTime: Date;
    endTime: Date;
    status: BookingStatus;
    priceCents: number;
    currency: string;
    stripeCheckoutSessionId: string | null;
    stripePaymentIntentId: string | null;
    disputeReason: string | null;
    disputeNote: string | null;
    disputedAt: Date | null;
    paidAt: Date | null;
    cancelledAt: Date | null;
    completedAt: Date | null;
    refundedAt: Date | null;
    createdAt: Date;
    buyer: {
      name: string | null;
      email: string;
    };
    expert: {
      user: {
        name: string | null;
        email: string;
      };
    };
    service: {
      title: string;
      durationMinutes: number;
    };
    callRoom: {
      roomUrl: string;
      status: string;
    } | null;
    review: {
      id: string;
      rating: number;
    } | null;
  };
}) {
  const isRefundable =
    booking.status === "PAID" ||
    booking.status === "CONFIRMED" ||
    booking.status === "COMPLETED" ||
    booking.status === "DISPUTED";

  const canDispute =
    booking.status === "PAID" ||
    booking.status === "CONFIRMED" ||
    booking.status === "COMPLETED";

  const canResolveDispute = booking.status === "DISPUTED";

  return (
    <Card className="p-5 md:p-6 hover-lift">
      <div className="grid gap-5 xl:grid-cols-[1fr_320px] xl:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={booking.status} />

            {booking.review ? (
              <Badge variant="success">
                <CheckCircle2 size={14} />
                Reviewed {booking.review.rating}/5
              </Badge>
            ) : null}

            {booking.callRoom ? (
              <Badge>
                <Video size={14} />
                Room {booking.callRoom.status.toLowerCase()}
              </Badge>
            ) : null}

            <Badge>{formatShortDate(booking.createdAt)}</Badge>
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
            {booking.service.title}
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <PersonBox
              label="Buyer"
              name={booking.buyer.name ?? "Buyer"}
              email={booking.buyer.email}
            />

            <PersonBox
              label="Expert"
              name={booking.expert.user.name ?? "Expert"}
              email={booking.expert.user.email}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <SmallFact
              icon={CalendarDays}
              label="Date"
              value={formatDate(booking.startTime)}
            />

            <SmallFact
              icon={Clock3}
              label="Time"
              value={`${formatTime(booking.startTime)} — ${formatTime(
                booking.endTime,
              )}`}
            />

            <SmallFact
              icon={Euro}
              label="Price"
              value={formatMoney(booking.priceCents)}
            />

            <SmallFact
              icon={Video}
              label="Duration"
              value={`${booking.service.durationMinutes} min`}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <IdBox label="Booking ID" value={booking.id} />
            <IdBox
              label="Checkout"
              value={booking.stripeCheckoutSessionId ?? "—"}
            />
            <IdBox
              label="Payment intent"
              value={booking.stripePaymentIntentId ?? "—"}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <IdBox label="Buyer ID" value={booking.buyerId} />
            <IdBox label="Expert ID" value={booking.expertId} />
            <IdBox label="Slot" value={booking.availabilityId ?? "—"} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <TimelineFact label="Paid" value={booking.paidAt} />
            <TimelineFact label="Completed" value={booking.completedAt} />
            <TimelineFact label="Cancelled" value={booking.cancelledAt} />
            <TimelineFact label="Refunded" value={booking.refundedAt} />
            <TimelineFact label="Created" value={booking.createdAt} />
          </div>

          {booking.status === "DISPUTED" ? (
            <div className="mt-4 rounded-[24px] border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4">
              <div className="flex items-center gap-2 font-black text-[var(--danger)]">
                <ShieldAlert size={17} />
                Dispute
              </div>

              <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                Reason: {booking.disputeReason ?? "No reason provided."}
              </p>

              <p className="mt-1 text-sm font-semibold leading-6 text-muted">
                Note: {booking.disputeNote ?? "No note provided."}
              </p>

              {booking.disputedAt ? (
                <p className="mt-2 text-xs font-bold text-muted">
                  Opened {formatDateTime(booking.disputedAt)}
                </p>
              ) : null}
            </div>
          ) : null}

          {booking.callRoom?.roomUrl ? (
            <div className="mt-4">
              <Link href={booking.callRoom.roomUrl} className="btn btn-secondary">
                Open call room
              </Link>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 rounded-[24px] border border-[var(--border)] bg-white/64 p-4">
          <form action={updateBookingStatusByAdminAction} className="grid gap-2">
            <input type="hidden" name="bookingId" value={booking.id} />

            <select name="status" defaultValue={booking.status} className="input">
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="DISPUTED">Disputed</option>
            </select>

            <button type="submit" className="btn btn-secondary w-full">
              Update status
            </button>
          </form>

          {isRefundable ? (
            <form action={refundBookingByAdminAction}>
              <input type="hidden" name="bookingId" value={booking.id} />

              <button type="submit" className="btn btn-danger w-full">
                Refund booking
                <RefreshCcw size={17} />
              </button>
            </form>
          ) : null}

          {canDispute ? (
            <form action={markBookingDisputedByAdminAction} className="grid gap-2">
              <input type="hidden" name="bookingId" value={booking.id} />

              <select name="disputeReason" className="input" required>
                <option value="">Dispute reason</option>
                <option value="buyer_issue">Buyer issue</option>
                <option value="expert_issue">Expert issue</option>
                <option value="payment_issue">Payment issue</option>
                <option value="call_issue">Call issue</option>
                <option value="other">Other</option>
              </select>

              <textarea
                name="disputeNote"
                rows={3}
                className="input min-h-24 resize-none"
                placeholder="Optional dispute note..."
              />

              <button type="submit" className="btn btn-danger w-full">
                Mark disputed
                <ShieldAlert size={17} />
              </button>
            </form>
          ) : null}

          {canResolveDispute ? (
            <div className="grid gap-2">
              <form action={resolveDisputeByAdminAction}>
                <input type="hidden" name="bookingId" value={booking.id} />
                <input type="hidden" name="resolution" value="COMPLETED" />

                <button type="submit" className="btn btn-primary w-full">
                  Resolve completed
                </button>
              </form>

              <form action={resolveDisputeByAdminAction}>
                <input type="hidden" name="bookingId" value={booking.id} />
                <input type="hidden" name="resolution" value="CANCELLED" />

                <button type="submit" className="btn btn-danger w-full">
                  Resolve cancelled
                </button>
              </form>
            </div>
          ) : null}

          <Link href={`/experts/${booking.expertId}`} className="btn btn-secondary">
            View expert
          </Link>
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  if (status === "COMPLETED") {
    return <Badge variant="success">Completed</Badge>;
  }

  if (status === "CONFIRMED") {
    return <Badge variant="primary">Confirmed</Badge>;
  }

  if (status === "PAID") {
    return <Badge variant="success">Paid</Badge>;
  }

  if (status === "PENDING") {
    return <Badge variant="accent">Pending</Badge>;
  }

  if (status === "DISPUTED") {
    return <Badge variant="danger">Disputed</Badge>;
  }

  if (status === "REFUNDED") {
    return <Badge variant="danger">Refunded</Badge>;
  }

  if (status === "CANCELLED") {
    return <Badge variant="danger">Cancelled</Badge>;
  }

  return <Badge>Unknown</Badge>;
}

function PersonBox({
  label,
  name,
  email,
}: {
  label: string;
  name: string;
  email: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
        <UserRound size={13} />
        {label}
      </div>

      <p className="mt-3 font-black tracking-[-0.02em]">{name}</p>

      <p className="mt-1 break-all text-sm font-semibold leading-6 text-muted">
        {email}
      </p>
    </div>
  );
}

function SmallFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
        <Icon size={13} />
        {label}
      </div>

      <p className="mt-2 text-sm font-black">{value}</p>
    </div>
  );
}

function IdBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>

      <p className="mt-2 truncate text-xs font-black" title={value}>
        {value}
      </p>
    </div>
  );
}

function TimelineFact({ label, value }: { label: string; value: Date | null }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-xs font-black">
        {value ? formatShortDate(value) : "—"}
      </p>
    </div>
  );
}

function AdminStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card soft className="p-4 hover-lift">
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="text-sm font-black">{value}</p>
    </div>
  );
}

function FilterLink({
  current,
  value,
  label,
  q,
}: {
  current: string;
  value: string;
  label: string;
  q: string;
}) {
  const isActive = current === value;

  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (value !== "all") {
    params.set("status", value);
  }

  const href = params.toString()
    ? `/admin/bookings?${params.toString()}`
    : "/admin/bookings";

  return (
    <Link
      href={href}
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

function formatMoney(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".00", "")}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
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

function formatBookingError(error: string) {
  if (error === "invalid-status") {
    return "Invalid booking status.";
  }

  if (error === "booking-not-found") {
    return "Booking was not found.";
  }

  if (error === "already-refunded") {
    return "This booking has already been refunded.";
  }

  if (error === "no-stripe-session") {
    return "This booking has no Stripe checkout session.";
  }

  if (error === "no-payment-intent") {
    return "Stripe payment intent was not found.";
  }

  if (error === "missing-dispute-data") {
    return "Please choose a dispute reason.";
  }

  if (error === "not-disputed") {
    return "Only disputed bookings can be resolved here.";
  }

  if (error === "invalid-resolution") {
    return "Invalid dispute resolution.";
  }

  if (error === "refund-failed") {
    return "Refund failed. Please check Stripe and try again.";
  }

  return "Something went wrong while updating this booking.";
}