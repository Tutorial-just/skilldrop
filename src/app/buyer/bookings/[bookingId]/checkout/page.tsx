import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Euro,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { BookingStatus } from "@prisma/client";
import { createCheckoutSessionAction } from "@/server/actions/payment.actions";
import { releaseExpiredPendingBookings } from "@/server/actions/booking.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { calculatePricingBreakdown } from "@/config/pricing";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookingCountdown } from "@/components/bookings/booking-countdown";
import {
  formatDateTime,
  formatShortDateTime,
  getDurationMinutes,
  getUserTimezone,
} from "@/lib/date-time";

type CheckoutPageProps = {
  params: Promise<{
    bookingId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function BookingCheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  await releaseExpiredPendingBookings();

  const { bookingId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const { user } = await requireRole(["buyer", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const buyer = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      buyerSettings: true,
    },
  });

  if (!buyer) {
    redirect("/sign-in");
  }

  const userTimezone = getUserTimezone(buyer.buyerSettings?.preferredTimezone);

  const booking = await prisma.booking.findFirst({
    where: {
       id: bookingId,
       ...(buyer.role === "ADMIN"
        ? {}
        : {
          buyerId: buyer.id,
        }),
    },
    include: {
      expert: {
        include: {
          user: true,
        },
      },
      service: true,
      callRoom: true,
    },
  });

  if (!booking) {
    redirect("/buyer/bookings?error=booking-not-found");
  }

  if (booking.status !== BookingStatus.PENDING) {
     if (booking.status === BookingStatus.CONFIRMED && booking.callRoom) {
       redirect(`/calls/${booking.id}`);
     }
     redirect(`/buyer/bookings?booked=${booking.id}`);
   }

  const now = new Date();

  if (booking.expiresAt && booking.expiresAt < now) {
    redirect(`/buyer/bookings?error=booking-expired&booking=${booking.id}`);
  }

  const helperName = booking.expert.user.name ?? booking.expert.user.email;
  const serviceTitle = booking.service?.title ?? "Booked call";
  const helperCanReceivePayouts =
    Boolean(booking.expert.stripeAccountId) &&
    booking.expert.stripeChargesEnabled &&
    booking.expert.stripePayoutsEnabled &&
    booking.expert.stripeDetailsSubmitted;
  const durationMinutes = getDurationMinutes(booking.startTime, booking.endTime);
  const bookingNote = booking.note?.trim() || "";

  const pricing = getBookingPricing(booking);

  return (
    <main className="p-6 md:p-8 lg:p-10">
      <Link
        href="/buyer/bookings"
        className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
      >
        <ArrowLeft size={16} />
        Back to bookings
      </Link>

      {resolvedSearchParams.error ? (
        <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-black text-[var(--danger)]">
          {formatCheckoutError(resolvedSearchParams.error)}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_390px] xl:items-start">
        <div className="grid gap-6">
          <Card className="p-6 md:p-8">
            <div className="flex flex-wrap gap-2">
              <Badge variant="primary">
                <ShieldCheck size={14} />
                Secure checkout
              </Badge>

              <Badge variant="accent">
                <Clock3 size={14} />
                Slot temporarily reserved
              </Badge>

              {helperCanReceivePayouts ? (
                <Badge variant="success">
                  <WalletCards size={14} />
                  Helper payouts ready
                </Badge>
              ) : (
                <Badge variant="danger">
                  <ShieldAlert size={14} />
                  Helper payouts missing
                </Badge>
              )}
            </div>

            <h1 className="heading-lg mt-5 max-w-3xl text-balance">
              Review your call before payment.
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
              Your selected time is reserved temporarily. Complete payment to
              confirm the booking and prepare your call room.
            </p>

            {booking.expiresAt ? (
              <div className="mt-6">
                <BookingCountdown expiresAt={booking.expiresAt.toISOString()} />
              </div>
            ) : null}

            <div className="mt-8 grid gap-4">
              <InfoRow label="Helper" value={helperName} />
              <InfoRow label="Offer" value={serviceTitle} />
              <InfoRow 
                label="Date" 
                value={formatDateTime(booking.startTime, userTimezone)}
               />
              <InfoRow label="Duration" value={`${durationMinutes} minutes`} />
              <InfoRow label="Status" value="Waiting for payment" />
            </div>
          </Card>

          <Card className="p-6 md:p-8">
            <Badge variant="primary">
              <MessageCircle size={14} />
              Your note for the helper
            </Badge>

            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
              What you need help with
            </h2>

            {bookingNote ? (
              <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-white/64 p-5">
                <p className="whitespace-pre-wrap text-sm font-bold leading-7 text-[var(--foreground)]">
                  {bookingNote}
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-dashed border-[var(--border-strong)] bg-white/55 p-5">
                <p className="text-sm font-bold leading-7 text-muted">
                  No note was added. The helper will still receive your booking
                  details after payment.
                </p>
              </div>
            )}

            <p className="mt-4 text-sm font-semibold leading-6 text-muted">
              This note helps the helper prepare before the call. You can add
              more context directly during the session.
            </p>
          </Card>

          <Card className="p-6 md:p-8">
            <Badge variant="accent">
              <Euro size={14} />
              Transparent pricing
            </Badge>

            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
              No hidden fees
            </h2>

            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-muted">
              The helper sets the offer price. SkillDrop adds a small service
              fee to keep payments, safety tools and the marketplace running.
            </p>

            <div className="mt-6 grid gap-3">
              <InfoRow
                label="Helper offer price"
                value={formatMoney(pricing.servicePriceCents)}
              />

              <InfoRow
                label="SkillDrop service fee"
                value={formatMoney(pricing.clientServiceFeeCents)}
              />

              <InfoRow
                label="Total today"
                value={formatMoney(pricing.clientTotalCents)}
                strong
              />
            </div>
          </Card>

          <Card className="p-6 md:p-8">
            <Badge variant="success">
              <CheckCircle2 size={14} />
              What happens after payment
            </Badge>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Step
                number="1"
                title="Booking confirmed"
                text="Your time slot becomes confirmed and appears in your bookings."
              />

              <Step
                number="2"
                title="Call room prepared"
                text="You will get access to the call page for the scheduled session."
              />

              <Step
                number="3"
                title="Review after call"
                text="After the call, you can leave feedback to keep SkillDrop trustworthy."
              />
            </div>
          </Card>

          <Card soft className="p-6 md:p-8">
            <Badge variant="accent">
              <Sparkles size={14} />
              Before you pay
            </Badge>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <TrustPoint
                title="Prepare one clear question"
                text="Short calls work best when you know exactly what you want to solve."
              />

              <TrustPoint
                title="Check the time carefully"
                text="Make sure the selected date and time work for you before paying."
              />

              <TrustPoint
                title="Payment confirms the slot"
                text="The slot is only guaranteed after checkout is completed successfully."
              />

              <TrustPoint
                title="Use your bookings page"
                text="After payment, you can find the session from your buyer bookings page."
              />
            </div>
          </Card>
        </div>

        <Card soft className="p-6 md:p-8 xl:sticky xl:top-[96px]">
          <Badge variant="primary">
            <Euro size={14} />
            Final payment
          </Badge>

          <h2 className="mt-5 text-4xl font-black tracking-[-0.06em]">
            {formatMoney(pricing.clientTotalCents)}
          </h2>

          <p className="mt-3 text-sm font-semibold leading-6 text-muted">
            Secure payment through Stripe. The helper receives their earnings
            through Stripe Connect after platform commission.
          </p>

          <div className="mt-6 grid gap-3 rounded-[24px] border border-[var(--border)] bg-white/64 p-4">
            <PaymentRow label="Helper" value={helperName} />
            <PaymentRow label="Offer" value={serviceTitle} />
            <PaymentRow
              label="Time"
              value={formatShortDateTime(booking.startTime, userTimezone)}
            />
            <PaymentRow label="Duration" value={`${durationMinutes} min`} />

            <div className="h-px bg-[var(--border)]" />

            <PaymentRow
              label="Helper offer"
              value={formatMoney(pricing.servicePriceCents)}
            />

            <PaymentRow
              label="SkillDrop fee"
              value={formatMoney(pricing.clientServiceFeeCents)}
            />

            <div className="h-px bg-[var(--border)]" />

            <PaymentRow
              label="Total today"
              value={formatMoney(pricing.clientTotalCents)}
              strong
            />
          </div>

          {bookingNote ? (
            <div className="mt-5 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
              <div className="flex gap-3">
                <MessageCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-[var(--primary-dark)]"
                />

                <div>
                  <p className="text-sm font-black">Your note</p>

                  <p className="mt-1 line-clamp-4 text-sm font-bold leading-6 text-muted">
                    {bookingNote}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {!helperCanReceivePayouts ? (
            <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-black leading-6 text-[var(--danger)]">
              Payment is temporarily unavailable because this helper has not
              completed payout setup yet. Please choose another helper or try
              again later.
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black leading-6 text-[var(--success)]">
              This helper can receive payouts. You can safely continue to Stripe
              checkout.
            </div>
          )}

          <div className="mt-6 grid gap-3">
            {helperCanReceivePayouts ? (
              <form
                action={async () => {
                  "use server";

                  await createCheckoutSessionAction(booking.id);
                }}
              >
                <button type="submit" className="btn btn-primary w-full">
                  Pay {formatMoney(pricing.clientTotalCents)} & confirm booking
                </button>
              </form>
            ) : null}

            <ButtonLink href={`/experts/${booking.expertId}`} variant="secondary">
              View helper
            </ButtonLink>

            <ButtonLink href="/buyer/bookings" variant="secondary">
              Back to bookings
            </ButtonLink>
          </div>

          <p className="mt-4 text-center text-xs font-bold leading-5 text-muted">
            By paying, you agree to SkillDrop{" "}
            <Link href="/legal/terms" className="text-[var(--primary-dark)]">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/legal/refunds" className="text-[var(--primary-dark)]">
              Refund Policy
            </Link>
            .
          </p>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
            <div className="flex gap-3">
              <Clock3 size={18} className="mt-0.5 text-[var(--primary-dark)]" />

              <p className="text-sm font-bold leading-6 text-muted">
                Your slot is held only while the countdown is active. If payment
                is not completed in time, the slot becomes available again.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
            <div className="flex gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 text-[var(--primary-dark)]"
              />

              <p className="text-sm font-bold leading-6 text-muted">
                Stripe handles card payment details. SkillDrop confirms the
                booking only after payment succeeds.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

function InfoRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <p className="text-sm font-bold text-muted">{label}</p>

      <p
        className={
          strong
            ? "text-right text-base font-black text-[var(--primary-dark)]"
            : "text-right text-sm font-black"
        }
      >
        {value}
      </p>
    </div>
  );
}

function PaymentRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p
        className={
          strong
            ? "text-sm font-black text-[var(--foreground)]"
            : "text-sm font-bold text-muted"
        }
      >
        {label}
      </p>

      <p
        className={
          strong
            ? "text-right text-lg font-black tracking-[-0.03em]"
            : "text-right text-sm font-black"
        }
      >
        {value}
      </p>
    </div>
  );
}

function Step({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-sm font-black text-[var(--primary-dark)]">
        {number}
      </div>

      <p className="mt-4 font-black tracking-[-0.02em]">{title}</p>

      <p className="mt-2 text-sm font-semibold leading-6 text-muted">{text}</p>
    </div>
  );
}

function TrustPoint({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2
          size={18}
          className="mt-0.5 shrink-0 text-[var(--success)]"
        />

        <div>
          <p className="font-black tracking-[-0.02em]">{title}</p>

          <p className="mt-1 text-sm font-semibold leading-6 text-muted">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

function getBookingPricing(booking: {
  priceCents: number;
  platformFeeCents: number | null;
  providerNetCents: number | null;
  clientServiceFeeCents: number | null;
  clientTotalCents: number | null;
}) {
  const fallback = calculatePricingBreakdown(booking.priceCents);

  return {
    servicePriceCents: booking.priceCents,

    providerCommissionCents:
      booking.platformFeeCents ?? fallback.providerCommissionCents,

    providerNetCents: booking.providerNetCents ?? fallback.providerNetCents,

    clientServiceFeeCents:
      booking.clientServiceFeeCents ?? fallback.clientServiceFeeCents,

    clientTotalCents: booking.clientTotalCents ?? fallback.clientTotalCents,
  };
}



function formatMoney(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".00", "")}`;
}



function formatCheckoutError(error: string) {
  if (
    error === "provider-payout-not-ready" ||
    error === "expert-payout-not-ready"
  ) {
    return "Payment is temporarily unavailable because this helper has not completed payout setup yet. Please choose another helper or try again later.";
  }

  if (error === "booking-not-found") {
    return "This booking could not be found.";
  }

  if (error === "booking-not-pending") {
    return "This booking is no longer waiting for payment.";
  }

  if (error === "booking-expired") {
    return "This booking expired because payment was not completed in time.";
  }

  if (error === "checkout-session-failed") {
    return "Could not start payment. Please try again.";
  }

  if (error === "stripe-not-configured") {
    return "Payment is not configured yet. Please try again later.";
  }

  return "Something went wrong. Please try again.";
}