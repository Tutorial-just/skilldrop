import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Euro,
  ExternalLink,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  createStripeConnectAccountAction,
  openStripeDashboardAction,
  refreshStripeConnectStatusAction,
} from "@/server/actions/stripe-connect.actions";
import {
  calculatePricingBreakdown,
  formatMoneyFromCents,
} from "@/config/pricing";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ExpertEarningsPageProps = {
  searchParams?: Promise<{
    stripe?: string;
    error?: string;
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

  const expert = currentUser.expertProfile;
  const stripeStatus = await getStripeStatus(expert.stripeAccountId);

  const bookings = await prisma.booking.findMany({
    where: {
      expertId: expert.id,
      status: {
        in: ["PAID", "CONFIRMED", "COMPLETED"],
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

  const paidBookings = bookings.filter((booking) => booking.status === "PAID");

  const completedTotals = calculateEarningsTotals(completedBookings);
  const confirmedTotals = calculateEarningsTotals(confirmedBookings);
  const paidTotals = calculateEarningsTotals(paidBookings);
  const allVisibleTotals = calculateEarningsTotals(bookings);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <Link
            href="/expert"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>

          {resolvedSearchParams.stripe ? (
            <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]">
              {formatStripeMessage(resolvedSearchParams.stripe)}
            </div>
          ) : null}

          {resolvedSearchParams.error ? (
            <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
              {formatStripeError(resolvedSearchParams.error)}
            </div>
          ) : null}

          <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
            <div>
              <Badge variant="primary">
                <WalletCards size={14} />
                Earnings
              </Badge>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Track your SkillDrop earnings.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                See completed paid calls, SkillDrop commission, payout-ready
                estimates and upcoming confirmed value.
              </p>
            </div>

            <Card className="p-5">
              <Badge variant={stripeStatus.ready ? "success" : "accent"}>
                <ShieldCheck size={14} />
                Stripe Connect
              </Badge>

              <div className="mt-5 grid gap-3">
                <InfoRow
                  label="Account"
                  value={expert.stripeAccountId ? "Created" : "Missing"}
                />

                <InfoRow
                  label="Charges"
                  value={stripeStatus.chargesEnabled ? "Enabled" : "Not ready"}
                />

                <InfoRow
                  label="Payouts"
                  value={stripeStatus.payoutsEnabled ? "Enabled" : "Not ready"}
                />
              </div>
            </Card>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Euro}
              label="Completed gross"
              value={formatMoney(completedTotals.servicePriceCents)}
              hint="Completed calls only"
            />

            <MetricCard
              icon={ShieldCheck}
              label="SkillDrop commission"
              value={formatMoney(completedTotals.providerCommissionCents)}
              hint="Helper-side fee"
            />

            <MetricCard
              icon={WalletCards}
              label="Payout-ready"
              value={formatMoney(completedTotals.providerNetCents)}
              hint="Estimated net completed"
            />

            <MetricCard
              icon={CalendarDays}
              label="Upcoming net"
              value={formatMoney(confirmedTotals.providerNetCents)}
              hint={`${formatMoney(confirmedTotals.servicePriceCents)} gross confirmed`}
            />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6 xl:grid-cols-[1fr_370px] xl:items-start">
          <div className="grid gap-6">
            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <TrendingUp size={14} />
                Earnings overview
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Money flow
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                Completed calls are payout-ready estimates. Confirmed and paid
                calls are not counted as payout-ready until completed.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MoneyBox
                  label="Completed net"
                  value={formatMoney(completedTotals.providerNetCents)}
                  hint={`${completedBookings.length} completed`}
                  strong
                />

                <MoneyBox
                  label="Confirmed net"
                  value={formatMoney(confirmedTotals.providerNetCents)}
                  hint={`${confirmedBookings.length} upcoming`}
                />

                <MoneyBox
                  label="Paid pending"
                  value={formatMoney(paidTotals.providerNetCents)}
                  hint={`${paidBookings.length} processing`}
                />

                <MoneyBox
                  label="Visible total"
                  value={formatMoney(allVisibleTotals.providerNetCents)}
                  hint="Paid + confirmed + completed"
                />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <CheckCircle2 size={14} />
                Paid call history
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Completed, confirmed and paid calls
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                Completed calls count toward payout-ready earnings. Confirmed
                calls are upcoming value. Paid calls are waiting for final
                confirmation or webhook processing.
              </p>

              <div className="mt-6 grid gap-4">
                {bookings.length > 0 ? (
                  bookings.map((booking) => (
                    <EarningBookingCard key={booking.id} booking={booking} />
                  ))
                ) : (
                  <EmptyState
                    title="No earnings yet"
                    text="Paid, confirmed and completed calls will appear here."
                  />
                )}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:sticky xl:top-[96px]">
            <Card className="p-5 md:p-6">
              <Badge variant={stripeStatus.ready ? "success" : "primary"}>
                <ShieldCheck size={14} />
                Payout status
              </Badge>

              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                {stripeStatus.ready
                  ? "Payout setup is ready."
                  : expert.stripeAccountId
                    ? "Finish Stripe setup."
                    : "Connect Stripe account."}
              </h2>

              <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                Buyers can pay only when Stripe Connect is ready. Stripe handles
                onboarding, identity verification and payout setup.
              </p>

              <div className="mt-5 grid gap-3">
                <InfoRow label="Helper commission" value="10%" />
                <InfoRow label="Payout processor" value="Stripe Connect" />
                <InfoRow
                  label="Stripe account"
                  value={expert.stripeAccountId ? "Created" : "Not connected"}
                />
                <InfoRow
                  label="Details submitted"
                  value={stripeStatus.detailsSubmitted ? "Yes" : "No"}
                />
              </div>

              {expert.stripeAccountId ? (
                <p className="mt-5 break-all rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3 text-xs font-bold text-[var(--muted-foreground)]">
                  Stripe account: {maskStripeAccountId(expert.stripeAccountId)}
                </p>
              ) : null}

              {stripeStatus.error ? (
                <div className="mt-5 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold leading-6 text-[var(--danger)]">
                  {stripeStatus.error}
                </div>
              ) : stripeStatus.ready ? (
                <div className="mt-5 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold leading-6 text-[var(--success)]">
                  Stripe confirmed charges and payouts are enabled.
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-4 text-sm font-bold leading-6 text-[var(--warning)]">
                  Continue onboarding, then refresh status.
                </div>
              )}

              <div className="mt-5 grid gap-3">
                <form action={createStripeConnectAccountAction}>
                  <button type="submit" className="btn btn-primary w-full">
                    <WalletCards size={17} />
                    {expert.stripeAccountId
                      ? "Continue Stripe setup"
                      : "Connect Stripe account"}
                  </button>
                </form>

                <form action={refreshStripeConnectStatusAction}>
                  <button type="submit" className="btn btn-secondary w-full">
                    <RefreshCcw size={17} />
                    Refresh status
                  </button>
                </form>

                {expert.stripeAccountId ? (
                  <form action={openStripeDashboardAction}>
                    <button type="submit" className="btn btn-secondary w-full">
                      <ExternalLink size={17} />
                      Open Stripe dashboard
                    </button>
                  </form>
                ) : null}
              </div>
            </Card>

            <Card soft className="p-5 md:p-6">
              <Badge variant="accent">
                <WalletCards size={14} />
                Good to know
              </Badge>

              <div className="mt-4 grid gap-3">
                <Tip text="Buyer service fees are paid by buyers on top of the offer price." />
                <Tip text="Buyer service fees are not deducted from your helper earnings." />
                <Tip text="Earnings become payout-ready only after a call is completed." />
                <Tip text="Cancelled, refunded or disputed bookings do not count as payout-ready." />
              </div>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

async function getStripeStatus(stripeAccountId: string | null) {
  if (!stripeAccountId) {
    return {
      ready: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      error: null,
    };
  }

  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);

    if (account.deleted) {
      return {
        ready: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        error: "Stripe account was deleted or is no longer available.",
      };
    }

    const chargesEnabled = Boolean(account.charges_enabled);
    const payoutsEnabled = Boolean(account.payouts_enabled);
    const detailsSubmitted = Boolean(account.details_submitted);

    return {
      ready: chargesEnabled && payoutsEnabled,
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
      error: null,
    };
  } catch {
    return {
      ready: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      error:
        "Stripe account could not be checked. Continue setup or reconnect Stripe.",
    };
  }
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
  const pricing = getBookingPricing(booking);
  const isCompleted = booking.status === "COMPLETED";
  const isConfirmed = booking.status === "CONFIRMED";
  const isPaid = booking.status === "PAID";

  return (
    <div className="rounded-[26px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={booking.status} />

            {isCompleted ? (
              <Badge variant="success">Payout-ready estimate</Badge>
            ) : isConfirmed ? (
              <Badge variant="primary">Upcoming value</Badge>
            ) : isPaid ? (
              <Badge variant="accent">Confirming payment</Badge>
            ) : null}

            {booking.review ? (
              <Badge variant="success">Reviewed {booking.review.rating}/5</Badge>
            ) : null}
          </div>

          <h3 className="mt-4 text-2xl font-bold tracking-[-0.04em] text-[var(--foreground)]">
            {booking.service?.title ?? "Booked call"}
          </h3>

          <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            Buyer: {booking.buyer.name ?? booking.buyer.email}
          </p>

          <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted-foreground)]">
            <Clock3 size={14} />
            {formatDateTime(booking.startTime)}
          </p>
        </div>

        <div className="grid min-w-[240px] gap-2 rounded-[22px] border border-[var(--border)] bg-[var(--background-soft)] p-4">
          <InfoRow
            label="Offer price"
            value={formatMoney(pricing.servicePriceCents)}
          />

          <InfoRow
            label="SkillDrop commission"
            value={formatMoney(pricing.providerCommissionCents)}
          />

          <InfoRow
            label={isCompleted ? "Net estimate" : "Net if completed"}
            value={formatMoney(pricing.providerNetCents)}
          />

          <div className="my-1 h-px bg-[var(--border)]" />

          <InfoRow
            label="Buyer service fee"
            value={formatMoney(pricing.clientServiceFeeCents)}
          />

          <InfoRow
            label="Buyer paid"
            value={formatMoney(pricing.clientTotalCents)}
          />
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

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[var(--foreground)]">
        {value}
      </p>

      <p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]">
        {hint}
      </p>
    </Card>
  );
}

