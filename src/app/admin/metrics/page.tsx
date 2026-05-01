import Link from "next/link";
import { prisma } from "@/lib/prisma";

const PLATFORM_FEE_RATE = 0.15;

export default async function AdminMetricsPage() {
  const [bookings, experts, buyers, reviews, services] = await Promise.all([
    prisma.booking.findMany({
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
    }),

    prisma.expertProfile.findMany({
      include: {
        user: true,
        services: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.user.findMany({
      where: {
        role: "BUYER",
      },
    }),

    prisma.review.findMany(),

    prisma.service.findMany(),
  ]);

  const revenueStatuses = ["PAID", "CONFIRMED", "COMPLETED"];

  const revenueBookings = bookings.filter((booking) =>
    revenueStatuses.includes(booking.status),
  );

  const pendingBookings = bookings.filter(
    (booking) => booking.status === "PENDING",
  );

  const paidBookings = bookings.filter((booking) => booking.status === "PAID");

  const confirmedBookings = bookings.filter(
    (booking) => booking.status === "CONFIRMED",
  );

  const completedBookings = bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const cancelledBookings = bookings.filter(
    (booking) => booking.status === "CANCELLED",
  );

  const approvedExperts = experts.filter(
    (expert) => expert.status === "APPROVED",
  );

  const pendingExperts = experts.filter(
    (expert) => expert.status === "PENDING",
  );

  const verifiedExperts = experts.filter((expert) => expert.isVerified);

  const gmvCents = revenueBookings.reduce(
    (sum, booking) => sum + booking.priceCents,
    0,
  );

  const platformRevenueCents = Math.round(gmvCents * PLATFORM_FEE_RATE);
  const estimatedPayoutCents = gmvCents - platformRevenueCents;

  const averageBookingCents =
    revenueBookings.length > 0
      ? Math.round(gmvCents / revenueBookings.length)
      : 0;

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) /
        reviews.length
      : 0;

  const completionRate =
    bookings.length > 0
      ? Math.round((completedBookings.length / bookings.length) * 100)
      : 0;

  const cancellationRate =
    bookings.length > 0
      ? Math.round((cancelledBookings.length / bookings.length) * 100)
      : 0;

  const reviewRate =
    completedBookings.length > 0
      ? Math.round((reviews.length / completedBookings.length) * 100)
      : 0;

  return (
    <main className="container-page py-10">
      <section className="rounded-[2rem] bg-[#151515] p-6 text-white sm:rounded-[2.5rem] md:p-10">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black text-[#f97316]">
              Founder dashboard
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Platform metrics
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/60">
              Track marketplace supply, demand, GMV, platform revenue and early
              quality signals.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/experts"
              className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
            >
              Expert moderation
            </Link>

            <Link
              href="/dashboard/bookings"
              className="rounded-full bg-[#2563eb] px-6 py-3 text-center text-sm font-black text-white transition hover:bg-[#1d4ed8]"
            >
              Bookings
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-4">
          <HeroMetric label="GMV" value={formatMoney(gmvCents)} />
          <HeroMetric
            label="Platform revenue"
            value={formatMoney(platformRevenueCents)}
          />
          <HeroMetric
            label="Expert payouts"
            value={formatMoney(estimatedPayoutCents)}
          />
          <HeroMetric
            label="Avg booking"
            value={formatMoney(averageBookingCents)}
          />
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total bookings"
          value={`${bookings.length}`}
          text="All booking records created on the platform."
        />
        <MetricCard
          title="Revenue bookings"
          value={`${revenueBookings.length}`}
          text="Bookings with PAID, CONFIRMED or COMPLETED status."
        />
        <MetricCard
          title="Experts"
          value={`${experts.length}`}
          text={`${approvedExperts.length} approved, ${pendingExperts.length} pending.`}
        />
        <MetricCard
          title="Buyers"
          value={`${buyers.length}`}
          text="Users created as buyers during booking."
        />
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <div>
            <div className="mb-5">
              <h2 className="text-2xl font-black">Booking funnel</h2>
              <p className="mt-1 text-sm text-[#6f6a63]">
                Status distribution across the consultation lifecycle.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <StatusCard
                label="Pending"
                value={pendingBookings.length}
                description="Created but not paid or confirmed yet."
                tone="orange"
              />
              <StatusCard
                label="Paid"
                value={paidBookings.length}
                description="Payment confirmed via Stripe webhook."
                tone="blue"
              />
              <StatusCard
                label="Confirmed"
                value={confirmedBookings.length}
                description="Accepted and ready for the session."
                tone="green"
              />
              <StatusCard
                label="Completed"
                value={completedBookings.length}
                description="Session happened and can receive a review."
                tone="dark"
              />
              <StatusCard
                label="Cancelled"
                value={cancelledBookings.length}
                description="Cancelled bookings with released slots."
                tone="red"
              />
              <StatusCard
                label="Reviews"
                value={reviews.length}
                description={`Average rating ${averageRating.toFixed(1)} / 5.`}
                tone="neutral"
              />
            </div>
          </div>

          <div>
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-2xl font-black">Recent bookings</h2>
                <p className="mt-1 text-sm text-[#6f6a63]">
                  Latest activity across the marketplace.
                </p>
              </div>

              <Link
                href="/dashboard/bookings"
                className="w-fit rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
              >
                View all
              </Link>
            </div>

            {bookings.length === 0 ? (
              <EmptyCard
                icon="📅"
                title="No bookings yet"
                text="Bookings will appear here after users reserve expert sessions."
              />
            ) : (
              <div className="space-y-4">
                {bookings.slice(0, 8).map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/dashboard/bookings/${booking.id}`}
                    className="card card-hover block rounded-[1.75rem] p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black">
                            {booking.service.title}
                          </h3>
                          <StatusBadge status={booking.status} />
                        </div>

                        <p className="mt-1 text-sm text-[#6f6a63]">
                          {booking.expert.user.name} · {booking.buyer.email}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#eef4ff] px-3 py-1.5 text-xs font-black text-[#2563eb]">
                          {formatMoney(booking.priceCents)}
                        </span>
                        <span className="rounded-full bg-[#f7f4ef] px-3 py-1.5 text-xs font-bold text-[#6f6a63]">
                          {new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                          }).format(booking.startTime)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:h-fit">
          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#f97316]">
              Marketplace quality
            </p>

            <div className="mt-5 space-y-3 rounded-[1.5rem] bg-[#f7f4ef] p-5">
              <SummaryRow label="Completion rate" value={`${completionRate}%`} />
              <SummaryRow
                label="Cancellation rate"
                value={`${cancellationRate}%`}
              />
              <SummaryRow label="Review rate" value={`${reviewRate}%`} />
              <SummaryRow
                label="Average rating"
                value={`${averageRating.toFixed(1)} / 5`}
              />
            </div>

            <div className="mt-6 rounded-[1.5rem] bg-[#eef4ff] p-5">
              <p className="font-black text-[#2563eb]">Founder note</p>
              <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                In early marketplace stages, focus more on completed sessions,
                reviews and expert quality than on vanity traffic.
              </p>
            </div>
          </div>

          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#2563eb]">Supply health</p>

            <div className="mt-5 space-y-3 rounded-[1.5rem] bg-[#f7f4ef] p-5">
              <SummaryRow label="Total experts" value={`${experts.length}`} />
              <SummaryRow
                label="Approved experts"
                value={`${approvedExperts.length}`}
              />
              <SummaryRow
                label="Pending experts"
                value={`${pendingExperts.length}`}
              />
              <SummaryRow
                label="Verified experts"
                value={`${verifiedExperts.length}`}
              />
              <SummaryRow label="Services" value={`${services.length}`} />
            </div>

            <Link
              href="/admin/experts"
              className="mt-6 block rounded-full bg-[#151515] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#2563eb]"
            >
              Manage experts
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}

function formatMoney(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

function HeroMetric({ label, value }: { label: string; value: string }) {
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

function StatusCard({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: number;
  description: string;
  tone: "orange" | "blue" | "green" | "dark" | "red" | "neutral";
}) {
  const styles = {
    orange: "bg-[#fff3e8] text-[#f97316]",
    blue: "bg-[#eef4ff] text-[#2563eb]",
    green: "bg-green-100 text-green-700",
    dark: "bg-[#151515] text-white",
    red: "bg-red-100 text-red-700",
    neutral: "bg-[#f7f4ef] text-[#151515]",
  };

  return (
    <div className={`rounded-[2rem] p-6 ${styles[tone]}`}>
      <p className="text-sm font-black opacity-80">{label}</p>
      <p className="mt-4 text-4xl font-black">{value}</p>
      <p className="mt-3 text-sm leading-6 opacity-75">{description}</p>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#e8e1d8] pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-[#6f6a63]">{label}</span>
      <span className="text-right text-sm font-black">{value}</span>
    </div>
  );
}

function EmptyCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="card rounded-[2rem] p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff] text-2xl">
        {icon}
      </div>

      <h3 className="mt-5 text-2xl font-black">{title}</h3>

      <p className="mx-auto mt-3 max-w-md leading-7 text-[#6f6a63]">
        {text}
      </p>
    </div>
  );
}