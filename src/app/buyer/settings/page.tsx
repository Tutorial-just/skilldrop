import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Bell,
  Bookmark,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  Globe2,
  HelpCircle,
  Lock,
  Mail,
  Palette,
  Receipt,
  Save,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
  Video,
  WalletCards,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  updateBuyerAccountAction,
  updateBuyerPreferencesAction,
} from "@/server/actions/buyer-profile.actions";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppearanceSettings } from "@/components/expert/appearance-settings";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type BuyerSettingsPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const reminderOptions = [
  { label: "10 minutes", value: "10" },
  { label: "15 minutes", value: "15" },
  { label: "30 minutes", value: "30" },
  { label: "1 hour", value: "60" },
  { label: "2 hours", value: "120" },
  { label: "1 day", value: "1440" },
];

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
  const preferredTimezone = settings?.preferredTimezone ?? "";

  const upcomingBookings = buyer.bookings.filter(
    (booking) =>
      booking.startTime >= now &&
      (booking.status === "PAID" || booking.status === "CONFIRMED"),
  );

  const pendingBookings = buyer.bookings.filter(
    (booking) => booking.status === "PENDING" && booking.startTime >= now,
  );

  const confirmedBookings = buyer.bookings.filter(
    (booking) => booking.status === "CONFIRMED",
  );

  const completedBookings = buyer.bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const closedBookings = buyer.bookings.filter(
    (booking) =>
      booking.status === "CANCELLED" ||
      booking.status === "REFUNDED" ||
      booking.status === "EXPIRED",
  );

  const disputedBookings = buyer.bookings.filter(
    (booking) => booking.status === "DISPUTED",
  );

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
                className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]"
              >
                <ArrowLeft size={16} />
                Back to dashboard
              </Link>

              {resolvedSearchParams.saved ? (
                <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]">
                  {formatSavedMessage(resolvedSearchParams.saved)}
                </div>
              ) : null}

              {resolvedSearchParams.error ? (
                <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
                  {formatSettingsError(resolvedSearchParams.error)}
                </div>
              ) : null}

              <div className="mt-6">
                <Badge variant="primary">
                  <UserRound size={14} />
                  Buyer settings
                </Badge>
              </div>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Manage your account and booking preferences.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                Update your name, timezone, reminders, privacy, interests and
                budget from one place.
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
              text="Paid or confirmed calls"
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
              text="Saved helpers"
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
              text="Paid bookings"
            />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-5">
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <UserRound size={14} />
                Account
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                Account details
              </h2>

              <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                Your email is used to sign in and receive important booking
                updates.
              </p>

              <div className="mt-6 grid gap-3">
                <SettingRow icon={Mail} label="Email" value={buyer.email} />
                <SettingRow
                  icon={ShieldCheck}
                  label="Role"
                  value={formatRole(role)}
                />
              </div>

              <form action={updateBuyerAccountAction} className="mt-6 grid gap-4">
                <div>
                  <label className="text-sm font-black" htmlFor="name">
                    Display name
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    maxLength={80}
                    defaultValue={buyer.name ?? ""}
                    placeholder="Your name"
                    className="input mt-2"
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  Save account
                  <Save size={18} />
                </button>
              </form>
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
                Choose how SkillDrop looks while you browse helpers, save
                profiles and manage calls.
              </p>

              <div className="mt-6">
                <AppearanceSettings />
              </div>
            </Card>
          </div>

          <Card className="p-5 md:p-6">
            <Badge variant="primary">
              <Globe2 size={14} />
              Preferences
            </Badge>

            <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <h2 className="text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                  Personalization, reminders and privacy
                </h2>

                <p className="mt-3 max-w-2xl leading-7 text-[var(--muted-foreground)]">
                  These settings help SkillDrop show better helpers and make
                  booking times easier to understand.
                </p>
              </div>

              <Badge variant="accent">Saved to your account</Badge>
            </div>

            <form
              action={updateBuyerPreferencesAction}
              className="mt-7 grid gap-6"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Timezone" htmlFor="preferredTimezone">
                  <input
                    id="preferredTimezone"
                    name="preferredTimezone"
                    type="text"
                    maxLength={80}
                    defaultValue={preferredTimezone}
                    placeholder="Europe/Paris, America/New_York, Asia/Dubai..."
                    className="input mt-2"
                  />
                  <p className="mt-2 text-xs font-semibold text-[var(--muted-foreground)]">
                    Used for call reminders and booking times.
                  </p>
                </Field>

                <Field label="Default reminder" htmlFor="defaultReminderMin">
                  <select
                    id="defaultReminderMin"
                    name="defaultReminderMin"
                    defaultValue={String(defaultReminderMin)}
                    className="input mt-2"
                  >
                    {reminderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs font-semibold text-[var(--muted-foreground)]">
                    How early you want to be reminded before a call.
                  </p>
                </Field>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Preferred languages" htmlFor="preferredLanguages">
                  <input
                    id="preferredLanguages"
                    name="preferredLanguages"
                    type="text"
                    defaultValue={preferredLanguages.join(", ")}
                    placeholder="English, French, Spanish..."
                    className="input mt-2"
                  />
                  <p className="mt-2 text-xs font-semibold text-[var(--muted-foreground)]">
                    Separate items with commas.
                  </p>
                </Field>

                <Field label="Topics / interests" htmlFor="interests">
                  <input
                    id="interests"
                    name="interests"
                    type="text"
                    defaultValue={interests.join(", ")}
                    placeholder="CV review, documents, coding, language practice..."
                    className="input mt-2"
                  />
                  <p className="mt-2 text-xs font-semibold text-[var(--muted-foreground)]">
                    Helps personalize helper suggestions.
                  </p>
                </Field>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Minimum budget" htmlFor="budgetMin">
                  <input
                    id="budgetMin"
                    name="budgetMin"
                    type="number"
                    min={0}
                    max={10000}
                    step="0.01"
                    defaultValue={formatCentsInput(settings?.budgetMinCents)}
                    placeholder="10"
                    className="input mt-2"
                  />
                </Field>

                <Field label="Maximum budget" htmlFor="budgetMax">
                  <input
                    id="budgetMax"
                    name="budgetMax"
                    type="number"
                    min={0}
                    max={10000}
                    step="0.01"
                    defaultValue={formatCentsInput(settings?.budgetMaxCents)}
                    placeholder="50"
                    className="input mt-2"
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <CheckboxCard
                  name="allowReminders"
                  defaultChecked={allowReminders}
                  title="Call reminders"
                  text="Receive reminders before upcoming calls."
                />

                <CheckboxCard
                  name="hideEmail"
                  defaultChecked={hideEmail}
                  title="Hide my email"
                  text="Helpers should contact you through SkillDrop, not directly by email."
                />
              </div>

              <button type="submit" className="btn btn-primary w-full sm:w-fit">
                Save preferences
                <Save size={18} />
              </button>
            </form>
          </Card>

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
              title="Saved helpers"
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
              title="Reminder status"
              text="Control call reminder behavior from your preferences."
              rows={[
                ["Booking confirmations", "Enabled"],
                ["Call reminders", allowReminders ? "Enabled" : "Off"],
                ["Reminder time", `${defaultReminderMin} min`],
              ]}
            />

            <SystemPanel
              icon={Lock}
              badge="Privacy"
              title="Visibility and contact"
              text="Control what helpers can see and how communication happens."
              rows={[
                ["Email visibility", hideEmail ? "Hidden" : "Visible"],
                ["Platform contact", "Enabled"],
                ["Saved helpers", "Private"],
              ]}
            />

            <SystemPanel
              icon={ShieldCheck}
              badge="Security"
              title="Account protection"
              text="Security and payment safety for your buyer account."
              rows={[
                ["Authentication", "Enabled"],
                ["Session status", "Active"],
                ["Payment protection", "Enabled"],
              ]}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <Eye size={14} />
                Current preferences
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                Your saved preferences
              </h2>

              <p className="mt-3 max-w-2xl leading-7 text-[var(--muted-foreground)]">
                Quick preview of what is saved on your buyer account.
              </p>

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

                <PreferencePreview
                  label="Timezone"
                  value={preferredTimezone || "Not set"}
                />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <Clock3 size={14} />
                Activity
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                Account usage
              </h2>

              <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
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
                  value={String(closedBookings.length)}
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

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                Data and exports
              </h2>

              <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
                Export tools can be added after the main booking and payment
                flow is stable.
              </p>

              <div className="mt-6 grid gap-3">
                <DisabledTool icon={Receipt} label="Export booking history" />
                <DisabledTool icon={Download} label="Download receipts" />
                <DisabledTool icon={Star} label="Export reviews" />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <ShieldCheck size={14} />
                Support and safety
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                Need help?
              </h2>

              <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
                Open support and safety pages when you need help with bookings,
                refunds or platform rules.
              </p>

              <div className="mt-6 grid gap-3">
                <SupportLink icon={HelpCircle} label="Help center" href="/help" />
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

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                  Sensitive account actions
                </h2>

                <p className="mt-3 max-w-3xl leading-7 text-[var(--muted-foreground)]">
                  Account deletion should be handled with confirmation screens,
                  identity checks and admin-safe audit logs. For now, contact
                  support if you need to close your account.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--background-soft)] p-4 text-sm font-bold text-[var(--danger)]">
                Contact support
              </div>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-black">
        {label}
      </label>

      {children}
    </div>
  );
}

