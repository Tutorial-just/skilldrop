import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  Globe2,
  Languages,
  Mail,
  Palette,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Settings,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  createStripeConnectAccountAction,
  createStripeConnectDashboardAction,
  refreshStripeConnectStatusAction,
} from "@/server/actions/stripe-connect.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppearanceSettings } from "@/components/expert/appearance-settings";
import { ProviderSettingsControls } from "@/components/expert/provider-settings-controls";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ExpertSettingsPageProps = {
  searchParams?: Promise<{
    stripe?: string;
    error?: string;
    saved?: string;
  }>;
};

export default async function ExpertSettingsPage({
  searchParams,
}: ExpertSettingsPageProps) {
  const { user, role } = await requireRole(["expert", "admin"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const expert = await prisma.expertProfile.findFirst({
    where: {
      user: {
        email,
      },
    },
    include: {
      user: true,
      settings: true,
      services: {
        where: {
          isActive: true,
        },
      },
      availability: {
        where: {
          endTime: {
            gte: new Date(),
          },
          isActive: true,
        },
      },
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  const stripeStatus = await getStripeStatus(expert.stripeAccountId);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
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

              {resolvedSearchParams.saved === "settings" ? (
                <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]">
                  Settings saved. Your helper preferences are now stored on your account.
                </div>
              ) : null}

              {resolvedSearchParams.error ? (
                <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
                  {formatSettingsError(resolvedSearchParams.error)}
                </div>
              ) : null}

              <div className="mt-6">
                <Badge variant="primary">
                  <Settings size={14} />
                  Settings
                </Badge>
              </div>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Helper account settings.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                Manage your account, payments, workspace appearance, public
                visibility, booking rules, notifications and helper preferences.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <ButtonLink href={`/experts/${expert.id}`}>
                <Eye size={18} />
                Public profile
              </ButtonLink>

              <SignOutButton />
            </div>
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-5">
          <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <UserRound size={14} />
                Account
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                Account details
              </h2>

              <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                Basic information connected to your helper workspace.
              </p>

              <div className="mt-6 grid gap-3">
                <SettingRow icon={Mail} label="Email" value={expert.user.email} />

                <SettingRow
                  icon={UserRound}
                  label="Display name"
                  value={expert.user.name ?? "Not set"}
                />

                <SettingRow icon={ShieldCheck} label="Role" value={role} />

                <SettingRow
                  icon={Globe2}
                  label="Country"
                  value={expert.country ?? "Global"}
                />

                <SettingRow
                  icon={Languages}
                  label="Languages"
                  value={
                    expert.languages.length > 0
                      ? expert.languages.join(", ")
                      : "Not set"
                  }
                />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <Palette size={14} />
                Appearance
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                Workspace theme
              </h2>

              <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
                Choose how your helper dashboard looks while you work.
              </p>

              <div className="mt-6">
                <AppearanceSettings />
              </div>
            </Card>
          </div>

          <Card className="p-5 md:p-6">
            <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr] xl:items-start">
              <div>
                <Badge variant={stripeStatus.ready ? "success" : "accent"}>
                  <WalletCards size={14} />
                  Stripe payouts
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                  {stripeStatus.ready
                    ? "Payments are ready."
                    : "Connect Stripe to receive payouts."}
                </h2>

                <p className="mt-3 max-w-3xl leading-7 text-[var(--muted-foreground)]">
                  Buyers can only pay for your calls when your Stripe Connect
                  account is ready. Stripe handles card payments and helper
                  payout setup.
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <PayoutStatusBox
                    label="Stripe account"
                    value={expert.stripeAccountId ? "Connected" : "Missing"}
                    tone={expert.stripeAccountId ? "success" : "accent"}
                  />

                  <PayoutStatusBox
                    label="Charges"
                    value={stripeStatus.chargesEnabled ? "Enabled" : "Not ready"}
                    tone={stripeStatus.chargesEnabled ? "success" : "accent"}
                  />

                  <PayoutStatusBox
                    label="Payouts"
                    value={stripeStatus.payoutsEnabled ? "Enabled" : "Not ready"}
                    tone={stripeStatus.payoutsEnabled ? "success" : "accent"}
                  />
                </div>

                {!stripeStatus.ready ? (
                  <div className="mt-6 rounded-2xl border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-4 text-sm font-bold leading-6 text-[var(--warning)]">
                    Your profile can exist, but paid bookings stay blocked until
                    payouts are ready.
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold leading-6 text-[var(--success)]">
                    Your payout setup is ready. Buyers can pay and confirm
                    bookings with you.
                  </div>
                )}

                {stripeStatus.error ? (
                  <div className="mt-4 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold leading-6 text-[var(--danger)]">
                    {stripeStatus.error}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
                <form action={createStripeConnectAccountAction}>
                  <button type="submit" className="btn btn-primary w-full">
                    <CreditCard size={17} />
                    {expert.stripeAccountId
                      ? "Continue Stripe setup"
                      : "Connect Stripe"}
                  </button>
                </form>

                <form action={refreshStripeConnectStatusAction}>
                  <button type="submit" className="btn btn-secondary w-full">
                    <RefreshCcw size={17} />
                    Refresh status
                  </button>
                </form>

                {expert.stripeAccountId ? (
                  <form action={createStripeConnectDashboardAction}>
                    <button type="submit" className="btn btn-secondary w-full">
                      <ExternalLink size={17} />
                      Open Stripe dashboard
                    </button>
                  </form>
                ) : null}

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--background-soft)] p-4">
                  <div className="flex gap-3">
                    {stripeStatus.ready ? (
                      <ShieldCheck
                        size={18}
                        className="mt-0.5 shrink-0 text-[var(--success)]"
                      />
                    ) : (
                      <ShieldAlert
                        size={18}
                        className="mt-0.5 shrink-0 text-[var(--warning)]"
                      />
                    )}

                    <p className="text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                      {stripeStatus.ready
                        ? "Stripe confirmed that charges and payouts are enabled."
                        : "Finish Stripe onboarding, then refresh the status here."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <Card className="p-5 md:p-6">
              <Badge variant={expert.isVerified ? "success" : "accent"}>
                <BadgeCheck size={14} />
                Helper status
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                {expert.isVerified
                  ? "Verified helper"
                  : "Verification in progress"}
              </h2>

              <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
                Verification is earned after 3 successful calls and a rating of
                at least 3.8.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <SmallStat value={String(expert.totalSessions)} label="calls" />

                <SmallStat
                  value={expert.rating ? expert.rating.toFixed(1) : "New"}
                  label="rating"
                />

                <SmallStat
                  value={expert.isVerified ? "Yes" : "No"}
                  label="verified"
                />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <Eye size={14} />
                Profile visibility
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                Public profile health
              </h2>

              <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
                These signals affect how ready your profile is for buyers.
              </p>

              <div className="mt-6 grid gap-3">
                <VisibilityRow
                  label="Profile status"
                  value={expert.status}
                  tone={expert.status === "APPROVED" ? "success" : "accent"}
                />

                <VisibilityRow
                  label="Active offers"
                  value={String(expert.services.length)}
                  tone={expert.services.length > 0 ? "success" : "accent"}
                />

                <VisibilityRow
                  label="Open slots"
                  value={String(expert.availability.length)}
                  tone={expert.availability.length > 0 ? "success" : "accent"}
                />

                <VisibilityRow
                  label="Payments"
                  value={stripeStatus.ready ? "Ready" : "Not ready"}
                  tone={stripeStatus.ready ? "success" : "accent"}
                />

                <VisibilityRow
                  label="Verified badge"
                  value={expert.isVerified ? "Visible" : "Not yet"}
                  tone={expert.isVerified ? "success" : "accent"}
                />
              </div>
            </Card>
          </div>

          <ProviderSettingsControls settings={expert.settings} />

          <Card className="p-5 md:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <Badge variant="accent">
                  <Download size={14} />
                  Data tools
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                  Helper data and exports
                </h2>

                <p className="mt-3 max-w-3xl leading-7 text-[var(--muted-foreground)]">
                  Later this area can include booking export, review export,
                  invoices, tax documents and account archive.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 text-sm font-bold text-[var(--muted-foreground)]">
                Coming soon
              </div>
            </div>
          </Card>

          <Card className="border-[var(--danger)]/20 bg-[var(--danger-soft)] p-5 md:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <Badge>
                  <Trash2 size={14} />
                  Danger zone
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                  Sensitive account actions
                </h2>

                <p className="mt-3 max-w-3xl leading-7 text-[var(--muted-foreground)]">
                  Later this area can include pause profile, deactivate helper
                  account, export data and delete account. For now these actions
                  are disabled to protect your data.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--background-soft)] p-4 text-sm font-bold text-[var(--danger)]">
                Protected
              </div>
            </div>
          </Card>
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
        "Stripe account could not be checked. Refresh setup or reconnect Stripe.",
    };
  }
}

function SettingRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={18} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          {label}
        </p>

        <p className="mt-1 truncate font-bold text-[var(--foreground)]">
          {value}
        </p>
      </div>
    </div>
  );
}

function VisibilityRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "accent";
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <p className="text-sm font-medium text-[var(--muted-foreground)]">
        {label}
      </p>

      <Badge variant={tone}>{value}</Badge>
    </div>
  );
}

function PayoutStatusBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "accent";
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        {label}
      </p>

      <div className="mt-2">
        <Badge variant={tone}>{value}</Badge>
      </div>
    </div>
  );
}

function SmallStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <p className="text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        {label}
      </p>
    </div>
  );
}

function formatStripeMessage(message: string) {
  if (message === "return") {
    return "Stripe onboarding finished. Refresh the status to confirm payouts are ready.";
  }

  if (message === "refresh") {
    return "Stripe onboarding was refreshed. Continue setup to finish payout activation.";
  }

  if (message === "checked") {
    return "Stripe payout status checked.";
  }

  return "Stripe status updated.";
}

function formatSettingsError(error: string) {
  if (error === "stripe-account-missing") {
    return "Stripe account is missing. Please connect Stripe first.";
  }

  if (error === "stripe-dashboard-unavailable") {
    return "Stripe dashboard is not available yet. Finish Stripe onboarding first.";
  }

  if (error === "stripe-account-invalid") {
    return "Stripe account could not be found. Please reconnect Stripe.";
  }

  if (error === "invalid-minimum-notice") {
    return "Please choose a valid minimum notice value.";
  }

  if (error === "invalid-buffer") {
    return "Please choose a valid buffer between calls.";
  }

  return "Something went wrong. Please try again.";
}