import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  cancelBookingAction,
  completeBookingAction,
  confirmBookingAction,
} from "@/server/actions/booking.actions";
import { createOrOpenCallRoomAction } from "@/server/actions/call.actions";
import { createReviewAction } from "@/server/actions/review.actions";

type BookingPageProps = {
  params: Promise<{
    bookingId: string;
  }>;
  searchParams?: Promise<{
    payment?: string;
  }>;
};

export default async function BookingPage({
  params,
  searchParams,
}: BookingPageProps) {
  const { bookingId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const payment = resolvedSearchParams.payment;

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
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
      availability: true,
    },
  });

  if (!booking) {
    notFound();
  }

  const isPaid = booking.status === "PAID";
  const isConfirmed = booking.status === "CONFIRMED";
  const isCompleted = booking.status === "COMPLETED";
  const isCancelled = booking.status === "CANCELLED";

  const canCancel =
    booking.status !== "CANCELLED" && booking.status !== "COMPLETED";

  const canConfirm =
    booking.status === "PENDING" || booking.status === "PAID";

  const canComplete =
    booking.status === "PAID" || booking.status === "CONFIRMED";

  const canReview = booking.status === "COMPLETED";

  return (
    <main className="container-page py-12">
      <div className="mx-auto max-w-5xl">
        <section
          className={`rounded-[2rem] p-6 text-white sm:rounded-[2.5rem] md:p-10 ${
            isCancelled
              ? "bg-[#991b1b]"
              : isCompleted
                ? "bg-green-700"
                : isPaid || isConfirmed
                  ? "bg-[#2563eb]"
                  : "bg-[#151515]"
          }`}
        >
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <div className="inline-flex rounded-full bg-white/12 px-4 py-2 text-sm font-black text-white">
                {getHeroBadge(booking.status)}
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
                {getHeroTitle(booking.status)}
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">
                {getHeroDescription(booking.status)}
              </p>
            </div>

            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white text-4xl md:h-24 md:w-24">
              {getHeroIcon(booking.status)}
            </div>
          </div>
        </section>

        {payment === "success" && !isPaid && !isConfirmed && !isCompleted && !isCancelled ? (
          <div className="mt-6 rounded-[1.5rem] border border-[#e8e1d8] bg-white p-5">
            <p className="font-black text-[#2563eb]">Checkout completed</p>
            <p className="mt-1 text-sm leading-6 text-[#6f6a63]">
              Stripe redirected you back successfully. If the status is still
              PENDING, refresh the page after a few seconds while the webhook
              updates the booking.
            </p>
          </div>
        ) : null}

        {payment === "cancelled" && !isCancelled ? (
          <div className="mt-6 rounded-[1.5rem] border border-[#fed7aa] bg-[#fff3e8] p-5">
            <p className="font-black text-[#f97316]">Checkout cancelled</p>
            <p className="mt-1 text-sm leading-6 text-[#6f6a63]">
              The booking was created before checkout. You can cancel it below
              to release the selected availability slot.
            </p>
          </div>
        ) : null}

        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div className="card rounded-[2rem] p-7">
              <p className="text-sm font-black text-[#f97316]">
                Session details
              </p>

              <h2 className="mt-3 text-3xl font-black">
                {booking.service.title}
              </h2>

              <p className="mt-3 leading-8 text-[#6f6a63]">
                {booking.service.description}
              </p>

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <DetailCard
                  label="Expert"
                  value={booking.expert.user.name ?? "Expert"}
                />
                <DetailCard
                  label="Buyer"
                  value={booking.buyer.name ?? booking.buyer.email}
                />
                <DetailCard
                  label="Date"
                  value={new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                  }).format(booking.startTime)}
                />
                <DetailCard
                  label="Time"
                  value={`${new Intl.DateTimeFormat("en", {
                    timeStyle: "short",
                  }).format(booking.startTime)} — ${new Intl.DateTimeFormat(
                    "en",
                    {
                      timeStyle: "short",
                    },
                  ).format(booking.endTime)}`}
                />
              </div>
            </div>

            <div className="card rounded-[2rem] p-7">
              <p className="text-sm font-black text-[#2563eb]">
                Booking lifecycle
              </p>

              <div className="mt-6 space-y-4">
                <LifecycleStep
                  number="01"
                  title="Created"
                  text="The buyer selected a service and availability slot."
                  active
                />
                <LifecycleStep
                  number="02"
                  title="Paid"
                  text="Stripe checkout confirms the payment."
                  active={isPaid || isConfirmed || isCompleted}
                />
                <LifecycleStep
                  number="03"
                  title="Confirmed"
                  text="The session is accepted and ready to happen."
                  active={isConfirmed || isCompleted}
                />
                <LifecycleStep
                  number="04"
                  title="Completed"
                  text="The session happened and the buyer can leave a review."
                  active={isCompleted}
                />
              </div>
            </div>

            <div className="card rounded-[2rem] p-7">
              <p className="text-sm font-black text-[#f97316]">Review</p>

              {isCancelled ? (
                <ReviewDisabled
                  title="Reviews are disabled"
                  text="Cancelled bookings cannot receive reviews."
                />
              ) : !canReview ? (
                <ReviewDisabled
                  title="Review available after completion"
                  text="Mark the booking as completed before collecting a review."
                />
              ) : booking.review ? (
                <div className="mt-5 rounded-[1.5rem] bg-[#f7f4ef] p-5">
                  <p className="text-2xl font-black">
                    {"⭐".repeat(booking.review.rating)}
                  </p>

                  {booking.review.comment ? (
                    <p className="mt-3 leading-7 text-[#6f6a63]">
                      “{booking.review.comment}”
                    </p>
                  ) : (
                    <p className="mt-3 leading-7 text-[#6f6a63]">
                      No written comment.
                    </p>
                  )}

                  <p className="mt-4 text-sm font-black text-[#151515]">
                    Review submitted
                  </p>
                </div>
              ) : (
                <form action={createReviewAction} className="mt-5 space-y-5">
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <input type="hidden" name="buyerId" value={booking.buyerId} />
                  <input
                    type="hidden"
                    name="expertId"
                    value={booking.expertId}
                  />

                  <div>
                    <label className="text-sm font-black">Rating</label>
                    <select required name="rating" className="input-field mt-2">
                      <option value="">Choose rating</option>
                      <option value="5">5 — Excellent</option>
                      <option value="4">4 — Good</option>
                      <option value="3">3 — Okay</option>
                      <option value="2">2 — Poor</option>
                      <option value="1">1 — Bad</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-black">Comment</label>
                    <textarea
                      name="comment"
                      rows={4}
                      placeholder="What was useful about this session?"
                      className="input-field mt-2 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="rounded-full bg-[#2563eb] px-6 py-3 text-sm font-black text-white transition hover:bg-[#1d4ed8]"
                  >
                    Submit review
                  </button>
                </form>
              )}
            </div>
          </div>

          <aside className="lg:sticky lg:top-28 lg:h-fit">
            <div className="card rounded-[2rem] p-6">
              <p className="text-sm font-black text-[#f97316]">Summary</p>

              <div className="mt-5 space-y-3 rounded-[1.5rem] bg-[#f7f4ef] p-5">
                <SummaryRow label="Status" value={booking.status} />
                <SummaryRow
                  label="Price"
                  value={`€${booking.priceCents / 100}`}
                />
                <SummaryRow
                  label="Duration"
                  value={`${booking.service.durationMinutes} min`}
                />
                <SummaryRow
                  label="Currency"
                  value={booking.currency.toUpperCase()}
                />
                <SummaryRow
                  label="Slot"
                  value={booking.availabilityId ? "Linked" : "Not linked"}
                />
              </div>

              <div className="mt-6 rounded-[1.5rem] bg-[#eef4ff] p-5">
                <p className="font-black text-[#2563eb]">
                  {getStatusLabel(booking.status)}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#6f6a63]">
                  {getStatusDescription(booking.status)}
                </p>
              </div>

              {booking.callRoom ? (
                <div className="mt-6 rounded-[1.5rem] bg-green-50 p-5">
                  <p className="font-black text-green-700">Video room ready</p>
                  <p className="mt-2 text-sm leading-6 text-green-800">
                    A video room has already been created for this booking.
                  </p>
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3">
                {canConfirm ? (
                  <form action={confirmBookingAction}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button
                      type="submit"
                      className="w-full rounded-full bg-green-600 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-green-700"
                    >
                      Confirm booking
                    </button>
                  </form>
                ) : null}

                {canComplete ? (
                  <form action={completeBookingAction}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button
                      type="submit"
                      className="w-full rounded-full bg-[#151515] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#2563eb]"
                    >
                      Mark as completed
                    </button>
                  </form>
                ) : null}

                {canCancel ? (
                  <form action={cancelBookingAction}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button
                      type="submit"
                      className="w-full rounded-full border border-red-200 bg-red-50 px-5 py-3 text-center text-sm font-black text-red-700 transition hover:bg-red-100"
                    >
                      Cancel booking & release slot
                    </button>
                  </form>
                ) : null}

                <form action={createOrOpenCallRoomAction}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <button
                    type="submit"
                    disabled={isCancelled}
                    className="w-full rounded-full bg-[#2563eb] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#9a948b]"
                  >
                    Join session
                  </button>
                </form>

                <Link
                  href="/dashboard/bookings"
                  className="rounded-full bg-[#151515] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#2563eb]"
                >
                  View all bookings
                </Link>

                <Link
                  href="/experts"
                  className="rounded-full border border-[#e8e1d8] bg-white px-5 py-3 text-center text-sm font-black text-[#151515] transition hover:bg-[#f7f4ef]"
                >
                  Book another session
                </Link>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-[#f7f4ef] p-5">
      <p className="text-sm font-bold text-[#6f6a63]">{label}</p>
      <p className="mt-2 font-black">{value}</p>
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

function LifecycleStep({
  number,
  title,
  text,
  active,
}: {
  number: string;
  title: string;
  text: string;
  active: boolean;
}) {
  return (
    <div
      className={`flex gap-4 rounded-[1.5rem] p-5 ${
        active ? "bg-[#eef4ff]" : "bg-[#f7f4ef]"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${
          active ? "bg-[#2563eb] text-white" : "bg-[#151515] text-white"
        }`}
      >
        {number}
      </div>

      <div>
        <p className="font-black">{title}</p>
        <p className="mt-1 leading-6 text-[#6f6a63]">{text}</p>
      </div>
    </div>
  );
}

function ReviewDisabled({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-5 rounded-[1.5rem] bg-[#f7f4ef] p-5">
      <p className="font-black">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#6f6a63]">{text}</p>
    </div>
  );
}

function getHeroBadge(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Booking created",
    PAID: "Payment confirmed",
    CONFIRMED: "Booking confirmed",
    COMPLETED: "Session completed",
    CANCELLED: "Booking cancelled",
  };

  return labels[status] ?? status;
}

function getHeroTitle(status: string) {
  const titles: Record<string, string> = {
    PENDING: "Your session request is created.",
    PAID: "Your session is paid and ready.",
    CONFIRMED: "Your session is confirmed.",
    COMPLETED: "This session is completed.",
    CANCELLED: "This session has been cancelled.",
  };

  return titles[status] ?? "Booking details";
}

function getHeroDescription(status: string) {
  const descriptions: Record<string, string> = {
    PENDING:
      "Your booking is saved. If you used checkout, payment confirmation may take a few seconds to update.",
    PAID: "Your payment is confirmed. The expert can now confirm the session.",
    CONFIRMED:
      "The session is confirmed. You can join the video room when it is time.",
    COMPLETED:
      "The session is marked as completed. The buyer can now leave a review.",
    CANCELLED:
      "The booking is cancelled. If it was linked to an availability slot, that slot has been released.",
  };

  return descriptions[status] ?? "Review the session details below.";
}

function getHeroIcon(status: string) {
  const icons: Record<string, string> = {
    PENDING: "🕒",
    PAID: "✅",
    CONFIRMED: "📌",
    COMPLETED: "🏁",
    CANCELLED: "✕",
  };

  return icons[status] ?? "📅";
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pending booking",
    PAID: "Paid booking",
    CONFIRMED: "Confirmed booking",
    COMPLETED: "Completed booking",
    CANCELLED: "Cancelled booking",
  };

  return labels[status] ?? "Booking status";
}

function getStatusDescription(status: string) {
  const descriptions: Record<string, string> = {
    PENDING: "This booking is created but not yet marked as paid.",
    PAID: "This booking is marked as paid in the database.",
    CONFIRMED: "This booking is confirmed and ready for the session.",
    COMPLETED: "This booking is completed and can receive a review.",
    CANCELLED:
      "This booking is cancelled and the availability slot is released.",
  };

  return descriptions[status] ?? "Current booking status.";
}