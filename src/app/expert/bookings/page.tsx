import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  completeBookingAction,
  confirmBookingAction,
} from "@/server/actions/booking.actions";
import { createOrOpenCallRoomAction } from "@/server/actions/call.actions";

export default async function ExpertBookingsPage() {
  const bookings = await prisma.booking.findMany({
    include: {
      buyer: true,
      expert: {
        include: {
          user: true,
        },
      },
      service: true,
      callRoom: true,
      review: true,
    },
    orderBy: {
      startTime: "asc",
    },
  });

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

  const revenueCents = bookings
    .filter(
      (booking) =>
        booking.status === "PAID" ||
        booking.status === "CONFIRMED" ||
        booking.status === "COMPLETED",
    )
    .reduce((sum, booking) => sum + booking.priceCents, 0);

  return (
    <main className="container-page py-10">
      <section className="rounded-[2rem] bg-[#151515] p-6 text-white sm:rounded-[2.5rem] md:p-10">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black text-[#f97316]">
              Expert dashboard
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Bookings
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/60">
              Manage session requests, confirm paid bookings, complete sessions
              and join video rooms.
            </p>
          </div>

          <Link
            href="/expert/availability"
            className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
          >
            Manage availability
          </Link>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-4">
          <DashboardStat label="Upcoming" value={`${upcomingBookings.length}`} />
          <DashboardStat label="Completed" value={`${completedBookings.length}`} />
          <DashboardStat label="Cancelled" value={`${cancelledBookings.length}`} />
          <DashboardStat label="Paid volume" value={`€${revenueCents / 100}`} />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black">All expert bookings</h2>
            <p className="mt-1 text-sm text-[#6f6a63]">
              MVP view shows all bookings. Later this will show only the logged-in
              expert’s sessions.
            </p>
          </div>

          <Link
            href="/dashboard/bookings"
            className="rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
          >
            Platform dashboard
          </Link>
        </div>

        {bookings.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-5">
            {bookings.map((booking) => {
              const canConfirm =
                booking.status === "PENDING" || booking.status === "PAID";
              const canComplete =
                booking.status === "PAID" || booking.status === "CONFIRMED";
              const isCancelled = booking.status === "CANCELLED";

              return (
                <article key={booking.id} className="card rounded-[2rem] p-6">
                  <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                    <div>
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-xl font-black text-white">
                          {booking.buyer.name?.charAt(0) ??
                            booking.buyer.email.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-black">
                              {booking.service.title}
                            </h3>
                            <StatusBadge status={booking.status} />
                          </div>

                          <p className="mt-1 text-sm leading-6 text-[#6f6a63]">
                            Buyer:{" "}
                            <span className="font-bold text-[#151515]">
                              {booking.buyer.name ?? booking.buyer.email}
                            </span>
                          </p>

                          <p className="text-sm leading-6 text-[#6f6a63]">
                            Expert:{" "}
                            <span className="font-bold text-[#151515]">
                              {booking.expert.user.name}
                            </span>
                          </p>

                          <p className="mt-3 max-w-3xl leading-7 text-[#6f6a63]">
                            {booking.service.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-3 md:grid-cols-4">
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
                          value={`€${booking.priceCents / 100}`}
                          highlighted
                        />
                        <MiniInfo
                          label="Review"
                          value={booking.review ? "Received" : "—"}
                        />
                      </div>
                    </div>

                    <aside>
                      <div className="rounded-[1.75rem] bg-[#f7f4ef] p-5">
                        <p className="text-sm font-black text-[#f97316]">
                          Expert actions
                        </p>

                        <div className="mt-4 grid gap-2">
                          {canConfirm ? (
                            <form action={confirmBookingAction}>
                              <input
                                type="hidden"
                                name="bookingId"
                                value={booking.id}
                              />
                              <button
                                type="submit"
                                className="w-full rounded-full bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-700"
                              >
                                Confirm booking
                              </button>
                            </form>
                          ) : null}

                          {canComplete ? (
                            <form action={completeBookingAction}>
                              <input
                                type="hidden"
                                name="bookingId"
                                value={booking.id}
                              />
                              <button
                                type="submit"
                                className="w-full rounded-full bg-[#151515] px-5 py-3 text-sm font-black text-white transition hover:bg-[#2563eb]"
                              >
                                Mark completed
                              </button>
                            </form>
                          ) : null}

                          <form action={createOrOpenCallRoomAction}>
                            <input
                              type="hidden"
                              name="bookingId"
                              value={booking.id}
                            />
                            <button
                              type="submit"
                              disabled={isCancelled}
                              className="w-full rounded-full bg-[#2563eb] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#9a948b]"
                            >
                              Join session
                            </button>
                          </form>

                          <Link
                            href={`/dashboard/bookings/${booking.id}`}
                            className="rounded-full border border-[#e8e1d8] bg-white px-5 py-3 text-center text-sm font-black text-[#151515] transition hover:bg-white"
                          >
                            View details
                          </Link>
                        </div>
                      </div>
                    </aside>
                  </div>
                </article>
              );
            })}
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

function EmptyState() {
  return (
    <div className="card rounded-[2rem] p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff] text-2xl">
        📅
      </div>

      <h3 className="mt-5 text-2xl font-black">No expert bookings yet</h3>

      <p className="mx-auto mt-3 max-w-md leading-7 text-[#6f6a63]">
        Once buyers book sessions, expert bookings will appear here.
      </p>

      <Link
        href="/experts"
        className="mt-6 inline-flex rounded-full bg-[#2563eb] px-6 py-3 text-sm font-black text-white transition hover:bg-[#1d4ed8]"
      >
        View marketplace
      </Link>
    </div>
  );
}