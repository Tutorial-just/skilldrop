"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  Settings,
  UserRound,
  Video,
  WalletCards,
} from "lucide-react";

const expertNavItems = [
  {
    label: "Dashboard",
    href: "/expert",
    icon: LayoutDashboard,
  },
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
    label: "Statistics",
    href: "/expert/stats",
    icon: BarChart3,
  },
  {
    label: "Settings",
    href: "/expert/settings",
    icon: Settings,
  },
];

export function ExpertShell({
  children,
  name,
  email,
}: {
  children: ReactNode;
  name: string;
  email: string;
}) {
  const pathname = usePathname();

  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_8%_0%,rgba(79,70,229,0.08),transparent_26%),radial-gradient(circle_at_92%_12%,rgba(245,158,11,0.08),transparent_30%)]" />

      <div className="container-page py-6 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-[96px] rounded-[30px] border border-[var(--border)] bg-white/72 p-4 shadow-[var(--shadow-sm)] backdrop-blur-xl">
              <div className="rounded-[24px] bg-gradient-to-br from-[#31265f] via-[#2b275f] to-[#1f2937] p-5 text-white">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 text-lg font-black">
                  {name.charAt(0).toUpperCase()}
                </div>

                <p className="mt-4 text-lg font-black tracking-[-0.03em]">
                  {name}
                </p>

                <p className="mt-1 line-clamp-1 text-xs font-semibold text-white/58">
                  {email}
                </p>

                <div className="mt-5 rounded-2xl bg-white/10 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">
                    Workspace
                  </p>
                  <p className="mt-1 text-sm font-black">Provider</p>
                </div>
              </div>

              <nav className="mt-4 grid gap-1">
                {expertNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/expert"
                      ? pathname === "/expert"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={
                        isActive
                          ? "group flex items-center justify-between rounded-2xl bg-[var(--primary-soft)] px-4 py-3 text-sm font-black text-[var(--primary-dark)]"
                          : "group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-black text-[var(--muted-foreground)] transition hover:bg-white hover:text-[var(--foreground)]"
                      }
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={18} />
                        {item.label}
                      </span>

                      <ChevronRight
                        size={16}
                        className={
                          isActive
                            ? "opacity-100"
                            : "opacity-0 transition group-hover:opacity-100"
                        }
                      />
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
                <p className="text-sm font-black">Quick tip</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-muted">
                  Keep your services clear, add weekly availability, and ask for
                  reviews after completed calls.
                </p>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-5 lg:hidden">
              <div className="rounded-[26px] border border-[var(--border)] bg-white/76 p-3 shadow-[var(--shadow-sm)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4 px-2 pb-3">
                  <div>
                    <p className="text-sm font-black">{name}</p>
                    <p className="line-clamp-1 text-xs font-semibold text-muted">
                      Provider workspace
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-sm font-black text-white">
                    {name.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {expertNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/expert"
                        ? pathname === "/expert"
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={
                          isActive
                            ? "flex shrink-0 items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-black text-white"
                            : "flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-white/72 px-4 py-2 text-xs font-black text-[var(--muted-foreground)]"
                        }
                      >
                        <Icon size={14} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[34px] border border-[var(--border)] bg-white/38 shadow-[var(--shadow-sm)] backdrop-blur-xl">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}