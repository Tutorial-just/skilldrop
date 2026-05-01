import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RingStat } from "@/components/dashboard/ring-stat";

const problemChips = [
  "CV review",
  "Mock interview",
  "LinkedIn",
  "Remote jobs",
  "React interview",
  "Portfolio feedback",
];

const categories = [
  {
    title: "CV Review",
    href: "/categories/cv-review",
    icon: "📄",
    text: "Improve your CV before applications.",
  },
  {
    title: "Mock Interview",
    href: "/categories/mock-interview",
    icon: "🎤",
    text: "Practice before the real interview.",
  },
  {
    title: "LinkedIn Review",
    href: "/categories/linkedin-review",
    icon: "💼",
    text: "Improve how recruiters see you.",
  },
  {
    title: "Remote Jobs",
    href: "/categories/remote-jobs",
    icon: "🌍",
    text: "Prepare for international roles.",
  },
];

export default async function BuyerDashboardPage() {
  const [bookings, experts] = await Promise.all([
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
      },
      orderBy: {
        startTime: "asc",
      },
      take: 8,
    }),

    prisma.expertProfile.findMany({
      where: {
        status: "APPROVED",
      },
      include: {
        user: true,
        services: {
          where: {
            isActive: true,
          },
          orderBy: {
            priceCents: "asc",
          },
        },
      },
      orderBy: [
        {
          isVerified: "desc",
        },
        {
          rating: "desc",
        },
      ],
      take: 4,
    }),
  ]);

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

  const reviewedBookings = bookings.filter((booking) => booking.review);

  const nextBooking = upcomingBookings[0];

  const progressScore = calculateProgressScore({
    totalBookings: bookings.length,
    completedBookings: completedBookings.length,
    reviewedBookings: reviewedBookings.length,
  });

  const completionRate =
    bookings.length > 0
      ? Math.round((completedBookings.length / bookings.length) * 100)
      : 0;

  const reviewRate =
    completedBookings.length > 0
      ? Math.round((reviewedBookings.length / completedBookings.length) * 100)
      : 0;

  return (
    <main className="container-page py-10">
      <section className="rounded-[2rem] bg-[#151515] p-6 text-white sm:rounded-[2.5rem] md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-sm font-black text-[#f97316]">
              Client workspace
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Find expert help for your next move.
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/60">
              Search by problem, skill, country, language or career goal. Start
              with one clear question and book a focused session.
            </p>

            <form
              action="/experts"
              className="mt-8 rounded-[2rem] bg-white p-3 text-[#151515]"
            >
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  name="query"
                  placeholder="Try: CV for Germany, React interview, LinkedIn..."
                  className="min-h-14 flex-1 rounded-[1.5rem] bg-[#f7f4ef] px-5 text-sm font-medium outline-none placeholder:text-[#9a948b]"
                />

                <button
                  type="submit"
                  className="rounded-[1.5rem] bg-[#2563eb] px-7 py-4 text-sm font-black text-white transition hover:bg-[#1d4ed8]"
                >
                  Search
                </button>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap gap-2">
              {problemChips.map((chip) => (
                <Link
                  key={chip}
                  href={`/experts?query=${encodeURIComponent(chip)}`}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/75 transition hover:bg-white hover:text-[#151515]"
                >
                  {chip}
                </Link>
              ))}
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
                  With {nextBooking.expert.user.name}
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
                  Open session
                </Link>
              </div>
            ) : (
              <div>
                <h2 className="mt-3 text-2xl font-black">
                  No session booked yet
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                  Book your first expert session and start getting practical
                  feedback.
                </p>

                <Link
                  href="/experts"
                  className="mt-4 block rounded-full bg-[#151515] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#2563eb]"
                >
                  Find experts
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-4">
          <DashboardStat label="Upcoming" value={`${upcomingBookings.length}`} />
          <DashboardStat label="Completed" value={`${completedBookings.length}`} />
          <DashboardStat label="Reviewed" value={`${reviewedBookings.length}`} />
          <DashboardStat label="Cancelled" value={`${cancelledBookings.length}`} />
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        <RingStat
          label="Client progress"
          value={progressScore}
          description="Based on booking your first session, completing it and leaving a review."
          tone="blue"
        />

        <RingStat
          label="Completion rate"
          value={completionRate}
          description="How many of your bookings were completed successfully."
          tone={completionRate >= 50 ? "green" : "orange"}
        />

        <RingStat
          label="Review rate"
          value={reviewRate}
          description="Reviews help experts grow and improve marketplace trust."
          tone={reviewRate >= 50 ? "green" : "dark"}
        />
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section>
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-2xl font-black">Start with a problem</h2>
                <p className="mt-1 text-sm text-[#6f6a63]">
                  Choose the type of help you need.
                </p>
              </div>

              <Link
                href="/categories"
                className="w-fit rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
              >
                View all
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {categories.map((category) => (
                <Link
                  key={category.href}
                  href={category.href}
                  className="card card-hover rounded-[2rem] p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef4ff] text-2xl">
                      {category.icon}
                    </div>

                    <span className="rounded-full bg-[#151515] px-4 py-2 text-sm font-black text-white">
                      →
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-black">{category.title}</h3>

                  <p className="mt-2 leading-7 text-[#6f6a63]">
                    {category.text}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-2xl font-black">Recommended experts</h2>
                <p className="mt-1 text-sm text-[#6f6a63]">
                  A few trusted profiles to get started.
                </p>
              </div>

              <Link
                href="/experts"
                className="w-fit rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
              >
                Browse experts
              </Link>
            </div>

            {experts.length === 0 ? (
              <EmptyCard
                icon="🧑‍💼"
                title="No experts available yet"
                text="Approved experts will appear here once the marketplace grows."
              />
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {experts.map((expert) => {
                  const minPrice =
                    expert.services.length > 0
                      ? Math.min(
                          ...expert.services.map(
                            (service) => service.priceCents,
                          ),
                        )
                      : null;

                  return (
                    <Link
                      key={expert.id}
                      href={`/experts/${expert.id}`}
                      className="card card-hover rounded-[2rem] p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f97316] text-xl font-black text-white">
                          {expert.user.name?.charAt(0) ?? "E"}
                        </div>

                        <span className="rounded-full bg-[#eef4ff] px-3 py-1.5 text-sm font-black text-[#2563eb]">
                          ⭐ {expert.rating.toFixed(1)}
                        </span>
                      </div>

                      <div className="mt-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black">
                            {expert.user.name}
                          </h3>

                          {expert.isVerified ? (
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-black text-green-700">
                              VERIFIED
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 min-h-[48px] text-sm leading-6 text-[#6f6a63]">
                          {expert.headline}
                        </p>
                      </div>

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

                      <div className="mt-6 flex items-center justify-between border-t border-[#e8e1d8] pt-5">
                        <div>
                          <p className="text-xs font-bold text-[#6f6a63]">
                            From
                          </p>
                          <p className="text-xl font-black">
                            {minPrice ? `€${minPrice / 100}` : "—"}
                          </p>
                        </div>

                        <span className="rounded-full bg-[#151515] px-5 py-2.5 text-sm font-black text-white">
                          View
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-2xl font-black">Recent bookings</h2>
                <p className="mt-1 text-sm text-[#6f6a63]">
                  Your latest session activity.
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
                text="When you book an expert session, it will appear here."
              />
            ) : (
              <div className="space-y-4">
                {bookings.slice(0, 4).map((booking) => (
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
                          With {booking.expert.user.name}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#eef4ff] px-3 py-1.5 text-xs font-black text-[#2563eb]">
                          €{booking.priceCents / 100}
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
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:h-fit">
          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#f97316]">Quick actions</p>

            <div className="mt-5 grid gap-3">
              <QuickAction
                href="/experts"
                title="Find an expert"
                text="Search by problem, skill or service."
              />
              <QuickAction
                href="/categories"
                title="Choose category"
                text="Start with the type of help you need."
              />
              <QuickAction
                href="/dashboard/bookings"
                title="My bookings"
                text="Track sessions and video calls."
              />
              <QuickAction
                href="/buyer/settings"
                title="Settings"
                text="Update goals and preferences."
              />
            </div>
          </div>

          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#2563eb]">Next steps</p>

            <div className="mt-5 space-y-3 rounded-[1.5rem] bg-[#f7f4ef] p-5">
              <ProgressRow
                label="Book first session"
                done={bookings.length > 0}
              />
              <ProgressRow
                label="Complete session"
                done={completedBookings.length > 0}
              />
              <ProgressRow
                label="Leave review"
                done={reviewedBookings.length > 0}
              />
            </div>
          </div>

          <div className="card rounded-[2rem] p-6">
            <p className="text-sm font-black text-[#2563eb]">Session health</p>

            <div className="mt-5 space-y-3 rounded-[1.5rem] bg-[#f7f4ef] p-5">
              <SummaryRow label="Upcoming" value={`${upcomingBookings.length}`} />
              <SummaryRow label="Completed" value={`${completedBookings.length}`} />
              <SummaryRow label="Reviewed" value={`${reviewedBookings.length}`} />
              <SummaryRow label="Cancelled" value={`${cancelledBookings.length}`} />
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function calculateProgressScore({
  totalBookings,
  completedBookings,
  reviewedBookings,
}: {
  totalBookings: number;
  completedBookings: number;
  reviewedBookings: number;
}) {
  let score = 0;

  if (totalBookings > 0) score += 35;
  if (completedBookings > 0) score += 35;
  if (reviewedBookings > 0) score += 30;

  return score;
}

function DashboardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white/10 p-5">
      <p className="text-sm text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
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

function ProgressRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#e8e1d8] pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-[#6f6a63]">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-black ${
          done ? "bg-green-100 text-green-700" : "bg-white text-[#6f6a63]"
        }`}
      >
        {done ? "DONE" : "TODO"}
      </span>
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

      <p className="mx-auto mt-3 max-w-md leading-7 text-[#6f6a63]">{text}</p>
    </div>
  );
}