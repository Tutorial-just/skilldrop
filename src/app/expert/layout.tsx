import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import {
  BarChart3,
  Bell,
  CalendarDays,
  CircleDollarSign,
  Settings,
  Sparkles,
  UserRound,
  Video,
  WalletCards,
} from "lucide-react";
import Image from "next/image";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { getUnreadNotificationCount } from "@/server/services/notification-count.service";

const expertLinks = [
  { label: "Profile", href: "/expert/profile", icon: UserRound },
  { label: "Offers", href: "/expert/services", icon: WalletCards },
  { label: "Availability", href: "/expert/availability", icon: CalendarDays },
  { label: "Bookings", href: "/expert/bookings", icon: Video },
  { label: "Earnings", href: "/expert/earnings", icon: CircleDollarSign },
  { label: "Statistics", href: "/expert/stats", icon: BarChart3 },
  { label: "Notifications", href: "/notifications", icon: Bell, badge: "notifications" },
  { label: "Settings", href: "/expert/settings", icon: Settings },
];

const activeBookingStatuses: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.PAID,
  BookingStatus.CONFIRMED,
];

const inactiveBookingStatuses: BookingStatus[] = [
  BookingStatus.CANCELLED,
  BookingStatus.REFUNDED,
  BookingStatus.COMPLETED,
  BookingStatus.DISPUTED,
];

