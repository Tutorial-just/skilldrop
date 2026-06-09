import { BarChart3, CalendarDays, MousePointerClick, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const funnelEvents = [
  "HELP_REQUEST_CREATED",
  "EXPERTS_VIEWED",
  "EXPERT_PROFILE_VIEWED",
  "BOOKING_STARTED",
  "PAYMENT_CONFIRMED",
  "BOOKING_CANCELLED",
  "CALL_COMPLETED",
  "REVIEW_LEFT",
];

export default async function AdminAnalyticsPage() {
  await requireRole(["admin"]);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [events, recentEvents, helpRequests, bookings] = await Promise.all([
    prisma.productEvent.groupBy({
      by: ["event"],
      where: {
        createdAt: {
          gte: since,
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.productEvent.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 25,
    }),
    prisma.helpRequest.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.booking.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const eventCount = new Map<string, number>(
    events.map((event) => [String(event.event), Number(event._count._all)]),
  );
  const helpRequestCount = helpRequests.reduce((sum, row) => sum + Number(row._count._all), 0);
  const bookingCount = bookings.reduce((sum, row) => sum + Number(row._count._all), 0);
  const bookingStarted = eventCount.get("BOOKING_STARTED") ?? 0;
  const helpCreated = eventCount.get("HELP_REQUEST_CREATED") ?? 0;
  const conversionRate = helpCreated > 0 ? Math.round((bookingStarted / helpCreated) * 100) : 0;

  return (
    <main className="container-page py-8 md:py-10 lg:py-12">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Badge variant="primary">
            <BarChart3 size={14} />
            Product analytics
          </Badge>

          <h1 className="heading-lg mt-5 max-w-4xl text-balance">
            Marketplace funnel and problem demand
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
            Track the world-class funnel: help request, expert discovery, profile views, booking starts, completed calls and reviews.
          </p>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Sparkles} label="Help requests" value={String(helpRequestCount)} hint="All saved buyer problems" />
        <MetricCard icon={CalendarDays} label="Bookings" value={String(bookingCount)} hint="All booking statuses" />
        <MetricCard icon={TrendingUp} label="30d conversion" value={`${conversionRate}%`} hint="Booking started / problem created" />
        <MetricCard icon={MousePointerClick} label="Profile views" value={String(eventCount.get("EXPERT_PROFILE_VIEWED") ?? 0)} hint="Tracked over 30 days" />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5 md:p-6">
          <Badge variant="accent">
            <TrendingUp size={14} />
            30-day funnel
          </Badge>

          <div className="mt-6 grid gap-3">
            {funnelEvents.map((event) => (
              <FunnelRow key={event} label={formatEventLabel(event)} value={eventCount.get(event) ?? 0} />
            ))}
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <Badge variant="primary">
            <ShieldCheck size={14} />
            Current health
          </Badge>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <StatusGroup title="Help requests" rows={helpRequests.map((row) => ({ label: row.status, value: row._count._all }))} />
            <StatusGroup title="Bookings" rows={bookings.map((row) => ({ label: row.status, value: row._count._all }))} />
          </div>
        </Card>
      </section>

      <Card className="mt-8 p-5 md:p-6">
        <Badge variant="primary">Recent events</Badge>

        <div className="mt-5 grid gap-3">
          {recentEvents.length > 0 ? (
            recentEvents.map((event) => (
              <div key={event.id} className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-black tracking-[-0.02em]">{formatEventLabel(event.event)}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--muted-foreground)]">
                    {event.entityType ?? "Event"}{event.entityId ? ` · ${event.entityId}` : ""}
                  </p>
                </div>
                <p className="text-sm font-bold text-[var(--muted-foreground)]">{formatDateTime(event.createdAt)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm font-semibold text-[var(--muted-foreground)]">No product events yet.</p>
          )}
        </div>
      </Card>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value, hint }: { icon: typeof BarChart3; label: string; value: string; hint: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--muted-foreground)]">{label}</p>
          <p className="text-2xl font-black tracking-[-0.04em]">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-[var(--muted-foreground)]">{hint}</p>
    </Card>
  );
}

function FunnelRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <p className="font-bold tracking-[-0.02em]">{label}</p>
      <Badge variant={value > 0 ? "primary" : "accent"}>{value}</Badge>
    </div>
  );
}

function StatusGroup({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  return (
    <div>
      <p className="font-black tracking-[-0.02em]">{title}</p>
      <div className="mt-3 grid gap-2">
        {rows.length > 0 ? rows.map((row) => <FunnelRow key={row.label} label={row.label} value={row.value} />) : <p className="text-sm text-[var(--muted-foreground)]">No data.</p>}
      </div>
    </div>
  );
}

function formatEventLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
