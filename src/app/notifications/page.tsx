import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MessageCircle,
  ShieldAlert,
  Star,
  Trash2,
  WalletCards,
  XCircle,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  clearNotificationsAction,
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notification.actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type NotificationsPageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

const NOTIFICATIONS_PAGE_SIZE = 20;

export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const { user } = await requireRole(["buyer", "expert", "admin"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!currentUser) {
    redirect("/sign-in");
  }

  const requestedPage = Number(resolvedSearchParams.page ?? 1);
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const notificationWhere = {
    deletedAt: null,
    OR: [
      {
        userId: currentUser.id,
      },
      {
        email: currentUser.email,
      },
    ],
  };

  const totalNotificationsCount = await prisma.notification.count({
    where: notificationWhere,
  });

  const totalPages = Math.max(
    Math.ceil(totalNotificationsCount / NOTIFICATIONS_PAGE_SIZE),
    1,
  );

  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * NOTIFICATIONS_PAGE_SIZE;

  const [
    notifications,
    unreadCount,
    bookingNotifications,
    paymentNotifications,
  ] = await Promise.all([
    prisma.notification.findMany({
      where: notificationWhere,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: NOTIFICATIONS_PAGE_SIZE,
    }),

    prisma.notification.count({
      where: {
        ...notificationWhere,
        isRead: false,
      },
    }),

    prisma.notification.count({
      where: {
        ...notificationWhere,
        type: {
          in: [
            "BOOKING_CREATED",
            "BOOKING_PENDING_PAYMENT",
            "BOOKING_EXPIRED",
            "BOOKING_CANCELLED",
            "BOOKING_REFUNDED",
            "BOOKING_DISPUTED",
          ],
        },
      },
    }),

    prisma.notification.count({
      where: {
        ...notificationWhere,
        OR: [
          {
            type: "PAYMENT_CONFIRMED",
          },
          {
            type: "BOOKING_REFUNDED",
          },
        ],
      },
    }),
  ]);

  const backHref = getDashboardHref(currentUser.role);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Badge variant={unreadCount > 0 ? "accent" : "primary"}>
                {unreadCount > 0 ? <BellRing size={14} /> : <Bell size={14} />}
                Notifications
              </Badge>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Your SkillDrop updates.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Booking updates, payment confirmations, review requests, refunds,
                disputes and important account activity appear here.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
              {unreadCount > 0 ? (
                <form action={markAllNotificationsReadAction}>
                  <input type="hidden" name="returnTo" value="/notifications" />
                  <button type="submit" className="btn btn-primary w-full">
                    Mark all read
                    <CheckCircle2 size={18} />
                  </button>
                </form>
              ) : null}

              {totalNotificationsCount > 0 ? (
                <form action={clearNotificationsAction}>
                  <input type="hidden" name="returnTo" value="/notifications" />
                  <button type="submit" className="btn btn-secondary w-full">
                    Clear all
                    <Trash2 size={18} />
                  </button>
                </form>
              ) : (
                <Link href={backHref} className="btn btn-secondary">
                  Dashboard
                </Link>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-4">
            <MetricCard
              label="Unread"
              value={String(unreadCount)}
              hint="Needs attention"
            />

            <MetricCard
              label="Total"
              value={String(totalNotificationsCount)}
              hint="Visible updates"
            />

            <MetricCard
              label="Bookings"
              value={String(bookingNotifications)}
              hint="Booking-related"
            />

            <MetricCard
              label="Payments"
              value={String(paymentNotifications)}
              hint="Payment/refund"
            />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <Card className="p-5 md:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <Badge variant="primary">
                <Bell size={14} />
                Inbox
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Recent notifications
              </h2>

              <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-muted">
                Open the related page, mark updates as read, or delete updates
                you no longer need.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge>{notifications.length} shown</Badge>
              <Badge>{formatRole(currentUser.role)}</Badge>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={{
                    id: notification.id,
                    type: notification.type,
                    subject: notification.subject,
                    message: notification.message,
                    metadata: notification.metadata,
                    isRead: notification.isRead,
                    createdAt: notification.createdAt,
                  }}
                  role={currentUser.role}
                />
              ))
            ) : (
              <EmptyState />
            )}
          </div>

          {totalNotificationsCount > NOTIFICATIONS_PAGE_SIZE ? (
            <PaginationControls page={safePage} totalPages={totalPages} />
          ) : null}
        </Card>
      </section>
    </main>
  );
}

