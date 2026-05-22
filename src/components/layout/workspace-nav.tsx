"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type WorkspaceNavProps = {
  role: string | null;
};

type NavItem = {
  href: string;
  label: string;
};

const expertLinks: NavItem[] = [
  { href: "/expert", label: "Overview" },
  { href: "/expert/bookings", label: "Bookings" },
  { href: "/expert/availability", label: "Availability" },
  { href: "/expert/earnings", label: "Earnings" },
  { href: "/expert/settings", label: "Settings" },
];

const buyerLinks: NavItem[] = [
  { href: "/buyer", label: "Overview" },
  { href: "/buyer/bookings", label: "Bookings" },
  { href: "/buyer/settings", label: "Settings" },
];

const adminLinks: NavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/experts", label: "Experts" },
  { href: "/admin/metrics", label: "Metrics" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/health", label: "Health" },
];

export function WorkspaceNav({ role }: WorkspaceNavProps) {
  const pathname = usePathname();

  let title = "";
  let links: NavItem[] = [];

  if (pathname.startsWith("/admin") && role === "ADMIN") {
    title = "Admin workspace";
    links = adminLinks;
  } else if (
    pathname.startsWith("/expert") &&
    (role === "EXPERT" || role === "ADMIN")
  ) {
    title = "Expert workspace";
    links = expertLinks;
  } else if (pathname.startsWith("/buyer") && role) {
    title = "Buyer workspace";
    links = buyerLinks;
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-[var(--border)] bg-white/80 backdrop-blur-sm theme-dark:bg-[#0f1117]/80">
      <div className="container-page flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">
          {title}
        </p>

        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
          {links.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${
                  isActive
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "border border-[var(--border)] bg-white/80 text-muted hover:bg-[var(--card-soft)] hover:text-[var(--foreground)] theme-dark:bg-white/[0.04]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}