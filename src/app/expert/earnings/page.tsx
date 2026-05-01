import Link from "next/link";
import { prisma } from "@/lib/prisma";

const PLATFORM_FEE_RATE = 0.15;

export default async function ExpertEarningsPage() {
  const bookings = await prisma.booking.findMany({
    where: {
      status: {
        in: ["PAID", "CONFIRMED", "COMPLETED"],
      },
    },
    include: {
      buyer: true,
      expert: {
        include: {
          user: true,
        },
      },
      service: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const grossCents = bookings.reduce(
    (sum, booking) => sum + booking.priceCents,
    0,
  );

  const platformFeeCents = Math.round(grossCents * PLATFORM_FEE_RATE);
  const estimatedPayoutCents = grossCents - platformFeeCents;

  const completedBookings = bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const paidBookings = bookings.filter((booking) => booking.status === "PAID");

  const confirmedBookings = bookings.filter(
    (booking) => booking.status === "CONFIRMED",
  );

  const averageSessionCents =
    bookings.length > 0 ? Math.round(grossCents / bookings.length) : 0;

  return (
    <main className="container-page py-10">
      <section className="rounded-[2rem] bg-[#151515] p-6 text-white sm:rounded-[2.5rem] md:p-10">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black text-[#f97316]">
              Expert dashboard
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Earnings
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/60">
              Track paid sessions, platform fees and estimated expert payout.
              This is an MVP calculation before real Stripe Connect payouts.
            </p>
          </div>

          <Link
            href="/expert/bookings"
            className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
          >
            View bookings
          </Link>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-4">
          <DashboardStat label="Gross revenue" value={formatMoney(grossCents)} />
          <DashboardStat
            label="Platform fee"
            value={formatMoney(platformFeeCents)}
          />
          <DashboardStat
            label="Estimated payout"
            value={formatMoney(estimatedPayoutCents)}
          />
          <DashboardStat
            label="Avg. session"
            value={formatMoney(averageSessionCents)}
          />
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        <MetricCard
          title="Paid bookings"
          value={`${paidBookings.length}`}
          text="Payment is confirmed, but the session may still need expert confirmation."
        />
        <MetricCard
          title="Confirmed bookings"
          value={`${confirmedBookings.length}`}
          text="The expert has confirmed the session and it is ready to happen."
        />
        <MetricCard
          title="Completed sessions"
          value={`${completedBookings.length}`}
          text="Completed sessions are the strongest signal for payouts and reviews."
        />
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-black">Revenue events</h2>
              <p className="mt-1 text-sm text-[#6f6a63]">
                Paid, confirmed and completed bookings included in earnings.
              </p>
            </div>

            <span className="w-fit rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-bold text-[#6f6a63]">
              Platform fee: 15%
            </span>
          </div>

          {bookings.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => {
                const feeCents = Math.round(
                  booking.priceCents * PLATFORM_FEE_RATE,
                );
                const payoutCents = booking.priceCents - feeCents;

                return (
                  <article key={booking.id} className="card rounded-[2rem] p-6">
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-xl font-black text-white">
                          {booking.expert.user.name?.charAt(0) ?? "E"}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black">
                              {booking.service.title}
                            </h3>
                            <StatusBadge status={booking.status} />
                          </div>

                          <p className="mt-1 text-sm leading-6 text-[#6f6a63]">
                            Expert:{" "}
                            <span className="font-bold text-[#151515]">
                              {booking.expert.user.name}
                            </span>
                          </p>

                          <p className="text-sm leading-6 text-[#6f6a63]">
                            Buyer:{" "}
                            <span className="font-bold text-[#151515]">
                              {booking.buyer.email}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
                        <MiniInfo
                          label="Gross"
                          value={formatMoney(booking.priceCents)}
                          highlighted
                        />
                        <MiniInfo label="Fee" value={formatMoney(feeCents)} />
                        <MiniInfo
                          label="Payout"
                          value={formatMoney(payoutCents)}
                          highlighted
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col justify-between gap-3 border-t border-[#e8e1d8] pt-5 md:flex-row md:items-center">
                      <p className="text-sm text-[#6f6a63]">
                        Session date:{" "}
                        <span className="font-bold text-[#151515]">
                          {new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(booking.startTime)}
                        </span>
                      </p>

                      <Link
                        href={`/dashboard/bookings/${booking.id}`}
                        className="w-fit rounded-full bg-[#151515] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#2563eb]"
                      >
                        View booking
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#f97316]">Payout summary</p>

            <div className="mt-5 space-y-3 rounded-[1.5rem] bg-[#f7f4ef] p-5">
              <SummaryRow label="Gross revenue" value={formatMoney(grossCents)} />
              <SummaryRow
                label="Platform fee"
                value={`-${formatMoney(platformFeeCents)}`}
              />
              <SummaryRow
                label="Estimated payout"
                value={formatMoney(estimatedPayoutCents)}
              />
              <SummaryRow label="Currency" value="EUR" />
            </div>

            <div className="mt-6 rounded-[1.5rem] bg-[#eef4ff] p-5">
              <p className="font-black text-[#2563eb]">MVP payout logic</p>
              <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                This page calculates earnings locally from paid, confirmed and
                completed bookings. Later we will connect Stripe Connect for real
                expert payouts.
              </p>
            </div>

            <div className="mt-6 rounded-[1.5rem] bg-[#fff3e8] p-5">
              <p className="font-black text-[#f97316]">
                Not production accounting
              </p>
              <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                Taxes, refunds, chargebacks and payout schedules are not included
                yet.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function formatMoney(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

function DashboardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white/10 p-5">
      <p className="text-sm text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  text,
}: {
  title: string;
  value: string;
  text: string;
}) {
  return (
    <div className="card rounded-[2rem] p-6">
      <p className="text-sm font-black text-[#2563eb]">{title}</p>
      <p className="mt-4 text-4xl font-black">{value}</p>
      <p className="mt-3 text-sm leading-6 text-[#6f6a63]">{text}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-[#fff3e8] text-[#f97316]",
    PAID: "bg-[#eef4ff] text-[#2563eb]",
    CONFIRMED: "bg-green-100 text-green-700",
    COMPLETED: "bg-[#151515] text-white",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        styles[status] ?? "bg-[#f7f4ef] text-[#6f6a63]"
      }`}
    >
      {status}
    </span>
  );
}

function MiniInfo({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-[1.25rem] p-4 ${
        highlighted ? "bg-[#eef4ff]" : "bg-[#f7f4ef]"
      }`}
    >
      <p className="text-xs font-bold text-[#6f6a63]">{label}</p>
      <p
        className={`mt-1 truncate text-sm font-black ${
          highlighted ? "text-[#2563eb]" : "text-[#151515]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#e8e1d8] pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-[#6f6a63]">{label}</span>
      <span className="text-right text-sm font-black">{value}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card rounded-[2rem] p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff] text-2xl">
        💶
      </div>

      <h3 className="mt-5 text-2xl font-black">No paid bookings yet</h3>

      <p className="mx-auto mt-3 max-w-md leading-7 text-[#6f6a63]">
        Paid, confirmed and completed bookings will appear here as revenue
        events.
      </p>

      <Link
        href="/expert/bookings"
        className="mt-6 inline-flex rounded-full bg-[#2563eb] px-6 py-3 text-sm font-black text-white transition hover:bg-[#1d4ed8]"
      >
        View bookings
      </Link>
    </div>
  );
}