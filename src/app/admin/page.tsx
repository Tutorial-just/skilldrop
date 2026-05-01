import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RingStat } from "@/components/dashboard/ring-stat";

const PLATFORM_FEE_RATE = 0.15;

export default async function AdminOverviewPage() {
  const [bookings, experts, buyers, reviews, services, availability] =
    await Promise.all([
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

      prisma.availability.findMany(),
    ]);

  const revenueBookings = bookings.filter(
    (booking) =>
      booking.status === "PAID" ||
      booking.status === "CONFIRMED" ||
      booking.status === "COMPLETED",
  );

  const pendingBookings = bookings.filter(
    (booking) => booking.status === "PENDING",
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

  const openSlots = availability.filter((slot) => !slot.isBooked);
  const bookedSlots = availability.filter((slot) => slot.isBooked);

  const gmvCents = revenueBookings.reduce(
    (sum, booking) => sum + booking.priceCents,
    0,
  );

  const platformRevenueCents = Math.round(gmvCents * PLATFORM_FEE_RATE);
  const expertPayoutCents = gmvCents - platformRevenueCents;

  const completionRate =
    bookings.length > 0
      ? Math.round((completedBookings.length / bookings.length) * 100)
      : 0;

  const cancellationRate =
    bookings.length > 0
      ? Math.round((cancelledBookings.length / bookings.length) * 100)
      : 0;

  const expertApprovalRate =
    experts.length > 0
      ? Math.round((approvedExperts.length / experts.length) * 100)
      : 0;

  const reviewRate =
    completedBookings.length > 0
      ? Math.round((reviews.length / completedBookings.length) * 100)
      : 0;

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) /
        reviews.length
      : 0;

  return (
    <main className="container-page py-10">
      <section className="rounded-[2rem] bg-[#151515] p-6 text-white sm:rounded-[2.5rem] md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <p className="text-sm font-black text-[#f97316]">
              Admin workspace
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Control the marketplace.
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/60">
              Monitor growth, review expert supply, track bookings and spot
              marketplace issues before they become serious.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin/experts"
                className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
              >
                Review experts
              </Link>

              <Link
                href="/admin/metrics"
                className="rounded-full bg-[#2563eb] px-6 py-3 text-center text-sm font-black text-white transition hover:bg-[#1d4ed8]"
              >
                Open metrics
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-5 text-[#151515]">
            <p className="text-sm font-black text-[#2563eb]">
              Needs attention
            </p>

            {pendingExperts.length > 0 ? (
              <div>
                <h2 className="mt-3 text-2xl font-black">
                  {pendingExperts.length} expert profiles pending
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                  Review and approve high-quality experts to improve marketplace
                  supply.
                </p>

                <Link
                  href="/admin/experts"
                  className="mt-4 block rounded-full bg-[#151515] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#2563eb]"
                >
                  Moderate experts
                </Link>
              </div>
            ) : pendingBookings.length > 0 ? (
              <div>
                <h2 className="mt-3 text-2xl font-black">
                  {pendingBookings.length} pending bookings
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                  Some bookings are still pending payment or confirmation.
                </p>

                <Link
                  href="/dashboard/bookings"
                  className="mt-4 block rounded-full bg-[#151515] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#2563eb]"
                >
                  View bookings
                </Link>
              </div>
            ) : (
              <div>
                <h2 className="mt-3 text-2xl font-black">All clear</h2>

                <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                  No urgent moderation tasks right now.
                </p>

                <Link
                  href="/admin/metrics"
                  className="mt-4 block rounded-full bg-[#151515] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#2563eb]"
                >
                  Check metrics
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-4">
          <DashboardStat label="GMV" value={formatMoney(gmvCents)} />
          <DashboardStat
            label="Platform revenue"
            value={formatMoney(platformRevenueCents)}
          />
          <DashboardStat label="Bookings" value={`${bookings.length}`} />
          <DashboardStat label="Pending experts" value={`${pendingExperts.length}`} />
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-4">
        <RingStat
          label="Completion"
          value={completionRate}
          description="Completed bookings compared to all bookings."
          tone={completionRate >= 50 ? "green" : "orange"}
        />

        <RingStat
          label="Cancellation"
          value={cancellationRate}
          description="Lower cancellation rate means healthier marketplace."
          tone={cancellationRate <= 20 ? "green" : "orange"}
        />

        <RingStat
          label="Expert supply"
          value={expertApprovalRate}
          description="Approved experts compared to all expert profiles."
          tone={expertApprovalRate >= 50 ? "green" : "blue"}
        />

        <RingStat
          label="Review rate"
          value={reviewRate}
          description="Reviews compared to completed sessions."
          tone={reviewRate >= 50 ? "green" : "dark"}
        />
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section>
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-2xl font-black">Marketplace health</h2>
                <p className="mt-1 text-sm text-[#6f6a63]">
                  A quick view of supply, demand and quality.
                </p>
              </div>

              <Link
                href="/admin/metrics"
                className="w-fit rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
              >
                Detailed metrics
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <MetricCard
                title="Buyers"
                value={`${buyers.length}`}
                text="Users created as clients through booking or sign-in."
              />
              <MetricCard
                title="Approved experts"
                value={`${approvedExperts.length}`}
                text={`${pendingExperts.length} profiles still waiting for review.`}
              />
              <MetricCard
                title="Services"
                value={`${services.length}`}
                text="Active and inactive offers created by experts."
              />
              <MetricCard
                title="Average rating"
                value={`${averageRating.toFixed(1)} / 5`}
                text={`${reviews.length} total reviews collected.`}
              />
            </div>
          </section>

          <section>
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-2xl font-black">Recent bookings</h2>
                <p className="mt-1 text-sm text-[#6f6a63]">
                  Latest marketplace activity.
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
                text="Marketplace bookings will appear here once clients book sessions."
              />
            ) : (
              <div className="space-y-4">
                {bookings.slice(0, 6).map((booking) => (
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
          </section>

          <section>
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-2xl font-black">Expert moderation queue</h2>
                <p className="mt-1 text-sm text-[#6f6a63]">
                  Expert profiles that may need review.
                </p>
              </div>

              <Link
                href="/admin/experts"
                className="w-fit rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
              >
                Manage experts
              </Link>
            </div>

            {pendingExperts.length === 0 ? (
              <EmptyCard
                icon="✅"
                title="No pending experts"
                text="New expert applications will appear here for moderation."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingExperts.slice(0, 4).map((expert) => (
                  <Link
                    key={expert.id}
                    href="/admin/experts"
                    className="card card-hover rounded-[2rem] p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f97316] text-xl font-black text-white">
                        {expert.user.name?.charAt(0) ?? "E"}
                      </div>

                      <StatusBadge status={expert.status} />
                    </div>

                    <h3 className="mt-5 text-xl font-black">
                      {expert.user.name}
                    </h3>

                    <p className="mt-2 min-h-[48px] text-sm leading-6 text-[#6f6a63]">
                      {expert.headline}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {expert.skills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-[#f7f4ef] px-3 py-1 text-xs font-bold text-[#6f6a63]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:h-fit">
          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#f97316]">Quick actions</p>

            <div className="mt-5 grid gap-3">
              <QuickAction
                href="/admin/experts"
                title="Moderate experts"
                text="Approve, reject or verify expert profiles."
              />
              <QuickAction
                href="/admin/metrics"
                title="Open metrics"
                text="View GMV, revenue and quality details."
              />
              <QuickAction
                href="/dashboard/bookings"
                title="Review bookings"
                text="Inspect all client sessions."
              />
              <QuickAction
                href="/expert/availability"
                title="Check availability"
                text="Inspect marketplace supply slots."
              />
            </div>
          </div>

          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#2563eb]">
              Revenue snapshot
            </p>

            <div className="mt-5 space-y-3 rounded-[1.5rem] bg-[#f7f4ef] p-5">
              <SummaryRow label="GMV" value={formatMoney(gmvCents)} />
              <SummaryRow
                label="Platform revenue"
                value={formatMoney(platformRevenueCents)}
              />
              <SummaryRow
                label="Expert payouts"
                value={formatMoney(expertPayoutCents)}
              />
              <SummaryRow
                label="Revenue bookings"
                value={`${revenueBookings.length}`}
              />
            </div>
          </div>

          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#2563eb]">Supply health</p>

            <div className="mt-5 space-y-3 rounded-[1.5rem] bg-[#f7f4ef] p-5">
              <SummaryRow label="Experts" value={`${experts.length}`} />
              <SummaryRow
                label="Approved"
                value={`${approvedExperts.length}`}
              />
              <SummaryRow label="Pending" value={`${pendingExperts.length}`} />
              <SummaryRow label="Verified" value={`${verifiedExperts.length}`} />
              <SummaryRow label="Open slots" value={`${openSlots.length}`} />
              <SummaryRow label="Booked slots" value={`${bookedSlots.length}`} />
            </div>
          </div>

          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#f97316]">Admin focus</p>

            <div className="mt-5 rounded-[1.5rem] bg-[#fff3e8] p-5">
              <p className="font-black text-[#f97316]">
                Keep supply quality high
              </p>
              <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                Early marketplace trust depends more on expert quality,
                completed sessions and reviews than on the number of users.
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#e8e1d8] pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-[#6f6a63]">{label}</span>
      <span className="text-right text-sm font-black">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-[#fff3e8] text-[#f97316]",
    PAID: "bg-[#eef4ff] text-[#2563eb]",
    APPROVED: "bg-[#eef4ff] text-[#2563eb]",
    CONFIRMED: "bg-green-100 text-green-700",
    COMPLETED: "bg-[#151515] text-white",
    CANCELLED: "bg-red-100 text-red-700",
    REJECTED: "bg-red-100 text-red-700",
    SUSPENDED: "bg-[#f7f4ef] text-[#6f6a63]",
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

function QuickAction({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[1.5rem] bg-[#f7f4ef] p-4 transition hover:bg-[#eef4ff]"
    >
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[#6f6a63]">{text}</p>
    </Link>
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

      <p className="mx-auto mt-3 max-w-md leading-7 text-[#6f6a63]">{text}</p>
    </div>
  );
}