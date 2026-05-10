import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Bell,
  Bookmark,
  CalendarClock,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Globe2,
  HelpCircle,
  Lock,
  Mail,
  MessageCircle,
  Palette,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  Settings,
  Star,
  Trash2,
  UserRound,
  Video,
  WalletCards,
  Clock3,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppearanceSettings } from "@/components/expert/appearance-settings";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type BuyerSettingsPageProps = {
  searchParams?: Promise<{
    saved?: string;
  }>;
};

export default async function BuyerSettingsPage({
  searchParams,
}: BuyerSettingsPageProps) {
  const { user, role } = await requireRole(["buyer", "admin"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const buyer = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      bookings: {
        orderBy: {
          startTime: "desc",
        },
        take: 50,
      },
      reviews: {
        take: 50,
      },
      savedExperts: {
        take: 50,
      },
      buyerSettings: true,
    },
  });

  if (!buyer) {
    redirect("/sign-in");
  }

  const now = new Date();
  const settings = buyer.buyerSettings;

  const preferredLanguages = settings?.preferredLanguages ?? [];
  const interests = settings?.interests ?? [];
  const defaultReminderMin = settings?.defaultReminderMin ?? 30;
  const allowReminders = settings?.allowReminders ?? true;
  const hideEmail = settings?.hideEmail ?? true;
  const preferredTimezone = settings?.preferredTimezone ?? "Not set";

  const upcomingBookings = buyer.bookings.filter(
    (booking) =>
      booking.startTime >= now &&
      booking.status !== "CANCELLED" &&
      booking.status !== "REFUNDED" &&
      booking.status !== "COMPLETED" &&
      booking.status !== "DISPUTED",
  );

  const pendingBookings = buyer.bookings.filter(
    (booking) => booking.status === "PENDING",
  );

  const confirmedBookings = buyer.bookings.filter(
    (booking) => booking.status === "CONFIRMED",
  );

  const completedBookings = buyer.bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const cancelledBookings = buyer.bookings.filter(
    (booking) => booking.status === "CANCELLED" || booking.status === "REFUNDED",
  );

  const disputedBookings = buyer.bookings.filter(
    (booking) => booking.status === "DISPUTED",
  );

  const accountReadiness = calculateAccountReadiness({
    hasName: Boolean(buyer.name?.trim()),
    hasLanguages: preferredLanguages.length > 0,
    hasInterests: interests.length > 0,
    hasTimezone: Boolean(settings?.preferredTimezone),
    hasBudget:
      typeof settings?.budgetMinCents === "number" ||
      typeof settings?.budgetMaxCents === "number",
    hasSavedExperts: buyer.savedExperts.length > 0,
    hasCompletedBookings: completedBookings.length > 0,
    hasReviews: buyer.reviews.length > 0,
  });

  const totalSpendCents = buyer.bookings
    .filter(
      (booking) =>
        booking.status === "PAID" ||
        booking.status === "CONFIRMED" ||
        booking.status === "COMPLETED",
    )
    .reduce((sum, booking) => sum + getBookingTotalCents(booking.priceCents), 0);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />
        <div className="absolute left-[-140px] top-[-180px] h-[380px] w-[380px] rounded-full bg-[var(--primary)]/12 blur-3xl" />
        <div className="absolute bottom-[-180px] right-[-120px] h-[420px] w-[420px] rounded-full bg-[var(--accent)]/12 blur-3xl" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <Link
                href="/buyer"
                className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
              >
                <ArrowLeft size={16} />
                Back to dashboard
              </Link>

              {resolvedSearchParams.saved ? (
                <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black text-[var(--success)]">
                  Settings saved.
                </div>
              ) : null}

              <div className="mt-6">
                <Badge variant="primary">
                  <Settings size={14} />
                  Buyer settings
                </Badge>
              </div>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Control your SkillDrop workspace.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Manage appearance, account visibility, reminders, activity,
                privacy and support tools from one clean place.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <ButtonLink href="/buyer/profile">
                <UserRound size={18} />
                Edit profile
              </ButtonLink>

              <SignOutButton />
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MiniStat
              icon={CalendarClock}
              label="Upcoming"
              value={String(upcomingBookings.length)}
              text="Scheduled calls"
            />

            <MiniStat
              icon={CheckCircle2}
              label="Completed"
              value={String(completedBookings.length)}
              text="Finished calls"
            />

            <MiniStat
              icon={Bookmark}
              label="Saved"
              value={String(buyer.savedExperts.length)}
              text="Saved providers"
            />

            <MiniStat
              icon={Star}
              label="Reviews"
              value={String(buyer.reviews.length)}
              text="Feedback written"
            />

            <MiniStat
              icon={WalletCards}
              label="Spend"
              value={formatMoney(totalSpendCents)}
              text="Paid / confirmed"
            />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-5">
          <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <UserRound size={14} />
                Account summary
              </Badge>

              <div className="mt-5 flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div>
                  <h2 className="text-3xl font-black tracking-[-0.05em]">
                    Your account
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-muted">
                    Basic account details. Profile preferences like languages,
                    topics, budget and timezone are managed from your buyer
                    profile.
                  </p>
                </div>

                <Badge variant={accountReadiness >= 70 ? "success" : "accent"}>
                  {accountReadiness}% ready
                </Badge>
              </div>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[#8b5cf6]"
                  style={{ width: `${accountReadiness}%` }}
                />
              </div>

              <div className="mt-6 grid gap-3">
                <SettingRow icon={Mail} label="Email" value={buyer.email} />

                <SettingRow
                  icon={UserRound}
                  label="Display name"
                  value={buyer.name ?? "Not set"}
                />

                <SettingRow
                  icon={ShieldCheck}
                  label="Role"
                  value={formatRole(role)}
                />

                <SettingRow
                  icon={CalendarClock}
                  label="Default reminder"
                  value={`${defaultReminderMin} minutes`}
                />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <ButtonLink href="/buyer/profile" variant="secondary">
                  Edit profile preferences
                </ButtonLink>

                <ButtonLink href="/buyer/bookings" variant="secondary">
                  View bookings
                </ButtonLink>
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <Palette size={14} />
                Appearance
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Workspace theme
              </h2>

              <p className="mt-3 leading-7 text-muted">
                Choose how SkillDrop looks while you browse providers, save
                profiles, book calls and manage your activity.
              </p>

              <div className="mt-6">
                <AppearanceSettings />
              </div>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-4">
            <QuickActionCard
              icon={Video}
              title="My bookings"
              text="See upcoming calls, pending payments and completed sessions."
              href="/buyer/bookings"
              action="Open bookings"
            />

            <QuickActionCard
              icon={Bookmark}
              title="Saved providers"
              text="Return quickly to people you saved for later."
              href="/buyer/saved"
              action="Open saved"
            />

            <QuickActionCard
              icon={Star}
              title="My reviews"
              text="Leave feedback after completed calls and view past reviews."
              href="/buyer/reviews"
              action="Open reviews"
            />

            <QuickActionCard
              icon={HelpCircle}
              title="Help center"
              text="Find safety, refund and support information."
              href="/help"
              action="Get help"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <SystemPanel
              icon={Bell}
              badge="Notifications"
              title="Call reminders"
              text="Your reminder preference is saved in your profile. Message delivery can be connected later."
              rows={[
                ["Booking confirmations", "Enabled"],
                ["Call reminders", allowReminders ? "Enabled" : "Off"],
                ["Reminder time", `${defaultReminderMin} min`],
                ["Product updates", "Soon"],
              ]}
            />

            <SystemPanel
              icon={Lock}
              badge="Privacy"
              title="Visibility and contact"
              text="Control what providers can see and how communication should happen."
              rows={[
                ["Email visibility", hideEmail ? "Hidden" : "Visible"],
                ["Platform contact", "Enabled"],
                ["Saved providers", "Private"],
                ["Blocked providers", "Soon"],
              ]}
            />

            <SystemPanel
              icon={ShieldCheck}
              badge="Security"
              title="Account protection"
              text="Security tools for your client account and booking history."
              rows={[
                ["Authentication", "Supabase"],
                ["Session status", "Active"],
                ["Payment protection", "Enabled"],
                ["Two-factor auth", "Soon"],
              ]}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <Globe2 size={14} />
                Profile preferences
              </Badge>

              <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <h2 className="text-3xl font-black tracking-[-0.05em]">
                    Personalization lives in Profile.
                  </h2>

                  <p className="mt-3 max-w-2xl leading-7 text-muted">
                    Languages, topics, budget, timezone and reminder defaults
                    help SkillDrop show better providers and keep the settings
                    page simple.
                  </p>
                </div>

                <ButtonLink href="/buyer/profile">
                  <UserRound size={18} />
                  Open profile
                </ButtonLink>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <PreferencePreview
                  label="Languages"
                  value={
                    preferredLanguages.length
                      ? preferredLanguages.join(", ")
                      : "Not set"
                  }
                />

                <PreferencePreview
                  label="Topics"
                  value={interests.length ? interests.join(", ") : "Not set"}
                />

                <PreferencePreview
                  label="Budget"
                  value={formatBudget(
                    settings?.budgetMinCents,
                    settings?.budgetMaxCents,
                  )}
                />

                <PreferencePreview label="Timezone" value={preferredTimezone} />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <Eye size={14} />
                Activity
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Account usage
              </h2>

              <p className="mt-3 text-sm leading-6 text-muted">
                Quick view of your activity across the platform.
              </p>

              <div className="mt-6 grid gap-3">
                <SettingRow
                  icon={Clock3}
                  label="Pending payment"
                  value={String(pendingBookings.length)}
                />

                <SettingRow
                  icon={Video}
                  label="Confirmed calls"
                  value={String(confirmedBookings.length)}
                />

                <SettingRow
                  icon={CalendarClock}
                  label="Completed calls"
                  value={String(completedBookings.length)}
                />

                <SettingRow
                  icon={ShieldAlert}
                  label="Disputed calls"
                  value={String(disputedBookings.length)}
                />

                <SettingRow
                  icon={FileText}
                  label="Closed calls"
                  value={String(cancelledBookings.length)}
                />

                <SettingRow
                  icon={ShieldCheck}
                  label="Account status"
                  value="Active"
                />
              </div>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <Download size={14} />
                Data tools
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Data and exports
              </h2>

              <p className="mt-3 leading-7 text-muted">
                These tools are useful for a professional platform, but they can
                be built after the main booking, payment and support flow is
                stable.
              </p>

              <div className="mt-6 grid gap-3">
                <DisabledTool icon={Receipt} label="Export booking history" />
                <DisabledTool icon={Download} label="Download receipts" />
                <DisabledTool icon={Star} label="Export reviews" />
                <DisabledTool icon={FileText} label="Download account archive" />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <ShieldCheck size={14} />
                Support and safety
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Need help?
              </h2>

              <p className="mt-3 leading-7 text-muted">
                Later this area can include support tickets, booking disputes,
                refunds and safety reports.
              </p>

              <div className="mt-6 grid gap-3">
                <SupportLink
                  icon={HelpCircle}
                  label="Help center"
                  href="/help"
                />
                <SupportLink
                  icon={ShieldCheck}
                  label="Safety and trust"
                  href="/legal/safety"
                />
                <SupportLink
                  icon={WalletCards}
                  label="Refund policy"
                  href="/legal/refunds"
                />
                <DisabledTool icon={MessageCircle} label="Support tickets" />
              </div>
            </Card>
          </div>

          <Card className="border-[var(--danger)]/20 bg-[var(--danger-soft)] p-5 md:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <Badge>
                  <Trash2 size={14} />
                  Danger zone
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  Sensitive account actions
                </h2>

                <p className="mt-3 max-w-3xl leading-7 text-muted">
                  Account deletion, full data export and account pause should be
                  added later with confirmation screens, identity checks and
                  admin-safe audit logs.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--danger)]/20 bg-white/64 p-4 text-sm font-black text-[var(--danger)]">
                Protected
              </div>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function SettingRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={18} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
          {label}
        </p>

        <p className="mt-1 truncate font-black">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  text,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  text: string;
}) {
  return (
    <Card soft className="p-4 hover-lift">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={20} />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black tracking-[-0.05em]">{value}</p>

      <p className="mt-1 text-sm font-semibold text-muted">{text}</p>
    </Card>
  );
}

