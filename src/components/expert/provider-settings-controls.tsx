import type { ReactNode } from "react";
import {
  Bell,
  CalendarClock,
  Check,
  Eye,
  Lock,
  Mail,
  Save,
  ShieldCheck,
  Video,
} from "lucide-react";

import { updateExpertSettingsAction } from "@/server/actions/expert-settings.actions";
import { Badge } from "@/components/ui/badge";

type ExpertSettingsData = {
  bookingEmails: boolean;
  callReminders: boolean;
  reviewAlerts: boolean;
  weeklySummary: boolean;

  profileVisible: boolean;
  showAvailability: boolean;
  showStartingPrice: boolean;
  showLanguages: boolean;

  autoConfirmBookings: boolean;
  allowSameDayBookings: boolean;
  minimumNoticeMinutes: number;
  bufferBetweenCallsMin: number;

  hideEmailFromBuyers: boolean;
  requireBuyerMessage: boolean;
} | null;

type ProviderSettingsControlsProps = {
  settings: ExpertSettingsData;
};

const defaultSettings = {
  bookingEmails: true,
  callReminders: true,
  reviewAlerts: true,
  weeklySummary: false,

  profileVisible: true,
  showAvailability: true,
  showStartingPrice: true,
  showLanguages: true,

  autoConfirmBookings: false,
  allowSameDayBookings: true,
  minimumNoticeMinutes: 120,
  bufferBetweenCallsMin: 10,

  hideEmailFromBuyers: true,
  requireBuyerMessage: true,
};

export function ProviderSettingsControls({
  settings,
}: ProviderSettingsControlsProps) {
  const currentSettings = {
    ...defaultSettings,
    ...(settings ?? {}),
  };

  return (
    <form action={updateExpertSettingsAction} className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsSection
          icon={Bell}
          badge="Notifications"
          title="Booking alerts"
          text="Choose which helper updates should be sent to you."
        >
          <CheckboxRow
            name="bookingEmails"
            label="New booking emails"
            description="Get an email when a buyer books you."
            defaultChecked={currentSettings.bookingEmails}
          />

          <CheckboxRow
            name="callReminders"
            label="Call reminders"
            description="Receive reminders before upcoming calls."
            defaultChecked={currentSettings.callReminders}
          />

          <CheckboxRow
            name="reviewAlerts"
            label="Review alerts"
            description="Know when a buyer leaves a review."
            defaultChecked={currentSettings.reviewAlerts}
          />

          <CheckboxRow
            name="weeklySummary"
            label="Weekly summary"
            description="Get a weekly overview of bookings and performance."
            defaultChecked={currentSettings.weeklySummary}
          />
        </SettingsSection>

        <SettingsSection
          icon={Eye}
          badge="Visibility"
          title="Public profile"
          text="Control what buyers can see before booking."
        >
          <CheckboxRow
            name="profileVisible"
            label="Profile visible"
            description="Allow buyers to discover your profile in search."
            defaultChecked={currentSettings.profileVisible}
          />

          <CheckboxRow
            name="showAvailability"
            label="Show availability"
            description="Display open time slots on your public profile."
            defaultChecked={currentSettings.showAvailability}
          />

          <CheckboxRow
            name="showStartingPrice"
            label="Show starting price"
            description="Show your lowest active offer price."
            defaultChecked={currentSettings.showStartingPrice}
          />

          <CheckboxRow
            name="showLanguages"
            label="Show languages"
            description="Display languages on your public profile."
            defaultChecked={currentSettings.showLanguages}
          />
        </SettingsSection>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsSection
          icon={CalendarClock}
          badge="Scheduling"
          title="Booking rules"
          text="Set simple rules for how buyers can book calls."
        >
          <CheckboxRow
            name="autoConfirmBookings"
            label="Auto-confirm bookings"
            description="Automatically confirm paid bookings when payment succeeds."
            defaultChecked={currentSettings.autoConfirmBookings}
          />

          <CheckboxRow
            name="allowSameDayBookings"
            label="Allow same-day bookings"
            description="Let buyers book available slots today."
            defaultChecked={currentSettings.allowSameDayBookings}
          />

          <SelectRow
            name="minimumNoticeMinutes"
            label="Minimum notice"
            description="How much time you need before a call."
            defaultValue={String(currentSettings.minimumNoticeMinutes)}
            options={[
              ["30", "30 minutes"],
              ["60", "1 hour"],
              ["120", "2 hours"],
              ["360", "6 hours"],
              ["1440", "24 hours"],
            ]}
          />

          <SelectRow
            name="bufferBetweenCallsMin"
            label="Buffer between calls"
            description="Break time between two calls."
            defaultValue={String(currentSettings.bufferBetweenCallsMin)}
            options={[
              ["0", "No buffer"],
              ["5", "5 minutes"],
              ["10", "10 minutes"],
              ["15", "15 minutes"],
              ["30", "30 minutes"],
            ]}
          />
        </SettingsSection>

        <SettingsSection
          icon={Lock}
          badge="Privacy"
          title="Buyer protection"
          text="Protect your contact details and improve booking quality."
        >
          <CheckboxRow
            name="hideEmailFromBuyers"
            label="Hide email from buyers"
            description="Buyers contact you through SkillDrop, not directly by email."
            defaultChecked={currentSettings.hideEmailFromBuyers}
          />

          <CheckboxRow
            name="requireBuyerMessage"
            label="Require buyer message"
            description="Ask buyers to explain what they need before booking."
            defaultChecked={currentSettings.requireBuyerMessage}
          />

          <InfoRow
            icon={ShieldCheck}
            label="Payments"
            value="Protected through platform flow"
          />

          <InfoRow icon={Video} label="Calls" value="Video rooms enabled" />
        </SettingsSection>
      </div>

      <div className="sticky bottom-4 z-20 rounded-[26px] border border-[var(--border)] bg-[var(--card)]/95 p-3 shadow-[var(--shadow-md)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-[var(--muted-foreground)]">
            Save these settings to your account. They will work on every device.
          </p>

          <button type="submit" className="btn btn-primary">
            Save settings
            <Save size={18} />
          </button>
        </div>
      </div>
    </form>
  );
}

