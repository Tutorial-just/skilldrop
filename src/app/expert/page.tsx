import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RingStat } from "@/components/dashboard/ring-stat";

const PLATFORM_FEE_RATE = 0.15;

export default async function ExpertDashboardPage() {
  const [experts, bookings] = await Promise.all([
    prisma.expertProfile.findMany({
      include: {
        user: true,
        services: true,
        availability: true,
        reviews: {
          include: {
            buyer: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.booking.findMany({
      include: {
        buyer: true,
        expert: {
          include: {
            user: true,
          },
        },
        service: true,
        review: true,
        callRoom: true,
      },
      orderBy: {
        startTime: "asc",
      },
    }),
  ]);

  const mainExpert = experts[0];

  const pendingBookings = bookings.filter(
    (booking) => booking.status === "PENDING",
  );

  const paidBookings = bookings.filter((booking) => booking.status === "PAID");

  const confirmedBookings = bookings.filter(
    (booking) => booking.status === "CONFIRMED",
  );

  const upcomingBookings = bookings.filter(
    (booking) =>
      booking.status !== "CANCELLED" &&
      booking.status !== "COMPLETED" &&
      booking.startTime >= new Date(),
  );

  const completedBookings = bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const cancelledBookings = bookings.filter(
    (booking) => booking.status === "CANCELLED",
  );

  const revenueBookings = bookings.filter(
    (booking) =>
      booking.status === "PAID" ||
      booking.status === "CONFIRMED" ||
      booking.status === "COMPLETED",
  );

  const grossCents = revenueBookings.reduce(
    (sum, booking) => sum + booking.priceCents,
    0,
  );

  const platformFeeCents = Math.round(grossCents * PLATFORM_FEE_RATE);
  const payoutCents = grossCents - platformFeeCents;

  const availableSlots = experts.reduce(
    (sum, expert) =>
      sum + expert.availability.filter((slot) => !slot.isBooked).length,
    0,
  );

  const bookedSlots = experts.reduce(
    (sum, expert) =>
      sum + expert.availability.filter((slot) => slot.isBooked).length,
    0,
  );

  const totalSlots = availableSlots + bookedSlots;

  const availabilityHealth =
    totalSlots > 0 ? Math.round((availableSlots / totalSlots) * 100) : 0;

  const bookingCompletionRate =
    bookings.length > 0
      ? Math.round((completedBookings.length / bookings.length) * 100)
      : 0;

  const earningsProgress = Math.min(
    Math.round((payoutCents / 10000) * 100),
    100,
  );

  const totalReviews = experts.reduce(
    (sum, expert) => sum + expert.reviews.length,
    0,
  );

  const averageRating =
    experts.length > 0
      ? experts.reduce((sum, expert) => sum + expert.rating, 0) / experts.length
      : 0;

  const profileScore = mainExpert ? calculateProfileScore(mainExpert) : 0;

  const nextBooking = upcomingBookings[0];

  const recentReviews = experts
    .flatMap((expert) =>
      expert.reviews.map((review) => ({
        ...review,
        expertName: expert.user.name ?? "Expert",
      })),
    )
    .slice(0, 3);

  return (
    <main className="container-page py-10">
      <section className="rounded-[2rem] bg-[#151515] p-6 text-white sm:rounded-[2.5rem] md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <p className="text-sm font-black text-[#f97316]">
              Expert workspace
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Run your expert business from one place.
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/60">
              Manage booking requests, upcoming sessions, availability, earnings
              and profile quality without jumping between tools.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/expert/bookings"
                className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
              >
                Manage bookings
              </Link>

              <Link
                href="/expert/availability"
                className="rounded-full bg-[#2563eb] px-6 py-3 text-center text-sm font-black text-white transition hover:bg-[#1d4ed8]"
              >
                Add availability
              </Link>

              <Link
                href="/expert/settings"
                className="rounded-full bg-white/10 px-6 py-3 text-center text-sm font-black text-white transition hover:bg-white/15"
              >
                Settings
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-5 text-[#151515]">
            <p className="text-sm font-black text-[#2563eb]">Next session</p>

            {nextBooking ? (
              <div>
                <h2 className="mt-3 text-2xl font-black">
                  {nextBooking.service.title}
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                  Buyer: {nextBooking.buyer.name ?? nextBooking.buyer.email}
                </p>

                <p className="mt-4 rounded-[1.25rem] bg-[#f7f4ef] px-4 py-3 text-sm font-black">
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(nextBooking.startTime)}
                </p>

                <Link
                  href={`/dashboard/bookings/${nextBooking.id}`}
                  className="mt-4 block rounded-full bg-[#151515] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#2563eb]"
                >
                  Open booking
                </Link>
              </div>
            ) : (
              <div>
                <h2 className="mt-3 text-2xl font-black">
                  No upcoming sessions
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                  Add more available slots so buyers can book your time.
                </p>

                <Link
                  href="/expert/availability"
                  className="mt-4 block rounded-full bg-[#151515] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#2563eb]"
                >
                  Add slots
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-4">
          <DashboardStat
            label="Pending requests"
            value={`${pendingBookings.length}`}
          />
          <DashboardStat
            label="Upcoming sessions"
            value={`${upcomingBookings.length}`}
          />
          <DashboardStat
            label="Completed"
            value={`${completedBookings.length}`}
          />
          <DashboardStat
            label="Estimated payout"
            value={formatMoney(payoutCents)}
          />
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-4">
        <RingStat
          label="Profile score"
          value={profileScore}
          description="Profile readiness for trust and conversion."
          tone={profileScore >= 80 ? "green" : "orange"}
        />

        <RingStat
          label="Availability"
          value={availabilityHealth}
          description="Share of open slots compared to all slots."
          tone={availabilityHealth >= 50 ? "green" : "orange"}
        />

        <RingStat
          label="Completion"
          value={bookingCompletionRate}
          description="Completed sessions compared to all bookings."
          tone={bookingCompletionRate >= 50 ? "green" : "blue"}
        />

        <RingStat
          label="Earnings goal"
          value={earningsProgress}
          description="Progress toward €100 estimated payout."
          tone={earningsProgress >= 50 ? "green" : "dark"}
        />
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section>
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-2xl font-black">Booking pipeline</h2>
                <p className="mt-1 text-sm text-[#6f6a63]">
                  See where your sessions are in the expert workflow.
                </p>
              </div>

              <Link
                href="/expert/bookings"
                className="w-fit rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
              >
                Open bookings
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <PipelineCard
                title="Pending"
                value={`${pendingBookings.length}`}
                text="New requests waiting for payment or confirmation."
                tone="orange"
              />
              <PipelineCard
                title="Paid"
                value={`${paidBookings.length}`}
                text="Paid sessions waiting for confirmation."
                tone="blue"
              />
              <PipelineCard
                title="Confirmed"
                value={`${confirmedBookings.length}`}
                text="Sessions accepted and ready to happen."
                tone="green"
              />
              <PipelineCard
                title="Completed"
                value={`${completedBookings.length}`}
                text="Finished sessions that can receive reviews."
                tone="dark"
              />
            </div>
          </section>

          <section>
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-2xl font-black">Upcoming sessions</h2>
                <p className="mt-1 text-sm text-[#6f6a63]">
                  Your next calls with buyers.
                </p>
              </div>

              <Link
                href="/expert/bookings"
                className="w-fit rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
              >
                View all
              </Link>
            </div>

            {upcomingBookings.length === 0 ? (
              <EmptyCard
                icon="📅"
                title="No upcoming sessions"
                text="Create availability slots so buyers can book your time."
              />
            ) : (
              <div className="space-y-4">
                {upcomingBookings.slice(0, 5).map((booking) => (
                  <article key={booking.id} className="card rounded-[2rem] p-6">
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-xl font-black text-white">
                          {booking.buyer.name?.charAt(0) ??
                            booking.buyer.email.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black">
                              {booking.service.title}
                            </h3>
                            <StatusBadge status={booking.status} />
                          </div>

                          <p className="mt-1 text-sm text-[#6f6a63]">
                            Buyer:{" "}
                            <span className="font-bold text-[#151515]">
                              {booking.buyer.name ?? booking.buyer.email}
                            </span>
                          </p>

                          <p className="mt-1 text-sm text-[#6f6a63]">
                            Expert:{" "}
                            <span className="font-bold text-[#151515]">
                              {booking.expert.user.name}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
                        <MiniInfo
                          label="Date"
                          value={new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                          }).format(booking.startTime)}
                        />
                        <MiniInfo
                          label="Time"
                          value={new Intl.DateTimeFormat("en", {
                            timeStyle: "short",
                          }).format(booking.startTime)}
                        />
                        <MiniInfo
                          label="Price"
                          value={formatMoney(booking.priceCents)}
                          highlighted
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col justify-between gap-3 border-t border-[#e8e1d8] pt-5 md:flex-row md:items-center">
                      <p className="text-sm text-[#6f6a63]">
                        Video room:{" "}
                        <span className="font-bold text-[#151515]">
                          {booking.callRoom ? "Ready" : "Not created yet"}
                        </span>
                      </p>

                      <Link
                        href={`/dashboard/bookings/${booking.id}`}
                        className="w-fit rounded-full bg-[#151515] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#2563eb]"
                      >
                        Open booking
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-5">
              <h2 className="text-2xl font-black">Performance</h2>
              <p className="mt-1 text-sm text-[#6f6a63]">
                A simple overview of expert activity and quality.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <MetricCard
                title="Average rating"
                value={`${averageRating.toFixed(1)} / 5`}
                text="Based on public expert reviews."
              />
              <MetricCard
                title="Reviews"
                value={`${totalReviews}`}
                text="Reviews help buyers trust your profile."
              />
              <MetricCard
                title="Available slots"
                value={`${availableSlots}`}
                text="More slots usually means more booking opportunities."
              />
              <MetricCard
                title="Cancelled"
                value={`${cancelledBookings.length}`}
                text="Keep cancellations low to improve marketplace trust."
              />
            </div>
          </section>

          <section>
            <div className="mb-5">
              <h2 className="text-2xl font-black">Recent reviews</h2>
              <p className="mt-1 text-sm text-[#6f6a63]">
                Latest feedback from completed sessions.
              </p>
            </div>

            {recentReviews.length === 0 ? (
              <EmptyCard
                icon="⭐"
                title="No reviews yet"
                text="Reviews will appear here after completed sessions."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {recentReviews.map((review) => (
                  <div key={review.id} className="card rounded-[2rem] p-5">
                    <p className="text-lg">{"⭐".repeat(review.rating)}</p>

                    <p className="mt-3 min-h-[72px] text-sm leading-6 text-[#6f6a63]">
                      “{review.comment ?? "No written comment."}”
                    </p>

                    <p className="mt-4 text-sm font-black">
                      {review.buyer.name ?? "Verified buyer"}
                    </p>
                  </div>
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
                href="/expert/bookings"
                title="Manage bookings"
                text="Confirm, complete and join sessions."
              />
              <QuickAction
                href="/expert/availability"
                title="Add slots"
                text="Create more bookable time."
              />
              <QuickAction
                href="/expert/earnings"
                title="Check earnings"
                text="See revenue and estimated payouts."
              />
              <QuickAction
                href="/expert/settings"
                title="Settings"
                text="Adjust profile and preferences."
              />
            </div>
          </div>

          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#2563eb]">
              Earnings snapshot
            </p>

            <div className="mt-5 space-y-3 rounded-[1.5rem] bg-[#f7f4ef] p-5">
              <SummaryRow label="Gross" value={formatMoney(grossCents)} />
              <SummaryRow
                label="Platform fee"
                value={`-${formatMoney(platformFeeCents)}`}
              />
              <SummaryRow
                label="Estimated payout"
                value={formatMoney(payoutCents)}
              />
              <SummaryRow
                label="Completed"
                value={`${completedBookings.length}`}
              />
            </div>

            <Link
              href="/expert/earnings"
              className="mt-6 block rounded-full bg-[#151515] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#2563eb]"
            >
              Open earnings
            </Link>
          </div>

          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#2563eb]">Availability</p>

            <div className="mt-5 space-y-3 rounded-[1.5rem] bg-[#f7f4ef] p-5">
              <SummaryRow label="Available slots" value={`${availableSlots}`} />
              <SummaryRow label="Booked slots" value={`${bookedSlots}`} />
              <SummaryRow
                label="Upcoming sessions"
                value={`${upcomingBookings.length}`}
              />
            </div>

            <Link
              href="/expert/availability"
              className="mt-6 block rounded-full bg-[#2563eb] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#1d4ed8]"
            >
              Manage availability
            </Link>
          </div>

          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#f97316]">
              Profile checklist
            </p>

            <div className="mt-5 space-y-3">
              <ProgressRow label="Profile created" done={Boolean(mainExpert)} />
              <ProgressRow
                label="Approved"
                done={Boolean(mainExpert?.status === "APPROVED")}
              />
              <ProgressRow
                label="Verified"
                done={Boolean(mainExpert?.isVerified)}
              />
              <ProgressRow
                label="Has services"
                done={Boolean(mainExpert && mainExpert.services.length > 0)}
              />
              <ProgressRow
                label="Has availability"
                done={Boolean(mainExpert && mainExpert.availability.length > 0)}
              />
              <ProgressRow
                label="Has reviews"
                done={Boolean(mainExpert && mainExpert.reviews.length > 0)}
              />
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function calculateProfileScore(expert: {
  status: string;
  isVerified: boolean;
  services: unknown[];
  availability: unknown[];
  reviews: unknown[];
  bio: string;
  skills: string[];
  languages: string[];
}) {
  let score = 0;

  if (expert.bio.length > 80) score += 15;
  if (expert.skills.length >= 3) score += 15;
  if (expert.languages.length >= 1) score += 10;
  if (expert.services.length > 0) score += 15;
  if (expert.availability.length > 0) score += 15;
  if (expert.status === "APPROVED") score += 15;
  if (expert.isVerified) score += 10;
  if (expert.reviews.length > 0) score += 5;

  return Math.min(score, 100);
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

function PipelineCard({
  title,
  value,
  text,
  tone,
}: {
  title: string;
  value: string;
  text: string;
  tone: "orange" | "blue" | "green" | "dark";
}) {
  const styles = {
    orange: "bg-[#fff3e8] text-[#f97316]",
    blue: "bg-[#eef4ff] text-[#2563eb]",
    green: "bg-green-100 text-green-700",
    dark: "bg-[#151515] text-white",
  };

  return (
    <div className={`rounded-[2rem] p-6 ${styles[tone]}`}>
      <p className="text-sm font-black opacity-80">{title}</p>
      <p className="mt-4 text-4xl font-black">{value}</p>
      <p className="mt-3 text-sm leading-6 opacity-75">{text}</p>
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

function ProgressRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#e8e1d8] pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-[#6f6a63]">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-black ${
          done ? "bg-green-100 text-green-700" : "bg-[#f7f4ef] text-[#6f6a63]"
        }`}
      >
        {done ? "DONE" : "TODO"}
      </span>
    </div>
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