import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  MessageCircle,
  ShieldAlert,
  Star,
  Video,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  markNotificationUnreadAction,
} from "@/server/actions/notification.actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type NotificationsPageProps = {
  searchParams?: Promise<{
    filter?: string;
  }>;
};

export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const { user } = await requireRole(["buyer", "expert", "admin"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const email = user.email?.toLowerCase();

  if (!email) {
    return null;
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!currentUser) {
    return null;
  }

  const filter = normalizeFilter(resolvedSearchParams.filter);

  const notificationWhere = {
    OR: [
      {
        userId: currentUser.id,
      },
      {
        email: currentUser.email,
      },
    ],
    ...(filter === "unread"
      ? {
          isRead: false,
        }
      : {}),
    ...(filter === "read"
      ? {
          isRead: true,
        }
      : {}),
  };

  const [notifications, totalCount, unreadCount, readCount] = await Promise.all([
    prisma.notification.findMany({
      where: notificationWhere,
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    }),
    prisma.notification.count({
      where: {
        OR: [
          {
            userId: currentUser.id,
          },
          {
            email: currentUser.email,
          },
        ],
      },
    }),
    prisma.notification.count({
      where: {
        isRead: false,
        OR: [
          {
            userId: currentUser.id,
          },
          {
            email: currentUser.email,
          },
        ],
      },
    }),
    prisma.notification.count({
      where: {
        isRead: true,
        OR: [
          {
            userId: currentUser.id,
          },
          {
            email: currentUser.email,
          },
        ],
      },
    }),
  ]);

  const returnTo = `/notifications${filter === "all" ? "" : `?filter=${filter}`}`;

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative container-page py-8 md:py-10 lg:py-14">
          <Link
            href={getBackHref(currentUser.role)}
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>

          <Badge variant="primary" className="mt-8">
            <Bell size={14} />
            Notifications
          </Badge>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <h1 className="heading-lg max-w-4xl text-balance">
                Your SkillDrop notifications.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Booking updates, payments, reviews, refunds, disputes and call
                reminders appear here.
              </p>
            </div>

            {unreadCount > 0 ? (
              <form action={markAllNotificationsReadAction}>
                <input type="hidden" name="returnTo" value={returnTo} />

                <button type="submit" className="btn btn-secondary">
                  Mark all as read
                </button>
              </form>
            ) : null}
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <MiniStat label="Total" value={String(totalCount)} />
            <MiniStat label="Unread" value={String(unreadCount)} />
            <MiniStat label="Read" value={String(readCount)} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <FilterLink current={filter} value="all" label="All" />
            <FilterLink
              current={filter}
              value="unread"
              label={`Unread · ${unreadCount}`}
            />
            <FilterLink
              current={filter}
              value="read"
              label={`Read · ${readCount}`}
            />
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm font-black text-muted">
            Showing {notifications.length} notification
            {notifications.length === 1 ? "" : "s"}
          </p>

          <Badge>Filter: {filter}</Badge>
        </div>

        <div className="grid gap-4">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                role={currentUser.role}
                returnTo={returnTo}
              />
            ))
          ) : (
            <Card className="p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                <Bell size={24} />
              </div>

              <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
                No notifications found
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-muted">
                Important updates about bookings, calls and reviews will appear
                here.
              </p>

              {filter !== "all" ? (
                <div className="mt-5">
                  <Link href="/notifications" className="btn btn-secondary">
                    View all notifications
                  </Link>
                </div>
              ) : null}
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}