function SettingsSection({
  icon: Icon,
  badge,
  title,
  text,
  children,
}: {
  icon: typeof Bell;
  badge: string;
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
      <Badge variant="primary">
        <Icon size={14} />
        {badge}
      </Badge>

      <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
        {title}
      </h3>

      <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
        {text}
      </p>

      <div className="mt-5 grid gap-3">{children}</div>
    </section>
  );
}

function CheckboxRow({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 transition hover:border-[var(--border-strong)] hover:bg-[var(--background-soft)]">
      <div className="min-w-0">
        <p className="font-bold tracking-[-0.02em] text-[var(--foreground)]">
          {label}
        </p>

        <p className="mt-1 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
          {description}
        </p>
      </div>

      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />

      <span className="flex h-8 w-14 shrink-0 items-center justify-start rounded-full border border-[var(--border)] bg-[var(--background-soft)] p-1 transition peer-checked:justify-end peer-checked:border-[var(--primary)] peer-checked:bg-[var(--primary)]">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--muted-foreground)]/30 shadow-sm transition peer-checked:bg-white peer-checked:text-[var(--primary)]">
          {defaultChecked ? <Check size={14} /> : null}
        </span>
      </span>
    </label>
  );
}

function SelectRow({
  name,
  label,
  description,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  description: string;
  defaultValue: string;
  options: [string, string][];
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_180px] md:items-center">
        <div>
          <p className="font-bold tracking-[-0.02em] text-[var(--foreground)]">
            {label}
          </p>

          <p className="mt-1 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            {description}
          </p>
        </div>

        <select name={name} defaultValue={defaultValue} className="input">
          {options.map(([value, labelText]) => (
            <option key={value} value={value}>
              {labelText}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
          <Icon size={18} />
        </div>

        <p className="font-bold tracking-[-0.02em] text-[var(--foreground)]">
          {label}
        </p>
      </div>

      <p className="text-right text-sm font-medium text-[var(--muted-foreground)]">
        {value}
      </p>
    </div>
  );
}
