"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CalendarClock,
  Check,
  Eye,
  Lock,
  Mail,
  ShieldCheck,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

type HelperSettings = {
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
  minimumNotice: string;
  bufferBetweenCalls: string;

  hideEmailFromBuyers: boolean;
  requireBuyerMessage: boolean;
};

const defaultSettings: HelperSettings = {
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
  minimumNotice: "2 hours",
  bufferBetweenCalls: "10 minutes",

  hideEmailFromBuyers: true,
  requireBuyerMessage: true,
};

const storageKey = "skilldrop-helper-settings";

export function ProviderSettingsControls() {
  const [settings, setSettings] = useState<HelperSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<HelperSettings>;

      setSettings({
        ...defaultSettings,
        ...parsed,
      });
    } catch {
      setSettings(defaultSettings);
    }
  }, []);

  function updateSetting<K extends keyof HelperSettings>(
    key: K,
    value: HelperSettings[K],
  ) {
    const nextSettings = {
      ...settings,
      [key]: value,
    };

    setSettings(nextSettings);
    localStorage.setItem(storageKey, JSON.stringify(nextSettings));

    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 1400);
  }

  return (
    <div className="grid gap-5">
      {saved ? (
        <div className="rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]">
          Settings saved on this device.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsSection
          icon={Bell}
          badge="Notifications"
          title="Booking alerts"
          text="Choose which updates you want to receive."
        >
          <ToggleRow
            label="New booking emails"
            description="Get an email when a buyer books you."
            checked={settings.bookingEmails}
            onChange={(value) => updateSetting("bookingEmails", value)}
          />

          <ToggleRow
            label="Call reminders"
            description="Receive reminders before upcoming calls."
            checked={settings.callReminders}
            onChange={(value) => updateSetting("callReminders", value)}
          />

          <ToggleRow
            label="Review alerts"
            description="Know when a buyer leaves a review."
            checked={settings.reviewAlerts}
            onChange={(value) => updateSetting("reviewAlerts", value)}
          />

          <ToggleRow
            label="Weekly summary"
            description="Get a weekly overview of bookings and performance."
            checked={settings.weeklySummary}
            onChange={(value) => updateSetting("weeklySummary", value)}
          />
        </SettingsSection>

        <SettingsSection
          icon={Eye}
          badge="Visibility"
          title="Public profile"
          text="Control what buyers can see before booking."
        >
          <ToggleRow
            label="Profile visible"
            description="Allow buyers to discover your profile."
            checked={settings.profileVisible}
            onChange={(value) => updateSetting("profileVisible", value)}
          />

          <ToggleRow
            label="Show availability"
            description="Display open time slots on your public profile."
            checked={settings.showAvailability}
            onChange={(value) => updateSetting("showAvailability", value)}
          />

          <ToggleRow
            label="Show starting price"
            description="Show your lowest active offer price."
            checked={settings.showStartingPrice}
            onChange={(value) => updateSetting("showStartingPrice", value)}
          />

          <ToggleRow
            label="Show languages"
            description="Display languages on your public profile."
            checked={settings.showLanguages}
            onChange={(value) => updateSetting("showLanguages", value)}
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
          <ToggleRow
            label="Auto-confirm bookings"
            description="Automatically confirm paid bookings."
            checked={settings.autoConfirmBookings}
            onChange={(value) => updateSetting("autoConfirmBookings", value)}
          />

          <ToggleRow
            label="Allow same-day bookings"
            description="Let buyers book available slots today."
            checked={settings.allowSameDayBookings}
            onChange={(value) => updateSetting("allowSameDayBookings", value)}
          />

          <SelectRow
            label="Minimum notice"
            description="How much time you need before a call."
            value={settings.minimumNotice}
            options={["30 minutes", "1 hour", "2 hours", "6 hours", "24 hours"]}
            onChange={(value) => updateSetting("minimumNotice", value)}
          />

          <SelectRow
            label="Buffer between calls"
            description="Break time between two calls."
            value={settings.bufferBetweenCalls}
            options={[
              "No buffer",
              "5 minutes",
              "10 minutes",
              "15 minutes",
              "30 minutes",
            ]}
            onChange={(value) => updateSetting("bufferBetweenCalls", value)}
          />
        </SettingsSection>

        <SettingsSection
          icon={Lock}
          badge="Privacy"
          title="Buyer protection"
          text="Protect your contact details and improve booking quality."
        >
          <ToggleRow
            label="Hide email from buyers"
            description="Buyers will contact you through SkillDrop."
            checked={settings.hideEmailFromBuyers}
            onChange={(value) => updateSetting("hideEmailFromBuyers", value)}
          />

          <ToggleRow
            label="Require buyer message"
            description="Ask buyers to explain what they need before booking."
            checked={settings.requireBuyerMessage}
            onChange={(value) => updateSetting("requireBuyerMessage", value)}
          />

          <InfoRow
            icon={ShieldCheck}
            label="Payments"
            value="Protected through platform flow"
          />

          <InfoRow icon={Video} label="Calls" value="Video rooms enabled" />
        </SettingsSection>
      </div>
    </div>
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
  children: React.ReactNode;
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

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <div className="min-w-0">
        <p className="font-bold tracking-[-0.02em] text-[var(--foreground)]">
          {label}
        </p>

        <p className="mt-1 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={
          checked
            ? "flex h-8 w-14 shrink-0 items-center justify-end rounded-full border border-[var(--primary)] bg-[var(--primary)] p-1 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(139,92,246,0.28)]"
            : "flex h-8 w-14 shrink-0 items-center justify-start rounded-full border border-[var(--border)] bg-[var(--background-soft)] p-1 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(139,92,246,0.28)]"
        }
        aria-pressed={checked}
      >
        <span
          className={
            checked
              ? "flex h-6 w-6 items-center justify-center rounded-full bg-white text-[var(--primary)] shadow-sm"
              : "flex h-6 w-6 items-center justify-center rounded-full bg-[var(--muted-foreground)]/30 shadow-sm"
          }
        >
          {checked ? <Check size={14} /> : null}
        </span>
      </button>
    </div>
  );
}

function SelectRow({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
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

        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="input"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
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