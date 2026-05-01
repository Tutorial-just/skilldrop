import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function BookingsPage() {
  const bookings = await prisma.booking.findMany({
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

  const totalBookings = bookings.length;
  const paidBookings = bookings.filter((booking) => booking.status === "PAID");
  const pendingBookings = bookings.filter(
    (booking) => booking.status === "PENDING",
  );

  const revenueCents = paidBookings.reduce(
    (sum, booking) => sum + booking.priceCents,
    0,
  );

  return (
    <main className="container-page py-10">
      <section className="rounded-[2rem] bg-[#151515] p-6 text-white sm:rounded-[2.5rem] md:p-10">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black text-[#f97316]">
              SkillDrop dashboard
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Bookings
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/60">
              Track booking requests, payment status and upcoming expert
              sessions.
            </p>
          </div>

          <Link
            href="/experts"
            className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
          >
            Book new session
          </Link>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-4">
          <DashboardStat label="Total bookings" value={`${totalBookings}`} />
          <DashboardStat label="Paid" value={`${paidBookings.length}`} />
          <DashboardStat label="Pending" value={`${pendingBookings.length}`} />
          <DashboardStat label="Paid volume" value={`€${revenueCents / 100}`} />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black">Recent bookings</h2>
            <p className="mt-1 text-sm text-[#6f6a63]">
              Latest session requests created on SkillDrop.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusFilter label="All" active />
            <StatusFilter label="Paid" />
            <StatusFilter label="Pending" />
          </div>
        </div>

        {bookings.length === 0 ? (
          <EmptyBookings />
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/dashboard/bookings/${booking.id}`}
                className="card card-hover block rounded-[2rem] p-5"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
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
                        with{" "}
                        <span className="font-bold text-[#151515]">
                          {booking.expert.user.name}
                        </span>{" "}
                        for{" "}
                        <span className="font-bold text-[#151515]">
                          {booking.buyer.email}
                        </span>
                      </p>

                      <p className="mt-1 text-sm text-[#6f6a63]">
                        Created{" "}
                        {new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(booking.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                    <MiniInfo
                      label="Session"
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
                      value={`€${booking.priceCents / 100}`}
                      highlighted
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function DashboardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white/10 p-5">
      <p className="text-sm text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function StatusFilter({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`rounded-full px-4 py-2 text-sm font-black transition ${
        active
          ? "bg-[#151515] text-white"
          : "border border-[#e8e1d8] bg-white text-[#6f6a63] hover:text-[#151515]"
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-[#fff3e8] text-[#f97316]",
    PAID: "bg-[#eef4ff] text-[#2563eb]",
    CONFIRMED: "bg-[#eef4ff] text-[#2563eb]",
    COMPLETED: "bg-green-100 text-green-700",
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

function EmptyBookings() {
  return (
    <div className="card rounded-[2rem] p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff] text-2xl">
        📅
      </div>

      <h3 className="mt-5 text-2xl font-black">No bookings yet</h3>

      <p className="mx-auto mt-3 max-w-md leading-7 text-[#6f6a63]">
        Book your first expert session and it will appear here with status,
        price and session details.
      </p>

      <Link
        href="/experts"
        className="mt-6 inline-flex rounded-full bg-[#2563eb] px-6 py-3 text-sm font-black text-white transition hover:bg-[#1d4ed8]"
      >
        Find experts
      </Link>
    </div>
  );
}