function CheckboxCard({
  name,
  defaultChecked,
  title,
  text,
}: {
  name: string;
  defaultChecked: boolean;
  title: string;
  text: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 transition hover:border-[var(--border-strong)] hover:bg-[var(--background-soft)]">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-1 h-5 w-5 rounded border-[var(--border)] accent-[var(--primary)]"
      />

      <span>
        <span className="block font-black tracking-[-0.02em] text-[var(--foreground)]">
          {title}
        </span>

        <span className="mt-1 block text-sm font-medium leading-6 text-[var(--muted-foreground)]">
          {text}
        </span>
      </span>
    </label>
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

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
        {value}
      </p>

      <p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]">
        {text}
      </p>
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

        <h3 className="mt-5 text-xl font-black tracking-[-0.03em] text-[var(--foreground)]">
          {title}
        </h3>

        <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
          {text}
        </p>

        <p className="mt-5 text-sm font-bold text-[var(--primary-dark)]">
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

      <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
        {text}
      </p>

      <div className="mt-5 grid gap-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3"
          >
            <p className="text-sm font-medium text-[var(--muted-foreground)]">
              {label}
            </p>

            <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-bold text-[var(--primary-dark)]">
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
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold leading-6 text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function DisabledTool({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <Icon size={16} />
        </div>

        <p className="text-sm font-medium text-[var(--muted-foreground)]">
          {label}
        </p>
      </div>

      <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--accent)]">
        Later
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
      className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--background-soft)] hover:shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
          <Icon size={16} />
        </div>

        <p className="text-sm font-medium text-[var(--muted-foreground)]">
          {label}
        </p>
      </div>

      <span className="text-sm font-bold text-[var(--primary-dark)]">Open</span>
    </Link>
  );
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

function formatCentsInput(cents?: number | null) {
  if (typeof cents !== "number") {
    return "";
  }

  return String(cents / 100);
}

function formatRole(role: string) {
  const normalizedRole = role.toLowerCase();

  if (normalizedRole === "admin") {
    return "Admin";
  }

  if (normalizedRole === "buyer") {
    return "Buyer";
  }

  if (normalizedRole === "expert") {
    return "Expert";
  }

  return role;
}

function formatSavedMessage(saved: string) {
  if (saved === "account") {
    return "Account details saved.";
  }

  if (saved === "preferences") {
    return "Preferences saved.";
  }

  return "Settings saved.";
}

function formatSettingsError(error: string) {
  if (error === "missing-name") {
    return "Please add your display name.";
  }

  if (error === "name-too-long") {
    return "Display name is too long.";
  }

  if (error === "invalid-timezone") {
    return "Please enter a valid timezone, for example Europe/Paris.";
  }

  if (error === "invalid-reminder") {
    return "Please choose a valid reminder time.";
  }

  if (error === "invalid-budget") {
    return "Please enter a valid budget range.";
  }

  if (error === "not-signed-in") {
    return "Please sign in again.";
  }

  return "Something went wrong. Please try again.";
}
