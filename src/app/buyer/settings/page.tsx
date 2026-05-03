import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  Download,
  Eye,
  FileText,
  Globe2,
  Lock,
  Mail,
  Palette,
  ShieldCheck,
  Settings,
  Trash2,
  UserRound,
  Video,
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
        take: 20,
      },
      reviews: {
        take: 20,
      },
      savedExperts: {
        take: 20,
      },
      buyerSettings: true,
    },
  });

  if (!buyer) {
    redirect("/sign-in");
  }

  const now = new Date();
  const settings = buyer.buyerSettings;

  const upcomingBookings = buyer.bookings.filter(
    (booking) =>
      booking.startTime >= now &&
      booking.status !== "CANCELLED" &&
      booking.status !== "REFUNDED" &&
      booking.status !== "COMPLETED",
  );

  const completedBookings = buyer.bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const cancelledBookings = buyer.bookings.filter(
    (booking) => booking.status === "CANCELLED" || booking.status === "REFUNDED",
  );

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

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
                  Settings
                </Badge>
              </div>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Account and system settings.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Manage appearance, notifications, privacy, security and account
                tools. Personal preferences are now handled in your profile.
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

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MiniStat
              label="Upcoming"
              value={String(upcomingBookings.length)}
              text="Scheduled calls"
            />

            <MiniStat
              label="Completed"
              value={String(completedBookings.length)}
              text="Finished calls"
            />

            <MiniStat
              label="Saved"
              value={String(buyer.savedExperts.length)}
              text="Saved experts"
            />

            <MiniStat
              label="Reviews"
              value={String(buyer.reviews.length)}
              text="Reviews written"
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

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Your account
              </h2>

              <p className="mt-3 text-sm leading-6 text-muted">
                Basic account information. Change your name and personal
                preferences from your profile page.
              </p>

              <div className="mt-6 grid gap-3">
                <SettingRow icon={Mail} label="Email" value={buyer.email} />

                <SettingRow
                  icon={UserRound}
                  label="Display name"
                  value={buyer.name ?? "Not set"}
                />

                <SettingRow icon={ShieldCheck} label="Role" value={role} />

                <SettingRow
                  icon={CalendarClock}
                  label="Default reminder"
                  value={`${settings?.defaultReminderMin ?? 30} minutes`}
                />
              </div>

              <div className="mt-6">
                <ButtonLink href="/buyer/profile" variant="secondary">
                  Edit profile preferences
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
                Choose how your client workspace looks while you browse, save
                experts and manage calls.
              </p>

              <div className="mt-6">
                <AppearanceSettings />
              </div>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <SystemPanel
              icon={Bell}
              badge="Notifications"
              title="Call reminders"
              text="Your reminder preference is saved in your profile. Message delivery can be connected later."
              rows={[
                ["Booking confirmations", "Enabled"],
                [
                  "Call reminders",
                  settings?.allowReminders ?? true ? "Enabled" : "Off",
                ],
                ["Reminder time", `${settings?.defaultReminderMin ?? 30} min`],
                ["Product updates", "Soon"],
              ]}
            />

            <SystemPanel
              icon={Lock}
              badge="Privacy"
              title="Visibility and contact"
              text="Control what experts can see and how communication should happen."
              rows={[
                ["Email visibility", settings?.hideEmail ?? true ? "Hidden" : "Visible"],
                ["Platform contact", "Enabled"],
                ["Saved experts", "Private"],
                ["Blocked experts", "Soon"],
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
                    Personalization moved to Profile.
                  </h2>

                  <p className="mt-3 max-w-2xl leading-7 text-muted">
                    Languages, interests, budget, timezone and reminder defaults
                    are part of your client profile. Keeping them there makes
                    settings cleaner and easier to understand.
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
                    settings?.preferredLanguages.length
                      ? settings.preferredLanguages.join(", ")
                      : "Not set"
                  }
                />

                <PreferencePreview
                  label="Topics"
                  value={
                    settings?.interests.length
                      ? settings.interests.join(", ")
                      : "Not set"
                  }
                />

                <PreferencePreview
                  label="Budget"
                  value={formatBudget(
                    settings?.budgetMinCents,
                    settings?.budgetMaxCents,
                  )}
                />

                <PreferencePreview
                  label="Timezone"
                  value={settings?.preferredTimezone ?? "Not set"}
                />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <Eye size={14} />
                Client activity
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Account usage
              </h2>

              <p className="mt-3 text-sm leading-6 text-muted">
                Quick view of your activity across the platform.
              </p>

              <div className="mt-6 grid gap-3">
                <SettingRow
                  icon={Video}
                  label="Upcoming calls"
                  value={String(upcomingBookings.length)}
                />

                <SettingRow
                  icon={CalendarClock}
                  label="Completed calls"
                  value={String(completedBookings.length)}
                />

                <SettingRow
                  icon={FileText}
                  label="Cancelled calls"
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
                be built after the main booking and payment flow is stable.
              </p>

              <div className="mt-6 grid gap-3">
                <DisabledTool label="Export booking history" />
                <DisabledTool label="Download receipts" />
                <DisabledTool label="Export reviews" />
                <DisabledTool label="Download account archive" />
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
                <DisabledTool label="Contact support" />
                <DisabledTool label="Report a problem" />
                <DisabledTool label="Request refund" />
                <DisabledTool label="Manage blocked experts" />
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
                  added carefully later, with confirmation screens and safety
                  checks.
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
  icon: typeof Mail;
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
  label,
  value,
  text,
}: {
  label: string;
  value: string;
  text: string;
}) {
  return (
    <Card soft className="p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black tracking-[-0.05em]">{value}</p>

      <p className="mt-1 text-sm font-semibold text-muted">{text}</p>
    </Card>
  );
}

function SystemPanel({
  icon: Icon,
  badge,
  title,
  text,
  rows,
}: {
  icon: typeof Bell;
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

function DisabledTool({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <p className="text-sm font-bold text-muted">{label}</p>

      <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-black text-[var(--accent)]">
        Soon
      </span>
    </div>
  );
}

function formatBudget(min?: number | null, max?: number | null) {
  if (min && max) {
    return `€${min / 100} – €${max / 100}`;
  }

  if (min) {
    return `From €${min / 100}`;
  }

  if (max) {
    return `Up to €${max / 100}`;
  }

  return "Not set";
}