function MoneyBox({
  label,
  value,
  hint,
  strong = false,
}: {
  label: string;
  value: string;
  hint: string;
  strong?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? "rounded-[22px] border border-[var(--primary)]/20 bg-[var(--primary-soft)] p-4"
          : "rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)] p-4"
      }
    >
      <p className="text-sm font-medium text-[var(--muted-foreground)]">
        {label}
      </p>

      <p
        className={
          strong
            ? "mt-2 text-2xl font-bold tracking-[-0.04em] text-[var(--primary-dark)]"
            : "mt-2 text-2xl font-bold tracking-[-0.04em] text-[var(--foreground)]"
        }
      >
        {value}
      </p>

      <p className="mt-1 text-xs font-medium text-[var(--muted-foreground)]">
        {hint}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3">
      <p className="text-sm font-medium text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="text-right text-sm font-bold text-[var(--foreground)]">
        {value}
      </p>
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

  if (status === "PAID") {
    return <Badge variant="accent">Confirming</Badge>;
  }

  return <Badge variant="accent">{status.toLowerCase()}</Badge>;
}

function Tip({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <p className="text-sm font-medium leading-6 text-[var(--muted-foreground)]">
        {text}
      </p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card-soft)] p-7 text-center">
      <h3 className="text-2xl font-bold tracking-[-0.04em] text-[var(--foreground)]">
        {title}
      </h3>

      <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[var(--muted-foreground)]">
        {text}
      </p>
    </div>
  );
}

