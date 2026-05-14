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

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { getUnreadNotificationCount } from "@/server/services/notification-count.service";

const expertLinks = [
  {
    label: "Profile",
    href: "/expert/profile",
    icon: UserRound,
  },
  {
    label: "Offers",
    href: "/expert/services",
    icon: WalletCards,
  },
  {
    label: "Availability",
    href: "/expert/availability",
    icon: CalendarDays,
  },
  {
    label: "Bookings",
    href: "/expert/bookings",
    icon: Video,
  },
  {
    label: "Earnings",
    href: "/expert/earnings",
    icon: CircleDollarSign,
  },
  {
    label: "Statistics",
    href: "/expert/stats",
    icon: BarChart3,
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    badge: "notifications",
  },
  {
    label: "Settings",
    href: "/expert/settings",
    icon: Settings,
  },
];

const activeBookingStatuses: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.PAID,
  BookingStatus.CONFIRMED,
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
      booking.status !== BookingStatus.CANCELLED &&
      booking.status !== BookingStatus.REFUNDED &&
      booking.status !== BookingStatus.COMPLETED &&
      booking.status !== BookingStatus.DISPUTED &&
      booking.status !== BookingStatus.EXPIRED,
  );

  const completedBookings = expert.bookings.filter(
    (booking) => booking.status === BookingStatus.COMPLETED,
  );

  const needsCompletionBookings = expert.bookings.filter(
    (booking) =>
      booking.endTime < now && booking.status === BookingStatus.CONFIRMED,
  );

  const profileScore = calculateExpertProfileScore({
    hasHeadline: Boolean(expert.headline),
    hasBio: expert.bio.length >= 120,
    hasSkills: expert.skills.length >= 3,
    hasLanguages: expert.languages.length > 0,
    hasServices: activeServices.length > 0,
    hasAvailability: openWindows.length > 0,
    isVerified: expert.isVerified,
  });

  const initials = getInitials(expert.user.name ?? expert.user.email);

  return (
    <div className="min-h-[calc(100vh-76px)] p-4 md:p-6">
      <div className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="xl:sticky xl:top-[92px] xl:self-start">
          <div className="max-h-none overflow-visible rounded-[32px] border border-[var(--border)] bg-white/72 p-4 shadow-[var(--shadow-sm)] backdrop-blur-xl xl:max-h-[calc(100vh-116px)] xl:overflow-y-auto">
            <div className="rounded-[28px] bg-gradient-to-br from-[#2f2a68] to-[#111827] p-4 text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/14 text-lg font-black">
                {initials}
              </div>

              <h2 className="mt-4 truncate text-lg font-black tracking-[-0.04em]">
                {expert.user.name ?? "Provider"}
              </h2>

              <p className="mt-1 truncate text-xs font-bold text-white/70">
                {expert.user.email}
              </p>

              <div className="mt-4 grid gap-2">
                <div className="rounded-2xl bg-white/12 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/48">
                    Workspace
                  </p>

                  <p className="mt-1 text-sm font-black">Provider</p>
                </div>

                <div className="rounded-2xl bg-white/12 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/48">
                      Profile
                    </p>

                    <p className="text-xs font-black text-white">
                      {profileScore}%
                    </p>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/14">
                    <div
                      className="h-full rounded-full bg-white"
                      style={{ width: `${profileScore}%` }}
                    />
                  </div>
                </div>

                {needsCompletionBookings.length > 0 ? (
                  <Link
                    href="/expert/bookings"
                    className="rounded-2xl bg-white/12 p-3 transition hover:bg-white/18"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/48">
                        Needs action
                      </p>

                      <p className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-[#111827]">
                        {needsCompletionBookings.length}
                      </p>
                    </div>

                    <p className="mt-1 text-sm font-black">
                      Complete finished calls
                    </p>
                  </Link>
                ) : null}

                {unreadNotifications > 0 ? (
                  <Link
                    href="/notifications?filter=unread"
                    className="rounded-2xl bg-white/12 p-3 transition hover:bg-white/18"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/48">
                        Unread
                      </p>

                      <p className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-[#111827]">
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
              {expertLinks.map((link) => {
                const Icon = link.icon;
                const badgeValue =
                  link.badge === "notifications" ? unreadNotifications : 0;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-sm font-black text-[var(--foreground)] transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary-dark)]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon size={17} className="shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </span>

                    <span className="flex shrink-0 items-center gap-2">
                      {badgeValue > 0 ? (
                        <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-black text-white">
                          {badgeValue}
                        </span>
                      ) : null}

                      <span className="text-muted transition group-hover:translate-x-1 group-hover:text-[var(--primary-dark)]">
                        ›
                      </span>
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 grid gap-2">
              <SidebarStat label="Offers" value={String(activeServices.length)} />

              <SidebarStat
                label="Open windows"
                value={String(openWindows.length)}
              />

              <SidebarStat
                label="Upcoming"
                value={String(upcomingBookings.length)}
              />

              <SidebarStat
                label="Needs action"
                value={String(needsCompletionBookings.length)}
              />

              <SidebarStat
                label="Completed"
                value={String(completedBookings.length)}
              />

              <SidebarStat label="Unread" value={String(unreadNotifications)} />
            </div>

            <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-white/62 p-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--primary-dark)]" />

                <p className="text-sm font-black">Quick tip</p>
              </div>

              <p className="mt-2 text-xs font-semibold leading-5 text-muted">
                Keep your offers clear, complete finished calls, and add fresh
                availability windows every week.
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 overflow-hidden rounded-[32px] border border-[var(--border)] bg-white/38 shadow-[var(--shadow-sm)] backdrop-blur-xl">
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/62 px-4 py-2.5">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="text-xs font-black">{value}</p>
    </div>
  );
}

function getInitials(value: string) {
  const parts = value
    .replace("@", " ")
    .split(" ")
    .filter(Boolean);

  const first = parts[0]?.charAt(0) ?? "P";
  const second = parts[1]?.charAt(0) ?? "";

  return `${first}${second}`.toUpperCase();
}

function calculateExpertProfileScore({
  hasHeadline,
  hasBio,
  hasSkills,
  hasLanguages,
  hasServices,
  hasAvailability,
  isVerified,
}: {
  hasHeadline: boolean;
  hasBio: boolean;
  hasSkills: boolean;
  hasLanguages: boolean;
  hasServices: boolean;
  hasAvailability: boolean;
  isVerified: boolean;
}) {
  const checks = [
    hasHeadline,
    hasBio,
    hasSkills,
    hasLanguages,
    hasServices,
    hasAvailability,
    isVerified,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
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