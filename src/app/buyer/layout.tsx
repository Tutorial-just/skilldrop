import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bookmark,
  CalendarDays,
  Search,
  Settings,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

const buyerLinks = [
  {
    label: "Profile",
    href: "/buyer/profile",
    icon: UserRound,
  },
  {
    label: "Find experts",
    href: "/experts",
    icon: Search,
  },
  {
    label: "Bookings",
    href: "/buyer/bookings",
    icon: CalendarDays,
  },
  {
    label: "Saved experts",
    href: "/buyer/saved",
    icon: Bookmark,
  },
  {
    label: "Reviews",
    href: "/buyer/reviews",
    icon: Star,
  },
  {
    label: "Settings",
    href: "/buyer/settings",
    icon: Settings,
  },
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

  const now = new Date();

  const upcomingBookings = buyer.bookings.filter(
    (booking) =>
      booking.startTime >= now &&
      booking.status !== "CANCELLED" &&
      booking.status !== "REFUNDED" &&
      booking.status !== "COMPLETED",
  );

  const completedBookings = buyer.bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const initials = getInitials(buyer.name ?? buyer.email);

  const profileScore = calculateProfileScore({
    hasName: Boolean(buyer.name),
    hasTimezone: Boolean(buyer.buyerSettings?.preferredTimezone),
    hasLanguages: Boolean(buyer.buyerSettings?.preferredLanguages.length),
    hasInterests: Boolean(buyer.buyerSettings?.interests.length),
    hasSavedExperts: buyer.savedExperts.length > 0,
  });

  return (
    <div className="min-h-[calc(100vh-76px)] p-4 md:p-6">
      <div className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="xl:sticky xl:top-[92px] xl:self-start">
          <div className="max-h-none overflow-visible rounded-[32px] border border-[var(--border)] bg-white/72 p-4 shadow-[var(--shadow-sm)] backdrop-blur-xl xl:max-h-[calc(100vh-116px)] xl:overflow-y-auto">
            <div className="rounded-[28px] bg-gradient-to-br from-[var(--primary)] to-[#312e81] p-4 text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/14 text-lg font-black">
                {initials}
              </div>

              <h2 className="mt-4 truncate text-lg font-black tracking-[-0.04em]">
                {buyer.name ?? "Client"}
              </h2>

              <p className="mt-1 truncate text-xs font-bold text-white/70">
                {buyer.email}
              </p>

              <div className="mt-4 grid gap-2">
                <div className="rounded-2xl bg-white/12 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/48">
                    Workspace
                  </p>

                  <p className="mt-1 text-sm font-black">Client</p>
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
              </div>
            </div>

            <nav className="mt-4 grid gap-1.5">
              {buyerLinks.map((link) => {
                const Icon = link.icon;

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

                    <span className="text-muted transition group-hover:translate-x-1 group-hover:text-[var(--primary-dark)]">
                      ›
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
                label="Saved"
                value={String(buyer.savedExperts.length)}
              />

              <SidebarStat
                label="Completed"
                value={String(completedBookings.length)}
              />
            </div>

            <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-white/62 p-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--primary-dark)]" />

                <p className="text-sm font-black">Quick tip</p>
              </div>

              <p className="mt-2 text-xs font-semibold leading-5 text-muted">
                Save useful experts and come back later when you are ready to
                book.
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

  const first = parts[0]?.charAt(0) ?? "C";
  const second = parts[1]?.charAt(0) ?? "";

  return `${first}${second}`.toUpperCase();
}

function calculateProfileScore({
  hasName,
  hasTimezone,
  hasLanguages,
  hasInterests,
  hasSavedExperts,
}: {
  hasName: boolean;
  hasTimezone: boolean;
  hasLanguages: boolean;
  hasInterests: boolean;
  hasSavedExperts: boolean;
}) {
  const checks = [
    hasName,
    hasTimezone,
    hasLanguages,
    hasInterests,
    hasSavedExperts,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}