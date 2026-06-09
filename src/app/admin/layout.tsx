import Link from "next/link";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Home,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { getUnreadNotificationCount } from "@/server/services/notification-count.service";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireRole(["admin"]);

  const email = user.email?.toLowerCase();

  const currentUser = email
    ? await prisma.user.findUnique({
        where: {
          email,
        },
      })
    : null;

  const unreadNotifications = currentUser
    ? await getUnreadNotificationCount({
        userId: currentUser.id,
        email: currentUser.email,
      })
    : 0;

  return (
    <div>
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
        <div className="container-page flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="primary">
              <ShieldCheck size={14} />
              Admin panel
            </Badge>

            <p className="mt-2 text-sm font-bold text-muted">
              Manage SkillDrop marketplace operations.
            </p>
          </div>

          <nav className="flex flex-wrap gap-2">
            <AdminNavLink href="/admin" label="Dashboard" icon={Home} />
            <AdminNavLink href="/admin/users" label="Users" icon={UsersRound} />
            <AdminNavLink href="/admin/experts" label="Experts" icon={UserRound} />

            <AdminNavLink
              href="/admin/bookings"
              label="Bookings"
              icon={CalendarDays}
            />

            <AdminNavLink
              href="/admin/reviews"
              label="Reviews"
              icon={MessageCircle}
            />

            <AdminNavLink
              href="/admin/analytics"
              label="Analytics"
              icon={BarChart3}
            />

            <AdminNavLink
              href="/admin/risk"
              label="Risk"
              icon={ShieldAlert}
            />

            <AdminNavLink
              href="/notifications"
              label="Notifications"
              icon={Bell}
              badge={unreadNotifications}
            />
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}

function AdminNavLink({
  href,
  label,
  icon: Icon,
  badge = 0,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/64 px-4 py-2 text-sm font-black text-[var(--muted-foreground)] transition hover:-translate-y-0.5 hover:bg-white hover:text-[var(--primary-dark)] hover:shadow-[var(--shadow-sm)]"
    >
      <Icon size={15} />
      {label}

      {badge > 0 ? (
        <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-black text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}