import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingStatus } from "@prisma/client";

import { createBookingAction } from "@/server/actions/booking.actions";
import { prisma } from "@/lib/prisma";

type BookPageProps = {
  params: Promise<{
    expertId: string;
  }>;
  searchParams: Promise<{
    serviceId?: string;
    payment?: string;
  }>;
};

const BOOKING_STEP_MINUTES = 15;

const activeBookingStatuses: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.PAID,
  BookingStatus.CONFIRMED,
  BookingStatus.DISPUTED,
];

export default async function BookPage({
  params,
  searchParams,
}: BookPageProps) {
  const { expertId } = await params;
  const { serviceId, payment } = await searchParams;

  if (!serviceId) {
    notFound();
  }

  const expert = await prisma.expertProfile.findUnique({
    where: {
      id: expertId,
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
      availability: {
        where: {
          isActive: true,
          endTime: {
            gte: new Date(),
          },
        },
        include: {
          bookings: {
            where: {
              status: {
                in: activeBookingStatuses,
              },
            },
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true,
            },
            orderBy: {
              startTime: "asc",
            },
          },
        },
        orderBy: {
          startTime: "asc",
        },
        take: 30,
      },
    },
  });

  if (!expert || expert.status !== "APPROVED") {
    notFound();
  }

  const service = expert.services.find((item) => item.id === serviceId);

  if (!service) {
    notFound();
  }

  const generatedTimeSlots = generateBookableTimeSlots({
    availability: expert.availability,
    durationMinutes: service.durationMinutes,
  });

  const hasAvailableSlots = generatedTimeSlots.length > 0;

  return (
    <main className="container-page py-10">
      <Link
        href={`/experts/${expert.id}`}
        className="inline-flex rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-bold text-[#6f6a63] transition hover:text-[#151515]"
      >
        ← Back to {expert.user.name}
      </Link>

      {payment === "cancelled" ? (
        <div className="mt-6 rounded-[1.5rem] border border-[#fed7aa] bg-[#fff3e8] p-5">
          <p className="font-black text-[#f97316]">Payment cancelled</p>
          <p className="mt-1 text-sm text-[#6f6a63]">
            No worries. You can review the details and try again.
          </p>
        </div>
      ) : null}

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_430px]">
        <div className="card rounded-[2rem] p-5 sm:rounded-[2.4rem] md:p-9">
          <div className="max-w-2xl">
            <p className="text-sm font-black text-[#2563eb]">Book session</p>

            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
              Reserve your session.
            </h1>

            <p className="mt-4 leading-8 text-[#6f6a63]">
              Choose one of the expert’s available start times. The call will
              be booked for the selected offer duration.
            </p>
          </div>

          <div className="mt-8 rounded-[1.75rem] bg-[#f7f4ef] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f97316] text-xl font-black text-white">
                {expert.user.name?.charAt(0) ?? "E"}
              </div>

              <div className="min-w-0">
                <p className="font-black">{expert.user.name}</p>
                <p className="truncate text-sm text-[#6f6a63]">
                  {expert.headline}
                </p>
              </div>
            </div>
          </div>

          <form action={createBookingAction} className="mt-8 space-y-6">
            <input type="hidden" name="expertId" value={expert.id} />
            <input type="hidden" name="serviceId" value={service.id} />

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Your name">
                <input
                  required
                  name="name"
                  placeholder="Alex Johnson"
                  className="input-field"
                />
              </Field>

              <Field label="Email address">
                <input
                  required
                  type="email"
                  name="email"
                  placeholder="alex@email.com"
                  className="input-field"
                />
              </Field>
            </div>

            <div>
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm font-black">Choose available time</p>
                  <p className="mt-1 text-sm text-[#6f6a63]">
                    Times are generated from the expert’s availability windows.
                  </p>
                </div>

                <Link
                  href="/expert/availability"
                  className="text-sm font-black text-[#2563eb] hover:text-[#1d4ed8]"
                >
                  Manage availability →
                </Link>
              </div>

              {hasAvailableSlots ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {generatedTimeSlots.map((slot, index) => (
                    <label
                      key={`${slot.availabilityId}-${slot.startTime.toISOString()}`}
                      className="cursor-pointer rounded-[1.5rem] border border-[#e8e1d8] bg-white p-4 transition hover:border-[#2563eb] hover:bg-[#eef4ff]"
                    >
                      <input
                        required
                        type="radio"
                        name="timeSlot"
                        value={`${slot.availabilityId}|${slot.startTime.toISOString()}`}
                        defaultChecked={index === 0}
                        className="sr-only peer"
                      />

                      <div className="rounded-[1.25rem] bg-[#f7f4ef] p-4 peer-checked:bg-[#eef4ff]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black">
                              {new Intl.DateTimeFormat("en", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
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

                            <p className="mt-2 text-xs font-bold text-[#9a948b]">
                              Window:{" "}
                              {new Intl.DateTimeFormat("en", {
                                timeStyle: "short",
                              }).format(slot.windowStartTime)}{" "}
                              —{" "}
                              {new Intl.DateTimeFormat("en", {
                                timeStyle: "short",
                              }).format(slot.windowEndTime)}
                            </p>
                          </div>

                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                            AVAILABLE
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[1.5rem] bg-[#fff3e8] p-5">
                  <p className="font-black text-[#f97316]">
                    No available times yet
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                    This expert has no free time that can fit this offer
                    duration. Try another service or come back later.
                  </p>
                  <Link
                    href={`/experts/${expert.id}`}
                    className="mt-4 inline-flex rounded-full bg-[#151515] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#2563eb]"
                  >
                    View services
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-[1.5rem] bg-[#eef4ff] p-5">
              <p className="font-black text-[#2563eb]">Before you continue</p>
              <div className="mt-3 grid gap-3 text-sm text-[#6f6a63] md:grid-cols-3">
                <p>✓ Time reserved for 15 minutes</p>
                <p>✓ Secure checkout</p>
                <p>✓ Video room after payment</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={!hasAvailableSlots}
              className="w-full rounded-2xl bg-[#2563eb] px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#9a948b] disabled:hover:translate-y-0"
            >
              Continue to checkout
            </button>
          </form>
        </div>

        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <div className="card rounded-[2.4rem] p-6">
            <p className="text-sm font-black text-[#f97316]">
              Selected session
            </p>

            <h2 className="mt-3 text-2xl font-black">{service.title}</h2>

            <p className="mt-3 leading-7 text-[#6f6a63]">
              {service.description}
            </p>

            <div className="mt-6 space-y-3 rounded-[1.75rem] bg-[#f7f4ef] p-5">
              <SummaryRow label="Expert" value={expert.user.name ?? "Expert"} />
              <SummaryRow
                label="Duration"
                value={`${service.durationMinutes} min`}
              />
              <SummaryRow
                label="Price"
                value={`€${(service.priceCents / 100).toFixed(2)}`}
              />
              <SummaryRow
                label="Available times"
                value={`${generatedTimeSlots.length}`}
              />
              <SummaryRow label="Payment" value="Secure checkout" />
            </div>

            <div className="mt-6 rounded-[1.75rem] bg-[#151515] p-5 text-white">
              <p className="font-black">What happens next?</p>

              <div className="mt-4 space-y-4 text-sm leading-6 text-white/60">
                <Step number="01" text="We reserve the selected time." />
                <Step number="02" text="You continue to secure checkout." />
                <Step
                  number="03"
                  text="Join the secure video room from your booking."
                />
              </div>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-[#e8e1d8] bg-white p-5">
              <p className="font-black">Need another service?</p>
              <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                Go back to the expert profile and pick a different session.
              </p>
              <Link
                href={`/experts/${expert.id}`}
                className="mt-4 inline-flex rounded-full bg-[#151515] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#2563eb]"
              >
                View services
              </Link>
            </div>
          </div>
        </aside>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#e8e1d8] pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-[#6f6a63]">{label}</span>
      <span className="text-right text-sm font-black">{value}</span>
    </div>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black text-[#f97316]">
        {number}
      </span>
      <span>{text}</span>
    </div>
  );
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function rangesOverlap({
  startA,
  endA,
  startB,
  endB,
}: {
  startA: Date;
  endA: Date;
  startB: Date;
  endB: Date;
}) {
  return startA < endB && endA > startB;
}

function alignToNextStep(date: Date, stepMinutes: number) {
  const alignedDate = new Date(date);
  alignedDate.setSeconds(0, 0);

  const minutes = alignedDate.getMinutes();
  const remainder = minutes % stepMinutes;

  if (remainder !== 0) {
    alignedDate.setMinutes(minutes + (stepMinutes - remainder), 0, 0);
  }

  return alignedDate;
}

function generateBookableTimeSlots({
  availability,
  durationMinutes,
}: {
  availability: {
    id: string;
    startTime: Date;
    endTime: Date;
    bookings: {
      id: string;
      startTime: Date;
      endTime: Date;
      status: BookingStatus;
    }[];
  }[];
  durationMinutes: number;
}) {
  const now = new Date();

  return availability.flatMap((window) => {
    const slots: {
      availabilityId: string;
      startTime: Date;
      endTime: Date;
      windowStartTime: Date;
      windowEndTime: Date;
    }[] = [];

    let cursor = alignToNextStep(window.startTime, BOOKING_STEP_MINUTES);

    while (addMinutes(cursor, durationMinutes) <= window.endTime) {
      const slotStart = new Date(cursor);
      const slotEnd = addMinutes(slotStart, durationMinutes);

      const isFuture = slotStart > now;

      const hasOverlap = window.bookings.some((booking) =>
        rangesOverlap({
          startA: slotStart,
          endA: slotEnd,
          startB: booking.startTime,
          endB: booking.endTime,
        }),
      );

      if (isFuture && !hasOverlap) {
        slots.push({
          availabilityId: window.id,
          startTime: slotStart,
          endTime: slotEnd,
          windowStartTime: window.startTime,
          windowEndTime: window.endTime,
        });
      }

      cursor = addMinutes(cursor, BOOKING_STEP_MINUTES);
    }

    return slots;
  });
}