function QuickActionCard({
  icon: Icon,
  title,
  text,
  href,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  href: string;
  action: string;
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full p-5 transition group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-md)]">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
          <Icon size={20} />
        </div>

        <h3 className="mt-5 text-xl font-black tracking-[-0.03em]">{title}</h3>

        <p className="mt-2 text-sm font-semibold leading-6 text-muted">
          {text}
        </p>

        <p className="mt-5 text-sm font-black text-[var(--primary-dark)]">
          {action} →
        </p>
      </Card>
    </Link>
  );
}

function SystemPanel({
  icon: Icon,
  badge,
  title,
  text,
  rows,
}: {
  icon: LucideIcon;
  badge: string;
  title: string;
  text: string;
  rows: [string, string][];
}) {
  return (
    <Card className="p-5 md:p-6">
      <Badge variant="primary">
        <Icon size={14} />
        {badge}
      </Badge>

      <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">{title}</h2>

      <p className="mt-3 text-sm leading-6 text-muted">{text}</p>

      <div className="mt-5 grid gap-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3"
          >
            <p className="text-sm font-bold text-muted">{label}</p>

            <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-black text-[var(--primary-dark)]">
              {value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PreferencePreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-sm font-black leading-6">{value}</p>
    </div>
  );
}

function DisabledTool({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <Icon size={16} />
        </div>

        <p className="text-sm font-bold text-muted">{label}</p>
      </div>

      <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-black text-[var(--accent)]">
        Soon
      </span>
    </div>
  );
}

function SupportLink({
  icon: Icon,
  label,
  href,
}: {
  icon: LucideIcon;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
          <Icon size={16} />
        </div>

        <p className="text-sm font-bold text-muted">{label}</p>
      </div>

      <span className="text-sm font-black text-[var(--primary-dark)]">Open</span>
    </Link>
  );
}

function calculateAccountReadiness({
  hasName,
  hasLanguages,
  hasInterests,
  hasTimezone,
  hasBudget,
  hasSavedExperts,
  hasCompletedBookings,
  hasReviews,
}: {
  hasName: boolean;
  hasLanguages: boolean;
  hasInterests: boolean;
  hasTimezone: boolean;
  hasBudget: boolean;
  hasSavedExperts: boolean;
  hasCompletedBookings: boolean;
  hasReviews: boolean;
}) {
  const checks = [
    hasName,
    hasLanguages,
    hasInterests,
    hasTimezone,
    hasBudget,
    hasSavedExperts,
    hasCompletedBookings,
    hasReviews,
  ];

  const done = checks.filter(Boolean).length;

  return Math.round((done / checks.length) * 100);
}

function getBookingTotalCents(priceCents: number) {
  const servicePriceCents = Math.max(Math.round(priceCents), 0);
  const clientServiceFeeCents = Math.round(servicePriceCents * 0.05);

  return servicePriceCents + clientServiceFeeCents;
}

function formatBudget(min?: number | null, max?: number | null) {
  if (typeof min === "number" && typeof max === "number") {
    return `${formatMoney(min)} – ${formatMoney(max)}`;
  }

  if (typeof min === "number") {
    return `From ${formatMoney(min)}`;
  }

  if (typeof max === "number") {
    return `Up to ${formatMoney(max)}`;
  }

  return "Not set";
}

function formatMoney(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".00", "")}`;
}

function formatRole(role: string) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "buyer") {
    return "Buyer";
  }

  if (role === "expert") {
    return "Expert";
  }

  return role;
}