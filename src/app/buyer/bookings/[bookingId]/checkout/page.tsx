import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Euro,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Video,
  WalletCards,
} from "lucide-react";

import { createCheckoutSessionAction } from "@/server/actions/payment.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { calculatePricingBreakdown } from "@/config/pricing";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookingCountdown } from "@/components/bookings/booking-countdown";

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
  });

  if (!buyer) {
    redirect("/sign-in");
  }

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      buyerId: buyer.id,
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
    redirect("/buyer/bookings");
  }

  if (booking.status !== "PENDING") {
    redirect(`/buyer/bookings?booked=${booking.id}`);
  }

  const now = new Date();

  if (booking.expiresAt && booking.expiresAt < now) {
    redirect(`/buyer/bookings?error=booking-expired&booking=${booking.id}`);
  }

  const providerName = booking.expert.user.name ?? booking.expert.user.email;
  const serviceTitle = booking.service?.title ?? "Booked call";
  const expertCanReceivePayouts = Boolean(booking.expert.stripeAccountId);
  const durationMinutes = getDurationMinutes(booking.startTime, booking.endTime);

  const pricing = calculatePricingBreakdown(booking.priceCents);

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

              {expertCanReceivePayouts ? (
                <Badge variant="success">
                  <WalletCards size={14} />
                  Provider payouts ready
                </Badge>
              ) : (
                <Badge variant="danger">
                  <ShieldAlert size={14} />
                  Provider payouts missing
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
              <InfoRow label="Provider" value={providerName} />
              <InfoRow label="Service" value={serviceTitle} />
              <InfoRow label="Date" value={formatDateTime(booking.startTime)} />
              <InfoRow label="Duration" value={`${durationMinutes} minutes`} />
              <InfoRow label="Status" value="Waiting for payment" />
            </div>
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
              The provider sets the service price. SkillDrop adds a small
              service fee to keep payments, safety tools and the marketplace
              running.
            </p>

            <div className="mt-6 grid gap-3">
              <InfoRow
                label="Provider service price"
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
            Secure payment through Stripe. The provider receives their earnings
            through Stripe Connect after platform commission.
          </p>

          <div className="mt-6 grid gap-3 rounded-[24px] border border-[var(--border)] bg-white/64 p-4">
            <PaymentRow label="Provider" value={providerName} />
            <PaymentRow label="Service" value={serviceTitle} />
            <PaymentRow label="Time" value={formatShortDateTime(booking.startTime)} />
            <PaymentRow label="Duration" value={`${durationMinutes} min`} />
            <div className="h-px bg-[var(--border)]" />
            <PaymentRow
              label="Provider service"
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

          {!expertCanReceivePayouts ? (
            <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-black leading-6 text-[var(--danger)]">
              Payment is temporarily unavailable because this provider has not
              completed payout setup yet. Please choose another provider or try
              again later.
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black leading-6 text-[var(--success)]">
              This provider can receive payouts. You can safely continue to
              Stripe checkout.
            </div>
          )}

          <div className="mt-6 grid gap-3">
            {expertCanReceivePayouts ? (
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
              View provider
            </ButtonLink>

            <ButtonLink href="/buyer/bookings" variant="secondary">
              Back to bookings
            </ButtonLink>
          </div>

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

function getDurationMinutes(startTime: Date, endTime: Date) {
  return Math.max(
    Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60),
    0,
  );
}

function formatMoney(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".00", "")}`;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShortDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCheckoutError(error: string) {
  if (
    error === "provider-payout-not-ready" ||
    error === "expert-payout-not-ready"
  ) {
    return "Payment is temporarily unavailable because this provider has not completed payout setup yet. Please choose another provider or try again later.";
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