function NotificationCard({
  notification,
  role,
  returnTo,
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
  returnTo: string;
}) {
  const Icon = getNotificationIcon(notification.type);
  const smartLinks = getSmartLinks(notification.metadata, notification.type, role);

  return (
    <Card
      className={
        notification.isRead
          ? "p-5 md:p-6"
          : "border-[var(--primary)]/20 bg-[var(--primary-soft)] p-5 md:p-6"
      }
    >
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-[var(--primary-dark)]">
            <Icon size={22} />
          </div>

          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={notification.isRead ? "accent" : "primary"}>
                {notification.isRead ? "Read" : "Unread"}
              </Badge>

              <Badge>{formatNotificationType(notification.type)}</Badge>

              <Badge>{formatDateTime(notification.createdAt)}</Badge>
            </div>

            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
              {notification.subject}
            </h2>

            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-muted">
              {notification.message}
            </p>

            {smartLinks.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {smartLinks.map((link) => (
                  <Link
                    key={`${link.href}-${link.label}`}
                    href={link.href}
                    className={link.primary ? "btn btn-primary" : "btn btn-secondary"}
                  >
                    {link.label}
                    {link.primary ? <Eye size={17} /> : null}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 md:min-w-[150px]">
          {!notification.isRead ? (
            <form action={markNotificationReadAction}>
              <input
                type="hidden"
                name="notificationId"
                value={notification.id}
              />
              <input type="hidden" name="returnTo" value={returnTo} />

              <button type="submit" className="btn btn-secondary w-full">
                Mark read
              </button>
            </form>
          ) : (
            <form action={markNotificationUnreadAction}>
              <input
                type="hidden"
                name="notificationId"
                value={notification.id}
              />
              <input type="hidden" name="returnTo" value={returnTo} />

              <button type="submit" className="btn btn-secondary w-full">
                Mark unread
              </button>
            </form>
          )}
        </div>
      </div>
    </Card>
  );
}

function FilterLink({
  current,
  value,
  label,
}: {
  current: string;
  value: "all" | "unread" | "read";
  label: string;
}) {
  const isActive = current === value;
  const href = value === "all" ? "/notifications" : `/notifications?filter=${value}`;

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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card soft className="p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{value}</p>
    </Card>
  );
}

function getSmartLinks(metadata: unknown, type: string, role: string) {
  if (!metadata || typeof metadata !== "object") {
    return [];
  }

  const data = metadata as {
    bookingId?: string;
    expertId?: string;
    reviewId?: string;
  };

  const links: {
    label: string;
    href: string;
    primary?: boolean;
  }[] = [];

  if (type === "REVIEW_REQUESTED" && data.bookingId) {
    links.push({
      label: "Leave review",
      href: `/buyer/reviews?bookingId=${data.bookingId}`,
      primary: true,
    });
  }

  if (type === "REVIEW_RECEIVED") {
    if (role === "EXPERT") {
      links.push({
        label: "View statistics",
        href: "/expert/stats",
        primary: true,
      });
    }

    if (data.expertId) {
      links.push({
        label: "View public profile",
        href: `/experts/${data.expertId}`,
      });
    }
  }

  if (type === "PAYMENT_CONFIRMED" && data.bookingId) {
    links.push({
      label: "Open booking",
      href: getBookingsHref(role),
      primary: true,
    });

    links.push({
      label: "Open call",
      href: `/calls/${data.bookingId}`,
    });
  }

  if (
    (type === "BOOKING_CREATED" ||
      type === "BOOKING_CANCELLED" ||
      type === "BOOKING_REFUNDED" ||
      type === "BOOKING_DISPUTED" ||
      type === "CALL_COMPLETED") &&
    data.bookingId
  ) {
    links.push({
      label: "View bookings",
      href: getBookingsHref(role),
      primary: true,
    });
  }

  if (type === "CALL_COMPLETED" && role === "BUYER" && data.bookingId) {
    links.push({
      label: "Leave review",
      href: `/buyer/reviews?bookingId=${data.bookingId}`,
    });
  }

  if (data.expertId && !links.some((link) => link.href === `/experts/${data.expertId}`)) {
    links.push({
      label: "View expert",
      href: `/experts/${data.expertId}`,
    });
  }

  return links;
}

function getNotificationIcon(type: string) {
  if (type === "PAYMENT_CONFIRMED" || type === "BOOKING_REFUNDED") {
    return CircleDollarSign;
  }

  if (type === "BOOKING_CREATED" || type === "BOOKING_CANCELLED") {
    return CalendarDays;
  }

  if (type === "CALL_COMPLETED") {
    return Video;
  }

  if (type === "REVIEW_REQUESTED" || type === "REVIEW_RECEIVED") {
    return Star;
  }

  if (type === "BOOKING_DISPUTED") {
    return ShieldAlert;
  }

  return MessageCircle;
}

function formatNotificationType(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeFilter(filter?: string) {
  if (filter === "unread" || filter === "read") {
    return filter;
  }

  return "all";
}

function getBackHref(role: string) {
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

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}