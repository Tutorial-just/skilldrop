import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Euro,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  createStripeConnectAccountAction,
  openStripeDashboardAction,
} from "@/server/actions/stripe-connect.actions";
import { calculatePricingBreakdown } from "@/config/pricing";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ExpertEarningsPageProps = {
  searchParams?: Promise<{
    stripe?: string;
  }>;
};

export default async function ExpertEarningsPage({
  searchParams,
}: ExpertEarningsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { user } = await requireRole(["expert", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      expertProfile: true,
    },
  });

  if (!currentUser) {
    redirect("/sign-in");
  }

  if (!currentUser.expertProfile) {
    redirect("/become-expert");
  }

  const bookings = await prisma.booking.findMany({
    where: {
      expertId: currentUser.expertProfile.id,
      status: {
        in: ["CONFIRMED", "COMPLETED"],
      },
    },
    include: {
      buyer: true,
      service: true,
      review: true,
    },
    orderBy: {
      startTime: "desc",
    },
  });

  const completedBookings = bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const confirmedBookings = bookings.filter(
    (booking) => booking.status === "CONFIRMED",
  );

  const grossCompletedCents = completedBookings.reduce(
    (sum, booking) => sum + booking.priceCents,
    0,
  );

  const platformCommissionCompletedCents = completedBookings.reduce(
    (sum, booking) =>
      sum +
      (booking.platformFeeCents ??
        calculatePricingBreakdown(booking.priceCents).providerCommissionCents),
    0,
  );

  const netCompletedCents = completedBookings.reduce(
    (sum, booking) =>
      sum +
      (booking.providerNetCents ??
        calculatePricingBreakdown(booking.priceCents).providerNetCents),
    0,
  );

  const upcomingGrossCents = confirmedBookings.reduce(
    (sum, booking) => sum + booking.priceCents,
    0,
  );

  const upcomingNetCents = confirmedBookings.reduce(
    (sum, booking) =>
      sum +
      (booking.providerNetCents ??
        calculatePricingBreakdown(booking.priceCents).providerNetCents),
    0,
  );

  const stripeAccountId = currentUser.expertProfile.stripeAccountId;
  const hasStripeAccount = Boolean(stripeAccountId);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <Link
            href="/expert"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>

          {resolvedSearchParams.stripe === "connected" ? (
            <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black text-[var(--success)]">
              Stripe onboarding completed. Your payout account is connected.
            </div>
          ) : null}

          {resolvedSearchParams.stripe === "refresh" ? (
            <div className="mt-6 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-4 text-sm font-black text-[var(--accent)]">
              Stripe onboarding was refreshed. Please continue setup.
            </div>
          ) : null}

          <Badge variant="primary" className="mt-8">
            <WalletCards size={14} />
            Earnings
          </Badge>

          <h1 className="heading-lg mt-5 max-w-4xl text-balance">
            Track your SkillDrop earnings.
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
            See completed paid calls, SkillDrop commission, payout-ready
            estimates and upcoming confirmed value.
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Euro}
              label="Gross completed"
              value={formatMoney(grossCompletedCents)}
              hint="Completed calls only"
            />

            <MetricCard
              icon={ShieldCheck}
              label="SkillDrop commission"
              value={formatMoney(platformCommissionCompletedCents)}
              hint="10% provider commission"
            />

            <MetricCard
              icon={WalletCards}
              label="Payout-ready estimate"
              value={formatMoney(netCompletedCents)}
              hint="Completed calls minus commission"
            />

            <MetricCard
              icon={CalendarDays}
              label="Upcoming net"
              value={formatMoney(upcomingNetCents)}
              hint={`${formatMoney(upcomingGrossCents)} gross confirmed`}
            />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-start">
          <Card className="p-5 md:p-6">
            <Badge variant="accent">
              <CheckCircle2 size={14} />
              Paid call history
            </Badge>

            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
              Completed and confirmed calls
            </h2>

            <p className="mt-2 text-sm font-semibold leading-6 text-muted">
              Completed calls count toward payout-ready earnings. Confirmed calls
              are upcoming value until the call is completed.
            </p>

            <div className="mt-6 grid gap-4">
              {bookings.length > 0 ? (
                bookings.map((booking) => (
                  <EarningBookingCard key={booking.id} booking={booking} />
                ))
              ) : (
                <EmptyState
                  title="No earnings yet"
                  text="Confirmed and completed paid calls will appear here."
                />
              )}
            </div>
          </Card>

          <div className="grid gap-6">
            <Card className="p-5 md:p-6">
              <Badge variant={hasStripeAccount ? "success" : "primary"}>
                <ShieldCheck size={14} />
                Payout status
              </Badge>

              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                {hasStripeAccount
                  ? "Stripe account connected."
                  : "Connect your Stripe account."}
              </h2>

              <p className="mt-3 text-sm font-semibold leading-6 text-muted">
                Connect Stripe to prepare for real payouts. Stripe handles
                onboarding, identity verification and payout setup.
              </p>

              <div className="mt-5 grid gap-3">
                <InfoRow label="Provider commission" value="10%" />
                <InfoRow label="Payout provider" value="Stripe Connect" />
                <InfoRow
                  label="Payout status"
                  value={hasStripeAccount ? "Connected" : "Not connected"}
                />
              </div>

              {stripeAccountId ? (
                <p className="mt-5 break-all rounded-2xl border border-[var(--border)] bg-white/64 p-3 text-xs font-bold text-muted">
                  Stripe account: {maskStripeAccountId(stripeAccountId)}
                </p>
              ) : null}

              <form action={createStripeConnectAccountAction} className="mt-5">
                <button type="submit" className="btn btn-primary w-full">
                  {hasStripeAccount
                    ? "Continue Stripe setup"
                    : "Connect Stripe account"}
                </button>
              </form>

              <form action={openStripeDashboardAction}>
                <button type="submit" className="btn btn-secondary w-full">
                   Open Stripe dashboard
                </button>
              </form>
            </Card>

            <Card soft className="p-5 md:p-6">
              <Badge variant="accent">
                <WalletCards size={14} />
                Good to know
              </Badge>

              <p className="mt-4 text-sm font-bold leading-6 text-muted">
                Client service fees are paid by clients on top of the service
                price. They are not deducted from your provider earnings.
              </p>

              <p className="mt-3 text-sm font-bold leading-6 text-muted">
                Earnings become payout-ready only after a call is completed.
                Cancelled, refunded or disputed bookings do not count as
                payout-ready.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