function getBookingPricing(booking: {
  priceCents: number;
  platformFeeCents?: number | null;
  providerNetCents?: number | null;
  clientServiceFeeCents?: number | null;
  clientTotalCents?: number | null;
}) {
  const fallback = calculatePricingBreakdown(booking.priceCents);

  return {
    servicePriceCents: booking.priceCents,

    providerCommissionCents:
      typeof booking.platformFeeCents === "number"
        ? booking.platformFeeCents
        : fallback.providerCommissionCents,

    providerNetCents:
      typeof booking.providerNetCents === "number"
        ? booking.providerNetCents
        : fallback.providerNetCents,

    clientServiceFeeCents:
      typeof booking.clientServiceFeeCents === "number"
        ? booking.clientServiceFeeCents
        : fallback.clientServiceFeeCents,

    clientTotalCents:
      typeof booking.clientTotalCents === "number"
        ? booking.clientTotalCents
        : fallback.clientTotalCents,
  };
}

function calculateEarningsTotals(
  bookings: {
    priceCents: number;
    platformFeeCents?: number | null;
    providerNetCents?: number | null;
    clientServiceFeeCents?: number | null;
    clientTotalCents?: number | null;
  }[],
) {
  return bookings.reduce(
    (totals, booking) => {
      const pricing = getBookingPricing(booking);

      return {
        servicePriceCents:
          totals.servicePriceCents + pricing.servicePriceCents,
        providerCommissionCents:
          totals.providerCommissionCents + pricing.providerCommissionCents,
        providerNetCents: totals.providerNetCents + pricing.providerNetCents,
        clientServiceFeeCents:
          totals.clientServiceFeeCents + pricing.clientServiceFeeCents,
        clientTotalCents: totals.clientTotalCents + pricing.clientTotalCents,
      };
    },
    {
      servicePriceCents: 0,
      providerCommissionCents: 0,
      providerNetCents: 0,
      clientServiceFeeCents: 0,
      clientTotalCents: 0,
    },
  );
}

function maskStripeAccountId(accountId: string) {
  if (accountId.length <= 8) {
    return "••••";
  }

  return `${accountId.slice(0, 7)}••••${accountId.slice(-4)}`;
}

function formatMoney(cents: number) {
  return formatMoneyFromCents(cents);
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

function formatStripeMessage(message: string) {
  if (message === "connected" || message === "return") {
    return "Stripe onboarding returned. Refresh the status to confirm payouts are ready.";
  }

  if (message === "refresh") {
    return "Stripe onboarding was refreshed. Continue setup to finish payout activation.";
  }

  if (message === "checked") {
    return "Stripe account checked.";
  }

  return "Stripe status updated.";
}

function formatStripeError(error: string) {
  if (error === "stripe-account-missing") {
    return "Stripe account is missing. Please connect Stripe first.";
  }

  if (error === "stripe-account-invalid") {
    return "Stripe account is invalid or unavailable. Please reconnect Stripe.";
  }

  if (error === "stripe-dashboard-unavailable") {
    return "Stripe dashboard is unavailable right now. Please continue setup or try again later.";
  }

  if (error === "stripe-not-configured") {
    return "Stripe is not configured yet. Please check environment variables.";
  }

  return "Something went wrong with Stripe. Please try again.";
}