function PaginationControls({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const previousPage = Math.max(page - 1, 1);
  const nextPage = Math.min(page + 1, totalPages);

  return (
    <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 sm:flex-row">
      <p className="text-sm font-bold text-muted">
        Page {page} of {totalPages}
      </p>

      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={`/notifications?page=${previousPage}`}
            className="btn btn-secondary"
          >
            Previous
          </Link>
        ) : null}

        {page < totalPages ? (
          <Link
            href={`/notifications?page=${nextPage}`}
            className="btn btn-primary"
          >
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function NotificationCard({
  notification,
  role,
}: {
  notification: {
    id: string;
    type: string;
    subject: string;
    message: string;
    metadata: unknown;
    isRead: boolean;
    createdAt: Date;
  };
  role: string;
}) {
  const actionHref = getNotificationActionHref({
    type: notification.type,
    metadata: notification.metadata,
    role,
  });

  const Icon = getNotificationIcon(notification.type);

  const serviceTitle = getMetadataString(notification.metadata, "serviceTitle");
  const buyerName = getMetadataString(notification.metadata, "buyerName");
  const note = getMetadataString(notification.metadata, "note");
  const disputeReason = getMetadataString(notification.metadata, "disputeReason");
  const resolution = getMetadataString(notification.metadata, "resolution");
  const bookingId = getMetadataString(notification.metadata, "bookingId");
  const expertId = getMetadataString(notification.metadata, "expertId");

  return (
    <div
      className={
        notification.isRead
          ? "rounded-[26px] border border-[var(--border)] bg-white/64 p-4"
          : "rounded-[26px] border border-[var(--primary)]/25 bg-[var(--primary-soft)] p-4"
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="flex gap-4">
          <div
            className={
              notification.isRead
                ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-muted"
                : "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--primary-dark)]"
            }
          >
            <Icon size={21} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge isRead={notification.isRead} />
              <TypeBadge type={notification.type} />

              <p className="text-xs font-bold text-muted">
                {formatDateTime(notification.createdAt)}
              </p>
            </div>

            <h3 className="mt-3 text-xl font-black tracking-[-0.03em]">
              {notification.subject}
            </h3>

            <p className="mt-2 text-sm font-semibold leading-6 text-muted">
              {notification.message}
            </p>

            {serviceTitle || buyerName || disputeReason || resolution ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {serviceTitle ? (
                  <MetaPill label="Service" value={serviceTitle} />
                ) : null}

                {buyerName ? (
                  <MetaPill label="Buyer" value={buyerName} />
                ) : null}

                {disputeReason ? (
                  <MetaPill label="Dispute" value={disputeReason} />
                ) : null}

                {resolution ? (
                  <MetaPill label="Resolution" value={resolution} />
                ) : null}
              </div>
            ) : null}

            {note ? (
              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
                <div className="flex gap-3">
                  <MessageCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-[var(--primary-dark)]"
                  />

                  <div>
                    <p className="text-sm font-black">Booking note</p>
                    <p className="mt-1 line-clamp-5 whitespace-pre-wrap text-sm font-semibold leading-6 text-muted">
                      {note}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {bookingId || expertId ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {bookingId ? <TinyId label="Booking" value={bookingId} /> : null}
                {expertId ? <TinyId label="Expert" value={expertId} /> : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 lg:min-w-[180px]">
          <Link href={actionHref} className="btn btn-primary">
            Open
            <ExternalLink size={17} />
          </Link>

          {!notification.isRead ? (
            <form action={markNotificationReadAction}>
              <input
                type="hidden"
                name="notificationId"
                value={notification.id}
              />

              <button type="submit" className="btn btn-secondary w-full">
                Mark read
              </button>
            </form>
          ) : null}

          <form action={deleteNotificationAction}>
            <input
              type="hidden"
              name="notificationId"
              value={notification.id}
            />
            <input type="hidden" name="returnTo" value="/notifications" />

            <button
              type="submit"
              className="btn btn-secondary w-full border-red-200 text-red-600 hover:bg-red-50"
            >
              Delete
              <Trash2 size={17} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card soft className="p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black tracking-[-0.05em]">{value}</p>

      <p className="mt-1 text-sm font-semibold text-muted">{hint}</p>
    </Card>
  );
}

function StatusBadge({ isRead }: { isRead: boolean }) {
  if (isRead) {
    return <Badge>Read</Badge>;
  }

  return (
    <Badge variant="accent">
      <BellRing size={14} />
      New
    </Badge>
  );
}

function TypeBadge({ type }: { type: string }) {
  if (type === "PAYMENT_CONFIRMED") {
    return <Badge variant="success">Payment confirmed</Badge>;
  }

  if (type === "BOOKING_CREATED") {
    return <Badge variant="primary">Booking created</Badge>;
  }

  if (type === "BOOKING_PENDING_PAYMENT") {
    return <Badge variant="accent">Waiting payment</Badge>;
  }

  if (type === "BOOKING_EXPIRED") {
    return <Badge variant="danger">Expired</Badge>;
  }

  if (type === "BOOKING_CANCELLED") {
    return <Badge variant="danger">Cancelled</Badge>;
  }

  if (type === "CALL_COMPLETED") {
    return <Badge variant="success">Call completed</Badge>;
  }

  if (type === "REVIEW_REQUESTED") {
    return <Badge variant="accent">Review requested</Badge>;
  }

  if (type === "REVIEW_RECEIVED") {
    return <Badge variant="success">Review received</Badge>;
  }

  if (type === "BOOKING_REFUNDED") {
    return <Badge variant="danger">Refunded</Badge>;
  }

  if (type === "BOOKING_DISPUTED") {
    return <Badge variant="danger">Disputed</Badge>;
  }

  return <Badge>{formatNotificationType(type)}</Badge>;
}

function getNotificationIcon(type: string) {
  if (type === "PAYMENT_CONFIRMED") {
    return WalletCards;
  }

  if (type === "BOOKING_CREATED" || type === "BOOKING_PENDING_PAYMENT") {
    return CalendarDays;
  }

  if (type === "BOOKING_EXPIRED") {
    return Clock3;
  }

  if (type === "BOOKING_CANCELLED" || type === "BOOKING_REFUNDED") {
    return XCircle;
  }

  if (type === "CALL_COMPLETED") {
    return CheckCircle2;
  }

  if (type === "REVIEW_REQUESTED" || type === "REVIEW_RECEIVED") {
    return Star;
  }

  if (type === "BOOKING_DISPUTED") {
    return ShieldAlert;
  }

  return MessageCircle;
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-white/64 px-3 py-1.5 text-xs font-black text-[var(--muted-foreground)]">
      <span className="text-muted">{label}:</span>
      <span className="truncate">{value}</span>
    </span>
  );
}

function TinyId({ label, value }: { label: string; value: string }) {
  return (
    <span
      title={value}
      className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-white/64 px-3 py-1.5 text-[10px] font-black text-muted"
    >
      {label}: <span className="max-w-[160px] truncate">{value}</span>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[26px] border border-dashed border-[var(--border-strong)] bg-white/55 p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Bell size={28} />
      </div>

      <h3 className="mt-6 text-3xl font-black tracking-[-0.05em]">
        No notifications yet.
      </h3>

      <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-muted">
        Booking updates, payments, reviews and important messages will appear
        here.
      </p>
    </div>
  );
}

function getNotificationActionHref({
  type,
  metadata,
  role,
}: {
  type: string;
  metadata: unknown;
  role: string;
}) {
  const bookingId = getMetadataString(metadata, "bookingId");
  const expertId = getMetadataString(metadata, "expertId");

  if (role === "ADMIN" && bookingId) {
    return `/admin/bookings?q=${encodeURIComponent(bookingId)}`;
  }

  if (type === "REVIEW_REQUESTED" && bookingId) {
    return `/buyer/reviews?bookingId=${bookingId}`;
  }

  if (type === "REVIEW_RECEIVED") {
    return role === "ADMIN" ? "/admin/bookings" : "/expert/stats";
  }

  if (type === "BOOKING_CREATED" && bookingId) {
    return `/buyer/bookings/${bookingId}/checkout`;
  }

  if (type === "BOOKING_EXPIRED" && expertId) {
    return `/experts/${expertId}`;
  }

  if (
    type === "PAYMENT_CONFIRMED" ||
    type === "BOOKING_PENDING_PAYMENT" ||
    type === "BOOKING_CANCELLED" ||
    type === "CALL_COMPLETED" ||
    type === "BOOKING_REFUNDED" ||
    type === "BOOKING_DISPUTED"
  ) {
    return bookingId
      ? `${getBookingsHref(role)}?booking=${encodeURIComponent(bookingId)}`
      : getBookingsHref(role);
  }

  return getDashboardHref(role);
}

function getMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "";
  }

  const value = (metadata as Record<string, unknown>)[key];

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function getDashboardHref(role: string) {
  if (role === "ADMIN") {
    return "/admin";
  }

  if (role === "EXPERT") {
    return "/expert";
  }

  return "/buyer";
}

function getBookingsHref(role: string) {
  if (role === "ADMIN") {
    return "/admin/bookings";
  }

  if (role === "EXPERT") {
    return "/expert/bookings";
  }

  return "/buyer/bookings";
}

function formatRole(role: string) {
  if (role === "ADMIN") {
    return "Admin";
  }

  if (role === "EXPERT") {
    return "Expert";
  }

  return "Buyer";
}

function formatNotificationType(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(date: Date) {
  const dayPart = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return `${dayPart} · ${timePart}`;
}

export async function deleteNotificationAction(formData: FormData) {
  "use server";

  const { user } = await requireRole(["buyer", "expert", "admin"]);

  const notificationId = String(formData.get("notificationId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/notifications");

  if (!notificationId) {
    return;
  }

  const email = user.email?.toLowerCase();

  if (!email) {
    return;
  }

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      deletedAt: null,
      OR: [
        {
          userId: user.id,
        },
        {
          email,
        },
      ],
    },
    data: {
      deletedAt: new Date(),
    },
  });

  revalidatePath(returnTo);
  revalidatePath("/notifications");
  revalidatePath("/buyer");
  revalidatePath("/expert");
}

export async function clearNotificationsAction(formData: FormData) {
  "use server";

  const { user } = await requireRole(["buyer", "expert", "admin"]);

  const returnTo = String(formData.get("returnTo") ?? "/notifications");
  const email = user.email?.toLowerCase();

  if (!email) {
    return;
  }

  await prisma.notification.updateMany({
    where: {
      deletedAt: null,
      OR: [
        {
          userId: user.id,
        },
        {
          email,
        },
      ],
    },
    data: {
      deletedAt: new Date(),
    },
  });

  revalidatePath(returnTo);
  revalidatePath("/notifications");
  revalidatePath("/buyer");
  revalidatePath("/expert");
}