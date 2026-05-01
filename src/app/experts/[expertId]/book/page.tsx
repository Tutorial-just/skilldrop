import Link from "next/link";
import { notFound } from "next/navigation";
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
          isBooked: false,
          startTime: {
            gte: new Date(),
          },
        },
        orderBy: {
          startTime: "asc",
        },
        take: 12,
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

  const hasAvailableSlots = expert.availability.length > 0;

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
              Enter your details and choose one of the expert’s available time
              slots. You’ll continue to secure checkout after this step.
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
                  <p className="text-sm font-black">Choose available slot</p>
                  <p className="mt-1 text-sm text-[#6f6a63]">
                    These slots are created by the expert.
                  </p>
                </div>

                <Link
                  href="/expert/availability"
                  className="text-sm font-black text-[#2563eb] hover:text-[#1d4ed8]"
                >
                  Manage slots →
                </Link>
              </div>

              {hasAvailableSlots ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {expert.availability.map((slot, index) => (
                    <label
                      key={slot.id}
                      className="cursor-pointer rounded-[1.5rem] border border-[#e8e1d8] bg-white p-4 transition hover:border-[#2563eb] hover:bg-[#eef4ff]"
                    >
                      <input
                        required
                        type="radio"
                        name="availabilityId"
                        value={slot.id}
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
                    No available slots yet
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                    This expert has no open time slots. Add slots from the
                    expert availability page, then come back to booking.
                  </p>
                  <Link
                    href="/expert/availability"
                    className="mt-4 inline-flex rounded-full bg-[#151515] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#2563eb]"
                  >
                    Add availability
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-[1.5rem] bg-[#eef4ff] p-5">
              <p className="font-black text-[#2563eb]">Before you continue</p>
              <div className="mt-3 grid gap-3 text-sm text-[#6f6a63] md:grid-cols-3">
                <p>✓ Slot reserved</p>
                <p>✓ Secure checkout</p>
                <p>✓ Video room after booking</p>
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
              <SummaryRow
                label="Expert"
                value={expert.user.name ?? "Expert"}
              />
              <SummaryRow
                label="Duration"
                value={`${service.durationMinutes} min`}
              />
              <SummaryRow
                label="Price"
                value={`€${service.priceCents / 100}`}
              />
              <SummaryRow
                label="Available slots"
                value={`${expert.availability.length}`}
              />
              <SummaryRow label="Payment" value="Secure checkout" />
            </div>

            <div className="mt-6 rounded-[1.75rem] bg-[#151515] p-5 text-white">
              <p className="font-black">What happens next?</p>

              <div className="mt-4 space-y-4 text-sm leading-6 text-white/60">
                <Step number="01" text="We reserve the selected slot." />
                <Step number="02" text="You continue to secure checkout." />
                <Step number="03" text="Join the Jitsi video room from your booking." />
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