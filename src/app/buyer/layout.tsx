import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import {
  Bell,
  Bookmark,
  CalendarDays,
  CreditCard,
  Search,
  Settings,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { getUnreadNotificationCount } from "@/server/services/notification-count.service";

const buyerLinks = [
  {
    label: "Profile",
    href: "/buyer/profile",
    icon: UserRound,
  },
  {
    label: "Find helpers",
    href: "/experts",
    icon: Search,
  },
  {
    label: "Bookings",
    href: "/buyer/bookings",
    icon: CalendarDays,
  },
  {
    label: "Saved helpers",
    href: "/buyer/saved",
    icon: Bookmark,
  },
  {
    label: "Reviews",
    href: "/buyer/reviews",
    icon: Star,
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    badge: "notifications",
  },
  {
    label: "Settings",
    href: "/buyer/settings",
    icon: Settings,
  },
];

const upcomingBookingStatuses: BookingStatus[] = [
  BookingStatus.PAID,
  BookingStatus.CONFIRMED,
];

export default async function BuyerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireRole(["buyer", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const buyer = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      bookings: {
        orderBy: {
          startTime: "asc",
        },
        take: 20,
      },
      savedExperts: {
        take: 20,
      },
      reviews: {
        take: 20,
      },
      buyerSettings: true,
    },
  });

  if (!buyer) {
    redirect("/sign-in");
  }

  const unreadNotifications = await getUnreadNotificationCount({
    userId: buyer.id,
    email: buyer.email,
  });

  const now = new Date();

  const upcomingBookings = buyer.bookings.filter(
    (booking) =>
      booking.startTime >= now &&
      upcomingBookingStatuses.includes(booking.status),
  );

  const pendingBookings = buyer.bookings.filter(
    (booking) =>
      booking.startTime >= now && booking.status === BookingStatus.PENDING,
  );

  const completedBookings = buyer.bookings.filter(
    (booking) => booking.status === BookingStatus.COMPLETED,
  );

  const displayName = buyer.name ?? "Client";
  const initials = getInitials(buyer.name ?? buyer.email);

  return (
    <div className="min-h-[calc(100vh-76px)] p-4 md:p-6">
      <div className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="xl:sticky xl:top-[92px] xl:self-start">
          <div className="max-h-none overflow-visible rounded-[32px] border border-[var(--border)] bg-[var(--card)]/90 p-4 shadow-[var(--shadow-sm)] backdrop-blur-xl xl:max-h-[calc(100vh-116px)] xl:overflow-y-auto">
            <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-[#312e81] via-[#1e1b4b] to-[#0f172a] p-4 text-white shadow-[var(--shadow-sm)]">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/14 text-lg font-black ring-1 ring-white/12">
                  {buyer.avatarUrl ? (
                    <Image
                      src={buyer.avatarUrl}
                      alt={displayName}
                      fill
                      sizes="48px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    initials
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-base font-black tracking-[-0.04em]">
                    {displayName}
                  </h2>

                  <p className="mt-1 truncate text-xs font-bold text-white/70">
                    {buyer.email}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <div className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
                    Workspace
                  </p>

                  <p className="mt-1 text-sm font-black">Buyer</p>
                </div>

                {pendingBookings.length > 0 ? (
                  <Link
                    href="/buyer/bookings"
                    className="rounded-2xl bg-amber-300/16 p-3 text-white ring-1 ring-amber-200/20 transition hover:bg-amber-300/22"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-100/80">
                        To pay
                      </p>

                      <p className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-950">
                        {pendingBookings.length}
                      </p>
                    </div>

                    <p className="mt-1 text-sm font-black">
                      Finish pending bookings
                    </p>
                  </Link>
                ) : null}

                {unreadNotifications > 0 ? (
                  <Link
                    href="/notifications?filter=unread"
                    className="rounded-2xl bg-violet-300/16 p-3 text-white ring-1 ring-violet-200/20 transition hover:bg-violet-300/22"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-100/80">
                        Unread
                      </p>

                      <p className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-black text-violet-950">
                        {unreadNotifications}
                      </p>
                    </div>

                    <p className="mt-1 text-sm font-black">
                      Notifications waiting
                    </p>
                  </Link>
                ) : null}
              </div>
            </div>

            <nav className="mt-4 grid gap-1.5">
              {buyerLinks.map((link) => {
                const Icon = link.icon;
                const badgeValue =
                  link.badge === "notifications" ? unreadNotifications : 0;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-sm font-black text-[var(--muted-foreground)] transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary-dark)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(139,92,246,0.25)]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-dark)] transition group-hover:bg-[var(--primary)] group-hover:text-white">
                        <Icon size={16} />
                      </span>

                      <span className="truncate">{link.label}</span>
                    </span>

                    <span className="flex shrink-0 items-center gap-2">
                      {badgeValue > 0 ? (
                        <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-black text-white">
                          {badgeValue}
                        </span>
                      ) : null}

                      <span className="text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--primary-dark)]">
                        ›
                      </span>
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 grid gap-2">
              <SidebarStat
                label="Upcoming"
                value={String(upcomingBookings.length)}
              />

              <SidebarStat
                label="To pay"
                value={String(pendingBookings.length)}
              />

              <SidebarStat
                label="Saved"
                value={String(buyer.savedExperts.length)}
              />

              <SidebarStat
                label="Completed"
                value={String(completedBookings.length)}
              />

              <SidebarStat
                label="Unread"
                value={String(unreadNotifications)}
              />
            </div>

            <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--primary-dark)]" />

                <p className="text-sm font-black text-[var(--foreground)]">
                  Quick tip
                </p>
              </div>

              <p className="mt-2 text-xs font-semibold leading-5 text-[var(--muted-foreground)]">
                Save useful helpers and come back later when you are ready to
                book.
              </p>
            </div>

            <Link
              href="/experts"
              className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3 text-sm font-black text-[var(--foreground)] transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary-dark)]"
            >
              <Search size={16} />
              Find helpers
            </Link>

            {pendingBookings.length > 0 ? (
              <Link
                href="/buyer/bookings"
                className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-black text-white transition hover:opacity-90"
              >
                <CreditCard size={16} />
                Pay pending booking
              </Link>
            ) : null}
          </div>
        </aside>

        <div className="min-w-0 overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--card)]/92 shadow-[var(--shadow-sm)] backdrop-blur-xl">
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2.5">
      <p className="text-xs font-bold text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="text-xs font-black text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function getInitials(value: string) {
  const parts = value
    .replace("@", " ")
    .split(" ")
    .filter(Boolean);

  const first = parts[0]?.charAt(0) ?? "C";
  const second = parts[1]?.charAt(0) ?? "";

  return `${first}${second}`.toUpperCase();
}