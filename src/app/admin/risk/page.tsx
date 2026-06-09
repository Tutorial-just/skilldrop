import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, Ban, CalendarX2, ShieldAlert, UserRoundX } from "lucide-react";
import { BookingStatus } from "@prisma/client";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default async function AdminRiskPage() {
  await requireRole(["admin"]);

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [openReports, disputedBookings, cancelledBookings, refundedBookings, riskyExperts, riskyBuyers] = await Promise.all([
    prisma.bookingReport.findMany({
      where: { status: "OPEN" },
      include: {
        reporter: true,
        booking: {
          include: {
            buyer: true,
            expert: { include: { user: true } },
            service: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.booking.count({ where: { status: BookingStatus.DISPUTED } }),
    prisma.booking.count({ where: { status: BookingStatus.CANCELLED, updatedAt: { gte: since } } }),
    prisma.booking.count({ where: { status: BookingStatus.REFUNDED, updatedAt: { gte: since } } }),
    prisma.expertProfile.findMany({
      where: {
        bookings: {
          some: {
            status: { in: [BookingStatus.DISPUTED, BookingStatus.CANCELLED, BookingStatus.REFUNDED] },
            updatedAt: { gte: since },
          },
        },
      },
      include: {
        user: true,
        bookings: {
          where: {
            status: { in: [BookingStatus.DISPUTED, BookingStatus.CANCELLED, BookingStatus.REFUNDED] },
            updatedAt: { gte: since },
          },
          select: { id: true, status: true },
        },
      },
      take: 12,
    }),
    prisma.user.findMany({
      where: {
        role: "BUYER",
        bookings: {
          some: {
            status: { in: [BookingStatus.DISPUTED, BookingStatus.CANCELLED, BookingStatus.REFUNDED] },
            updatedAt: { gte: since },
          },
        },
      },
      include: {
        bookings: {
          where: {
            status: { in: [BookingStatus.DISPUTED, BookingStatus.CANCELLED, BookingStatus.REFUNDED] },
            updatedAt: { gte: since },
          },
          select: { id: true, status: true },
        },
      },
      take: 12,
    }),
  ]);

  return (
    <main className="container-page py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="danger">
            <ShieldAlert size={14} />
            Risk center
          </Badge>
          <h1 className="heading-lg mt-4">Marketplace risk panel</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-[var(--muted-foreground)]">
            Watch disputes, refunds, cancellations and users that may need admin review before they damage trust.
          </p>
        </div>
        <Link href="/admin/disputes" className="btn btn-secondary">
          Review disputes
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <RiskStat icon={<AlertTriangle size={20} />} label="Open reports" value={openReports.length} tone="danger" />
        <RiskStat icon={<ShieldAlert size={20} />} label="Disputed bookings" value={disputedBookings} tone="danger" />
        <RiskStat icon={<CalendarX2 size={20} />} label="Cancelled 30d" value={cancelledBookings} tone="warning" />
        <RiskStat icon={<Ban size={20} />} label="Refunded 30d" value={refundedBookings} tone="warning" />
      </div>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <h2 className="text-2xl font-black tracking-[-0.04em]">Open reports</h2>
          <div className="mt-5 grid gap-3">
            {openReports.length > 0 ? openReports.map((report) => (
              <div key={report.id} className="rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black">{report.reason.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]">
                      {report.booking.service.title} · buyer {report.booking.buyer.email} · helper {report.booking.expert.user.email}
                    </p>
                  </div>
                  <Link href="/admin/disputes" className="btn btn-secondary text-xs">Open case</Link>
                </div>
                {report.message ? <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{report.message}</p> : null}
              </div>
            )) : (
              <div className="rounded-[24px] border border-[var(--success)]/20 bg-[var(--success-soft)] p-5 text-sm font-bold text-[var(--success)]">
                No open reports right now.
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="p-6">
            <h2 className="text-2xl font-black tracking-[-0.04em]">Experts to watch</h2>
            <div className="mt-5 grid gap-3">
              {riskyExperts.length > 0 ? riskyExperts.map((expert) => (
                <RiskPerson key={expert.id} icon={<UserRoundX size={18} />} name={expert.user.name || expert.user.email || "Expert"} email={expert.user.email || ""} count={expert.bookings.length} href={`/admin/experts`} />
              )) : <EmptyRisk text="No risky expert pattern in the last 30 days." />}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-black tracking-[-0.04em]">Buyers to watch</h2>
            <div className="mt-5 grid gap-3">
              {riskyBuyers.length > 0 ? riskyBuyers.map((buyer) => (
                <RiskPerson key={buyer.id} icon={<UserRoundX size={18} />} name={buyer.name || buyer.email || "Buyer"} email={buyer.email || ""} count={buyer.bookings.length} href={`/admin/users`} />
              )) : <EmptyRisk text="No risky buyer pattern in the last 30 days." />}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function RiskStat({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: "danger" | "warning" }) {
  return (
    <Card className="p-5">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone === "danger" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--warning-soft)] text-[var(--warning)]"}`}>
        {icon}
      </div>
      <p className="mt-4 text-3xl font-black tracking-[-0.05em]">{value}</p>
      <p className="mt-1 text-sm font-bold text-[var(--muted-foreground)]">{label}</p>
    </Card>
  );
}

function RiskPerson({ icon, name, email, count, href }: { icon: ReactNode; name: string; email: string; count: number; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 transition hover:-translate-y-0.5 hover:bg-[var(--background-soft)]">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--danger-soft)] text-[var(--danger)]">{icon}</div>
        <div className="min-w-0">
          <p className="truncate font-black">{name}</p>
          <p className="truncate text-xs font-bold text-[var(--muted-foreground)]">{email}</p>
        </div>
      </div>
      <span className="rounded-full bg-[var(--warning-soft)] px-3 py-1 text-xs font-black text-[var(--warning)]">{count} events</span>
    </Link>
  );
}

function EmptyRisk({ text }: { text: string }) {
  return <div className="rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]">{text}</div>;
}
