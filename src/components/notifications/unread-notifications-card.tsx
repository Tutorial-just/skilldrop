import Link from "next/link";
import {
  Bell,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Star,
  WalletCards,
  XCircle,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type UnreadNotificationsCardProps = {
  userId: string;
  email: string;
};

export async function UnreadNotificationsCard({
  userId,
  email,
}: UnreadNotificationsCardProps) {
  const notifications = await prisma.notification.findMany({
    where: {
      isRead: false,
      deletedAt: null,
      OR: [
        {
          userId,
        },
        {
          email,
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 4,
  });

  const unreadCount = await prisma.notification.count({
    where: {
      isRead: false,
      deletedAt: null,
      OR: [
        {
          userId,
        },
        {
          email,
        },
      ],
    },
  });

  return (
    <Card
      className={
        unreadCount > 0
          ? "border-[var(--accent)]/25 bg-[var(--accent-soft)] p-5 md:p-6"
          : "p-5 md:p-6"
      }
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <Badge variant={unreadCount > 0 ? "accent" : "primary"}>
            {unreadCount > 0 ? <BellRing size={14} /> : <Bell size={14} />}
            Notifications
          </Badge>

          <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
            {unreadCount > 0
              ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
              : "No unread updates"}
          </h2>

          <p className="mt-2 text-sm font-semibold leading-6 text-muted">
            Booking, payment, review and account updates appear here.
          </p>
        </div>

        <Link href="/notifications" className="btn btn-secondary shrink-0">
          Open inbox
        </Link>
      </div>

      <div className="mt-5 grid gap-3">
        {notifications.length > 0 ? (
          notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);

            return (
              <Link
                key={notification.id}
                href="/notifications"
                className="group rounded-2xl border border-[var(--border)] bg-white/70 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[var(--shadow-sm)]"
              >
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="line-clamp-1 text-sm font-black tracking-[-0.02em]">
                        {notification.subject}
                      </p>

                      <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                        New
                      </span>
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-muted">
                      {notification.message}
                    </p>

                    <p className="mt-2 text-[11px] font-bold text-muted">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-white/55 p-5">
            <p className="font-black">You are all caught up.</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted">
              New updates will appear here when something important happens.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
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

  if (type === "BOOKING_CANCELLED") {
    return XCircle;
  }

  if (type === "CALL_COMPLETED") {
    return CheckCircle2;
  }

  if (type === "REVIEW_REQUESTED" || type === "REVIEW_RECEIVED") {
    return Star;
  }

  return MessageCircle;
}

function formatDateTime(date: Date) {
  const dayPart = new Intl.DateTimeFormat("en", {
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