export default async function ExpertLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireRole(["expert", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const now = new Date();

  const expert = await prisma.expertProfile.findFirst({
    where: {
      user: {
        email,
      },
    },
    include: {
      user: true,
      services: {
        take: 20,
      },
      availability: {
        where: {
          isActive: true,
          endTime: {
            gte: now,
          },
        },
        include: {
          bookings: {
            where: {
              status: {
                in: activeBookingStatuses,
              },
            },
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true,
            },
            orderBy: {
              startTime: "asc",
            },
          },
        },
        take: 30,
        orderBy: {
          startTime: "asc",
        },
      },
      bookings: {
        take: 30,
        orderBy: {
          startTime: "asc",
        },
      },
      reviews: {
        take: 20,
      },
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  const unreadNotifications = await getUnreadNotificationCount({
    userId: expert.user.id,
    email: expert.user.email,
  });

  const activeServices = expert.services.filter((service) => service.isActive);

  const openWindows = expert.availability.filter(
    (window) =>
      window.isActive &&
      window.endTime >= now &&
      getWindowFreeMinutes(window) > 0,
  );

  const upcomingBookings = expert.bookings.filter(
    (booking) =>
      booking.startTime >= now &&
      !inactiveBookingStatuses.includes(booking.status),
  );

  const completedBookings = expert.bookings.filter(
    (booking) => booking.status === BookingStatus.COMPLETED,
  );

  const needsCompletionBookings = expert.bookings.filter(
    (booking) =>
      booking.endTime < now && booking.status === BookingStatus.CONFIRMED,
  );

  

  const displayName = expert.user.name || "Helper";
  const displayEmail = expert.user.email || email;
  const initials = getInitials(displayName || displayEmail);

  return (
    <div className="min-h-[calc(100vh-76px)] px-4 py-5 md:px-6 md:py-7">
      <div className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="xl:sticky xl:top-[92px] xl:self-start">
          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--card)]/90 p-3 shadow-[var(--shadow-sm)] backdrop-blur-xl xl:max-h-[calc(100vh-116px)] xl:overflow-y-auto">
            <div className="rounded-[26px] border border-white/10 bg-gradient-to-br from-[#312e81] via-[#1e1b4b] to-[#0f172a] p-4 text-white shadow-[var(--shadow-sm)]">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/14 text-base font-bold ring-1 ring-white/12">
                  {expert.user.avatarUrl ? (
                    <Image
                      src={expert.user.avatarUrl}
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
                  <h2 className="truncate text-base font-bold tracking-[-0.03em]">
                    {displayName}
                  </h2>

                  <p className="mt-1 truncate text-xs font-medium text-white/70">
                    {displayEmail}
                  </p>
                </div>
              </div>

            
              {needsCompletionBookings.length > 0 ? (
                <Link
                  href="/expert/bookings"
                  className="mt-3 block rounded-2xl bg-amber-300/16 p-3 text-white ring-1 ring-amber-200/20 transition hover:bg-amber-300/22"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100/80">
                      Needs action
                    </p>

                    <p className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-950">
                      {needsCompletionBookings.length}
                    </p>
                  </div>

                  <p className="mt-1 text-sm font-bold">
                    Complete finished calls
                  </p>
                </Link>
              ) : null}

              {unreadNotifications > 0 ? (
                <Link
                  href="/notifications?filter=unread"
                  className="mt-3 block rounded-2xl bg-violet-300/16 p-3 text-white ring-1 ring-violet-200/20 transition hover:bg-violet-300/22"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-violet-100/80">
                      Unread
                    </p>

                    <p className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-950">
                      {unreadNotifications}
                    </p>
                  </div>

                  <p className="mt-1 text-sm font-bold">
                    Notifications waiting
                  </p>
                </Link>
              ) : null}
            </div>

            <nav className="mt-4 grid gap-1">
              {expertLinks.map((link) => {
                const Icon = link.icon;
                const badgeValue =
                  link.badge === "notifications" ? unreadNotifications : 0;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={[
                      "group flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5",
                      "text-sm font-semibold text-[var(--muted-foreground)]",
                      "transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary-dark)]",
                      "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(139,92,246,0.25)]",
                    ].join(" ")}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-dark)] transition group-hover:bg-[var(--primary)] group-hover:text-white">
                        <Icon size={16} />
                      </span>

                      <span className="truncate">{link.label}</span>
                    </span>

                    <span className="flex shrink-0 items-center gap-2">
                      {badgeValue > 0 ? (
                        <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-bold text-white">
                          {badgeValue}
                        </span>
                      ) : null}

                      <span className="text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--primary-dark)]">
                        ›
                      </span>
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 grid gap-2">
              <SidebarStat label="Offers" value={String(activeServices.length)} />
              <SidebarStat label="Open windows" value={String(openWindows.length)} />
              <SidebarStat label="Upcoming" value={String(upcomingBookings.length)} />
              <SidebarStat label="Needs action" value={String(needsCompletionBookings.length)} />
              <SidebarStat label="Completed" value={String(completedBookings.length)} />
              <SidebarStat label="Unread" value={String(unreadNotifications)} />
            </div>

            <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--primary-dark)]" />
                <p className="text-sm font-bold text-[var(--foreground)]">
                  Quick tip
                </p>
              </div>

              <p className="mt-2 text-xs font-medium leading-5 text-[var(--muted-foreground)]">
                Keep your offers clear, complete finished calls, and add fresh
                availability windows every week.
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--card)]/92 shadow-[var(--shadow-sm)] backdrop-blur-xl">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2.5">
      <p className="text-xs font-medium text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="text-xs font-bold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function getInitials(value: string) {
  const parts = value
    .replace("@", " ")
    .split(" ")
    .filter(Boolean);

  const first = parts[0]?.charAt(0) ?? "H";
  const second = parts[1]?.charAt(0) ?? "";

  return `${first}${second}`.toUpperCase();
}



function getWindowFreeMinutes(window: {
  startTime: Date;
  endTime: Date;
  bookings: {
    startTime: Date;
    endTime: Date;
    status: BookingStatus;
  }[];
}) {
  const totalMinutes = getDurationMinutes(window.startTime, window.endTime);

  const bookedMinutes = window.bookings
    .filter((booking) => activeBookingStatuses.includes(booking.status))
    .reduce(
      (sum, booking) =>
        sum + getDurationMinutes(booking.startTime, booking.endTime),
      0,
    );

  return Math.max(totalMinutes - bookedMinutes, 0);
}

function getDurationMinutes(startTime: Date, endTime: Date) {
  return Math.max(
    Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60),
    0,
  );
}