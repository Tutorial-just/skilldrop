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
    title = "Helper workspace";
    links = expertLinks;
  } else if (pathname.startsWith("/buyer") && role) {
    title = "Buyer workspace";
    links = buyerLinks;
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-[var(--border)] bg-[var(--background-soft)]/88 backdrop-blur-xl">
      <div className="container-page flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
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
                className={[
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold",
                  "transition duration-200 ease-out",
                  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(139,92,246,0.28)]",
                  isActive
                    ? [
                        "border-[rgba(167,139,250,0.55)]",
                        "bg-[var(--primary)]",
                        "text-white",
                        "shadow-[0_12px_28px_rgba(139,92,246,0.26)]",
                      ].join(" ")
                    : [
                        "border-[var(--border)]",
                        "bg-[var(--card)]/72",
                        "text-[var(--muted-foreground)]",
                        "hover:border-[var(--border-strong)]",
                        "hover:bg-[var(--primary-soft)]",
                        "hover:text-[var(--primary-dark)]",
                        "active:bg-[var(--primary-soft)]",
                      ].join(" "),
                ].join(" ")}
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