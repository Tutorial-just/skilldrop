import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  createAvailabilitySlotAction,
  deleteAvailabilitySlotAction,
} from "@/server/actions/availability.actions";

export default async function ExpertAvailabilityPage() {
  const experts = await prisma.expertProfile.findMany({
    include: {
      user: true,
      availability: {
        orderBy: {
          startTime: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalSlots = experts.reduce(
    (sum, expert) => sum + expert.availability.length,
    0,
  );

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

  return (
    <main className="container-page py-10">
      <section className="rounded-[2rem] bg-[#151515] p-6 text-white sm:rounded-[2.5rem] md:p-10">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black text-[#f97316]">
              Expert dashboard
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Availability
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/60">
              Add available time slots for experts. Buyers will later choose
              from these slots instead of entering any random time.
            </p>
          </div>

          <Link
            href="/experts"
            className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
          >
            View marketplace
          </Link>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          <DashboardStat label="Total slots" value={`${totalSlots}`} />
          <DashboardStat label="Available" value={`${availableSlots}`} />
          <DashboardStat label="Booked" value={`${bookedSlots}`} />
        </div>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <form
            action={createAvailabilitySlotAction}
            className="card rounded-[2rem] p-6"
          >
            <p className="text-sm font-black text-[#2563eb]">
              Add available slot
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Create a time slot
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
              For MVP, choose the expert manually. Later this page will belong
              to the logged-in expert.
            </p>

            <div className="mt-6 space-y-5">
              <Field label="Expert">
                <select required name="expertId" className="input-field">
                  <option value="">Choose expert</option>
                  {experts.map((expert) => (
                    <option key={expert.id} value={expert.id}>
                      {expert.user.name} — {expert.status}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Start time">
                <input
                  required
                  type="datetime-local"
                  name="startTime"
                  className="input-field"
                />
              </Field>

              <Field label="End time">
                <input
                  required
                  type="datetime-local"
                  name="endTime"
                  className="input-field"
                />
              </Field>
            </div>

            <button
              type="submit"
              className="mt-8 w-full rounded-2xl bg-[#2563eb] px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
            >
              Add slot
            </button>
          </form>
        </aside>

        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-black">Slots by expert</h2>
            <p className="mt-1 text-sm text-[#6f6a63]">
              Manage available and booked slots.
            </p>
          </div>

          {experts.length === 0 ? (
            <div className="card rounded-[2rem] p-10 text-center">
              <h3 className="text-2xl font-black">No experts yet</h3>
              <p className="mt-3 text-[#6f6a63]">
                Add expert applications or run seed first.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {experts.map((expert) => (
                <article key={expert.id} className="card rounded-[2rem] p-6">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-xl font-black text-white">
                        {expert.user.name?.charAt(0) ?? "E"}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black">
                            {expert.user.name}
                          </h3>

                          <StatusBadge status={expert.status} />

                          {expert.isVerified ? (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                              VERIFIED
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 text-sm text-[#6f6a63]">
                          {expert.headline}
                        </p>
                      </div>
                    </div>

                    {expert.status === "APPROVED" ? (
                      <Link
                        href={`/experts/${expert.id}`}
                        className="rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
                      >
                        View profile
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-6">
                    {expert.availability.length === 0 ? (
                      <div className="rounded-[1.5rem] bg-[#f7f4ef] p-5">
                        <p className="font-black">No slots yet</p>
                        <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                          Add a slot from the form on the left.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {expert.availability.map((slot) => (
                          <div
                            key={slot.id}
                            className="rounded-[1.5rem] bg-[#f7f4ef] p-5"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-black">
                                  {new Intl.DateTimeFormat("en", {
                                    dateStyle: "medium",
                                  }).format(slot.startTime)}
                                </p>

                                <p className="mt-1 text-sm text-[#6f6a63]">
                                  {new Intl.DateTimeFormat("en", {
                                    timeStyle: "short",
                                  }).format(slot.startTime)}{" "}
                                  —{" "}
                                  {new Intl.DateTimeFormat("en", {
                                    timeStyle: "short",
                                  }).format(slot.endTime)}
                                </p>
                              </div>

                              <SlotBadge isBooked={slot.isBooked} />
                            </div>

                            {!slot.isBooked ? (
                              <form
                                action={deleteAvailabilitySlotAction}
                                className="mt-4"
                              >
                                <input
                                  type="hidden"
                                  name="availabilityId"
                                  value={slot.id}
                                />
                                <button
                                  type="submit"
                                  className="rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-xs font-black text-[#151515] transition hover:bg-red-50 hover:text-red-700"
                                >
                                  Delete slot
                                </button>
                              </form>
                            ) : (
                              <p className="mt-4 text-xs font-bold text-[#6f6a63]">
                                Booked slots cannot be deleted.
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
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
    APPROVED: "bg-[#eef4ff] text-[#2563eb]",
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

function SlotBadge({ isBooked }: { isBooked: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
        isBooked
          ? "bg-[#fff3e8] text-[#f97316]"
          : "bg-green-100 text-green-700"
      }`}
    >
      {isBooked ? "BOOKED" : "AVAILABLE"}
    </span>
  );
}