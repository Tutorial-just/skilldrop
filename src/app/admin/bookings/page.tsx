import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Euro,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
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
    status?: string;
    q?: string;
  }>;
};

export default async function AdminBookingsPage({
  searchParams,
}: AdminBookingsPageProps) {
  await requireRole(["admin"]);

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const statusFilter = resolvedSearchParams.status ?? "active";
  const query = resolvedSearchParams.q?.trim() ?? "";

  const statusWhere =
    statusFilter === "all"
      ? {}
      : statusFilter === "active"
        ? {
            status: {
              in: ["PENDING", "CONFIRMED", "DISPUTED"] as const,
            },
          }
        : {
            status: statusFilter.toUpperCase() as
              | "PENDING"
              | "PAID"
              | "CONFIRMED"
              | "COMPLETED"
              | "CANCELLED"
              | "REFUNDED"
              | "DISPUTED",
          };

  const searchWhere = query
    ? {
        OR: [
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
                title: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
            },
          },
          {
            stripeCheckoutSessionId: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : {};

  const bookingWhere = {
    ...statusWhere,
    ...searchWhere,
  };

  const bookings = await prisma.booking.findMany({
    where: bookingWhere,
    include: {
      buyer: true,
      expert: {
        include: {
          user: true,
        },
      },
      service: true,
      availability: true,
      callRoom: true,
      review: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  const pendingCount = bookings.filter((b) => b.status === "PENDING").length;
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;
  const completedCount = bookings.filter((b) => b.status === "COMPLETED").length;
  const disputedCount = bookings.filter((b) => b.status === "DISPUTED").length;

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
              Something went wrong while updating this booking.
            </div>
          ) : null}

          <Badge variant="primary" className="mt-8">
            <CalendarDays size={14} />
            Booking operations
          </Badge>

          <h1 className="heading-lg mt-5 max-w-4xl text-balance">
            Monitor and manage bookings.
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
            Track pending, confirmed, completed, cancelled, refunded and
            disputed bookings.
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-4">
            <AdminMiniStat label="Total" value={String(bookings.length)} />
            <AdminMiniStat label="Pending" value={String(pendingCount)} />
            <AdminMiniStat label="Confirmed" value={String(confirmedCount)} />
            <AdminMiniStat label="Disputed" value={String(disputedCount)} />
          </div>

          <form action="/admin/bookings" className="mt-6 max-w-3xl">
            <input type="hidden" name="status" value={statusFilter} />

            <div className="flex flex-col gap-3 rounded-[28px] border border-[var(--border)] bg-white/64 p-3 shadow-[var(--shadow-sm)] md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                />

                <input
                  name="q"
                  type="search"
                  defaultValue={query}
                  placeholder="Search buyer, expert, service or Stripe session..."
                  className="input min-h-12 w-full pl-11"
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Search
              </button>

              {query ? (
                <Link
                  href={`/admin/bookings?status=${statusFilter}`}
                  className="btn btn-secondary"
                >
                  Clear
                </Link>
              ) : null}
            </div>
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            <FilterLink
              q={query}
              current={statusFilter}
              value="active"
              label="Active"
            />
            <FilterLink
              q={query}
              current={statusFilter}
              value="pending"
              label="Pending"
            />
            <FilterLink
              q={query}
              current={statusFilter}
              value="confirmed"
              label="Confirmed"
            />
            <FilterLink
              q={query}
              current={statusFilter}
              value="completed"
              label="Completed"
            />
            <FilterLink
              q={query}
              current={statusFilter}
              value="cancelled"
              label="Cancelled"
            />
            <FilterLink
              q={query}
              current={statusFilter}
              value="refunded"
              label="Refunded"
            />
            <FilterLink
              q={query}
              current={statusFilter}
              value="disputed"
              label="Disputed"
            />
            <FilterLink q={query} current={statusFilter} value="all" label="All" />
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm font-black text-muted">
            Showing {bookings.length} booking{bookings.length === 1 ? "" : "s"}
          </p>

          <div className="flex flex-wrap gap-2">
            <Badge>Status: {statusFilter}</Badge>
            <Badge>Search: {query || "none"}</Badge>
          </div>
        </div>

        <div className="grid gap-5">
          {bookings.length > 0 ? (
            bookings.map((booking) => (
              <BookingAdminCard key={booking.id} booking={booking} />
            ))
          ) : (
            <Card className="p-8 text-center">
              <h2 className="text-2xl font-black tracking-[-0.04em]">
                No bookings found
              </h2>
              <p className="mt-3 text-sm font-semibold text-muted">
                Try another status filter or search query.
              </p>
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
    startTime: Date;
    endTime: Date;
    status: string;
    disputeReason: string | null;
    disputeNote: string | null;
    disputedAt: Date | null;
    priceCents: number;
    currency: string;
    stripeCheckoutSessionId: string | null;
    createdAt: Date;
    expiresAt: Date | null;
    buyer: {
      email: string;
      name: string | null;
    };
    expert: {
      user: {
        email: string;
        name: string | null;
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
  return (
    <Card className="p-5 md:p-6">
      <div className="grid gap-5 xl:grid-cols-[1fr_280px] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={booking.status} />

            {booking.review ? (
              <Badge variant="success">Reviewed {booking.review.rating}/5</Badge>
            ) : null}

            {booking.stripeCheckoutSessionId ? (
              <Badge variant="primary">Stripe linked</Badge>
            ) : (
              <Badge variant="accent">No Stripe session</Badge>
            )}
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
            {booking.service.title}
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SmallFact
              icon={UserRound}
              label="Buyer"
              value={booking.buyer.name ?? booking.buyer.email}
            />
            <SmallFact
              icon={ShieldCheck}
              label="Expert"
              value={booking.expert.user.name ?? booking.expert.user.email}
            />
            <SmallFact
              icon={Clock3}
              label="Time"
              value={formatDateTime(booking.startTime)}
            />
            <SmallFact
              icon={Euro}
              label="Price"
              value={formatMoney(booking.priceCents)}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <InfoRow label="Created" value={formatDateTime(booking.createdAt)} />
            <InfoRow
              label="Expires"
              value={booking.expiresAt ? formatDateTime(booking.expiresAt) : "—"}
            />
            <InfoRow
              label="Call room"
              value={booking.callRoom ? booking.callRoom.status : "—"}
            />
          </div>

          {booking.disputeReason ? (
           <div className="mt-4 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4">
             <p className="text-sm font-black text-[var(--danger)]">
               Dispute: {formatDisputeReason(booking.disputeReason)}
             </p>

             {booking.disputeNote ? (
               <p className="mt-2 text-sm font-bold leading-6 text-[var(--danger)]">
                 {booking.disputeNote}
               </p>
              ) : null}

              {booking.disputedAt ? (
                <p className="mt-2 text-xs font-bold text-[var(--danger)]">
                  Opened: {formatDateTime(booking.disputedAt)}
               </p>
              ) : null}
            </div>
          ) : null}

          {booking.status === "DISPUTED" ? (
            <div className="mt-4 grid gap-3 rounded-[24px] border border-[var(--border)] bg-white/64 p-4 md:grid-cols-2">
               <form action={resolveDisputeByAdminAction}>
                 <input type="hidden" name="bookingId" value={booking.id} />
                 <input type="hidden" name="resolution" value="COMPLETED" />

                 <button type="submit" className="btn btn-primary w-full">
                   <CheckCircle2 size={17} />
                   Resolve as completed
                 </button>
               </form>

               <form action={resolveDisputeByAdminAction}>
                 <input type="hidden" name="bookingId" value={booking.id} />
                 <input type="hidden" name="resolution" value="CANCELLED" />

                  <button type="submit" className="btn btn-danger w-full">
                    <XCircle size={17} />
                    Resolve as cancelled
                 </button>
               </form>
             </div>
          ) : null}

          {booking.stripeCheckoutSessionId ? (
            <p className="mt-4 break-all rounded-2xl border border-[var(--border)] bg-white/64 p-3 text-xs font-bold text-muted">
              Stripe session: {booking.stripeCheckoutSessionId}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 rounded-[24px] border border-[var(--border)] bg-white/64 p-4">
          <AdminStatusButton
            bookingId={booking.id}
            status="CONFIRMED"
            label="Mark confirmed"
            icon="confirm"
          />

          <AdminStatusButton
            bookingId={booking.id}
            status="COMPLETED"
            label="Mark completed"
            icon="confirm"
          />

          <AdminStatusButton
            bookingId={booking.id}
            status="CANCELLED"
            label="Cancel"
            icon="cancel"
          />

          <form action={refundBookingByAdminAction}>
            <input type="hidden" name="bookingId" value={booking.id} />
            <button type="submit" className="btn btn-danger w-full">
              <XCircle size={17} />
              Refund payment
            </button>
          </form>

          <form action={markBookingDisputedByAdminAction} className="grid gap-2">
            <input type="hidden" name="bookingId" value={booking.id} />

             <select name="disputeReason" required className="input min-h-11">
               <option value="">Choose dispute reason</option>
               <option value="BUYER_NO_SHOW">Buyer no-show</option>
               <option value="EXPERT_NO_SHOW">Expert no-show</option>
               <option value="QUALITY_ISSUE">Quality issue</option>
               <option value="PAYMENT_ISSUE">Payment issue</option>
               <option value="OTHER">Other</option>
             </select>

             <textarea
               name="disputeNote"
               rows={3}
               placeholder="Admin note..."
               className="w-full rounded-2xl border border-[var(--border)] bg-white/88 p-3 text-sm font-semibold leading-6 outline-none"
              />
              <button type="submit" className="btn btn-secondary w-full">
                <ShieldAlert size={17} />
                Open dispute
              </button>
          </form>

        </div>
      </div>
    </Card>
  );
}

function AdminStatusButton({
  bookingId,
  status,
  label,
  icon,
}: {
  bookingId: string;
  status: string;
  label: string;
  icon: "confirm" | "cancel" | "dispute";
}) {
  const Icon =
    icon === "confirm" ? CheckCircle2 : icon === "cancel" ? XCircle : ShieldAlert;

  const className =
    icon === "confirm"
      ? "btn btn-primary w-full"
      : icon === "cancel"
        ? "btn btn-danger w-full"
        : "btn btn-secondary w-full";

  return (
    <form action={updateBookingStatusByAdminAction}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="status" value={status} />

      <button type="submit" className={className}>
        <Icon size={17} />
        {label}
      </button>
    </form>
  );
}

function FilterLink({
  q,
  current,
  value,
  label,
}: {
  q: string;
  current: string;
  value: string;
  label: string;
}) {
  const isActive = current === value;
  const params = new URLSearchParams();

  if (value !== "active") {
    params.set("status", value);
  }

  if (q) {
    params.set("q", q);
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
          : "rounded-full border border-[var(--border)] bg-white/64 px-4 py-2 text-sm font-black text-[var(--muted-foreground)] transition hover:bg-white hover:text-[var(--primary-dark)]"
      }
    >
      {label}
    </Link>
  );
}

function AdminMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card soft className="p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{value}</p>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "CONFIRMED") {
    return <Badge variant="success">Confirmed</Badge>;
  }

  if (status === "COMPLETED") {
    return <Badge variant="success">Completed</Badge>;
  }

  if (status === "PENDING") {
    return <Badge variant="accent">Pending</Badge>;
  }

  if (status === "DISPUTED") {
    return <Badge variant="danger">Disputed</Badge>;
  }

  if (status === "CANCELLED" || status === "REFUNDED") {
    return <Badge variant="danger">{status.toLowerCase()}</Badge>;
  }

  return <Badge>{status.toLowerCase()}</Badge>;
}

function SmallFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
        <Icon size={13} />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-black" title={value}>
        {value}
      </p>
    </div>
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
function formatDisputeReason(reason: string) {
  if (reason === "BUYER_NO_SHOW") {
    return "Buyer no-show";
  }

  if (reason === "EXPERT_NO_SHOW") {
    return "Expert no-show";
  }

  if (reason === "QUALITY_ISSUE") {
    return "Quality issue";
  }

  if (reason === "PAYMENT_ISSUE") {
    return "Payment issue";
  }

  return "Other";
}