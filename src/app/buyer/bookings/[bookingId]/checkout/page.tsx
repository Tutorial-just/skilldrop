import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock3, Euro, ShieldCheck } from "lucide-react";

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

  if (booking.expiresAt && booking.expiresAt < new Date()) {
    redirect(`/buyer/bookings?error=booking-expired&booking=${booking.id}`);
  }

  const providerName = booking.expert.user.name ?? booking.expert.user.email;
  const serviceTitle = booking.service?.title ?? "Booked call";
  const expertCanReceivePayouts = Boolean(booking.expert.stripeAccountId);

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

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.8fr] xl:items-start">
        <Card className="p-6 md:p-8">
          <Badge variant="primary">
            <ShieldCheck size={14} />
            Confirm your booking
          </Badge>

          <h1 className="heading-lg mt-5 max-w-3xl text-balance">
            Review your call before payment.
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
            Your selected time is reserved temporarily. Complete payment to
            confirm the call.
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
            <InfoRow
              label="Duration"
              value={`${getDurationMinutes(
                booking.startTime,
                booking.endTime,
              )} minutes`}
            />
            <InfoRow label="Status" value="Waiting for payment" />
          </div>

          <div className="mt-8 rounded-[26px] border border-[var(--border)] bg-white/64 p-5">
            <Badge variant="accent">
              <Euro size={14} />
              Transparent pricing
            </Badge>

            <p className="mt-4 text-sm font-bold leading-6 text-muted">
              The provider sets the service price. SkillDrop adds a small
              service fee to keep payments, safety tools and the marketplace
              running.
            </p>

            <div className="mt-5 grid gap-3">
              <InfoRow
                label="Service price"
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
          </div>
        </Card>

        <Card soft className="p-6 md:p-8">
          <Badge variant="accent">
            <Euro size={14} />
            Payment
          </Badge>

          <h2 className="mt-5 text-3xl font-black tracking-[-0.05em]">
            {formatMoney(pricing.clientTotalCents)}
          </h2>

          <p className="mt-3 text-sm font-semibold leading-6 text-muted">
            Secure payment through Stripe. The provider receives their earnings
            through Stripe Connect after platform commission.
          </p>

          <div className="mt-6 grid gap-3 rounded-[24px] border border-[var(--border)] bg-white/64 p-4">
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
              label="Total"
              value={formatMoney(pricing.clientTotalCents)}
              strong
            />
          </div>

          {!expertCanReceivePayouts ? (
            <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-black leading-6 text-[var(--danger)]">
              Payment is temporarily unavailable because this provider has not
              completed payout setup yet.
            </div>
          ) : null}

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
            ? "text-lg font-black tracking-[-0.03em]"
            : "text-sm font-black"
        }
      >
        {value}
      </p>
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

  return "Something went wrong. Please try again.";
}