function EarningBookingCard({
  booking,
}: {
  booking: {
    id: string;
    startTime: Date;
    endTime: Date;
    status: string;
    priceCents: number;
    platformFeeCents: number | null;
    providerNetCents: number | null;
    clientServiceFeeCents: number | null;
    clientTotalCents: number | null;
    buyer: {
      email: string;
      name: string | null;
    };
    service: {
      title: string;
      durationMinutes: number;
    } | null;
    review: {
      id: string;
      rating: number;
    } | null;
  };
}) {
  const fallbackPricing = calculatePricingBreakdown(booking.priceCents);

  const platformFeeCents =
    booking.platformFeeCents ?? fallbackPricing.providerCommissionCents;

  const providerNetCents =
    booking.providerNetCents ?? fallbackPricing.providerNetCents;

  const clientServiceFeeCents =
    booking.clientServiceFeeCents ?? fallbackPricing.clientServiceFeeCents;

  const clientTotalCents =
    booking.clientTotalCents ?? fallbackPricing.clientTotalCents;

  const isCompleted = booking.status === "COMPLETED";

  return (
    <div className="rounded-[26px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={booking.status} />

            {isCompleted ? (
              <Badge variant="success">Payout-ready estimate</Badge>
            ) : (
              <Badge variant="primary">Upcoming value</Badge>
            )}

            {booking.review ? (
              <Badge variant="success">Reviewed {booking.review.rating}/5</Badge>
            ) : null}
          </div>

          <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
            {booking.service?.title ?? "Booked call"}
          </h3>

          <p className="mt-2 text-sm font-semibold leading-6 text-muted">
            Buyer: {booking.buyer.name ?? booking.buyer.email}
          </p>

          <p className="mt-3 inline-flex items-center gap-2 text-sm font-black text-muted">
            <Clock3 size={14} />
            {formatDateTime(booking.startTime)}
          </p>
        </div>

        <div className="grid min-w-[240px] gap-2 rounded-[22px] border border-[var(--border)] bg-white/64 p-4">
          <InfoRow label="Service price" value={formatMoney(booking.priceCents)} />
          <InfoRow
            label="SkillDrop commission"
            value={formatMoney(platformFeeCents)}
          />
          <InfoRow
            label={isCompleted ? "Net estimate" : "Net if completed"}
            value={formatMoney(providerNetCents)}
          />

          <div className="my-1 h-px bg-[var(--border)]" />

          <InfoRow
            label="Client service fee"
            value={formatMoney(clientServiceFeeCents)}
          />
          <InfoRow label="Client paid" value={formatMoney(clientTotalCents)} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Euro;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card soft className="p-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={20} />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{value}</p>

      <p className="mt-1 text-sm font-semibold text-muted">{hint}</p>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="text-right text-sm font-black">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return <Badge variant="success">Completed</Badge>;
  }

  if (status === "CONFIRMED") {
    return <Badge variant="primary">Confirmed</Badge>;
  }

  return <Badge variant="accent">{status.toLowerCase()}</Badge>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-white/55 p-7 text-center">
      <h3 className="text-2xl font-black tracking-[-0.04em]">{title}</h3>

      <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-muted">
        {text}
      </p>
    </div>
  );
}

function maskStripeAccountId(accountId: string) {
  if (accountId.length <= 8) {
    return "••••";
  }

  return `${accountId.slice(0, 7)}••••${accountId.slice(-4)}`;
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