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
  SlidersHorizontal,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

type ProviderSettings = {
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

  hideEmailFromClients: boolean;
  requireClientMessage: boolean;
};

const defaultSettings: ProviderSettings = {
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

  hideEmailFromClients: true,
  requireClientMessage: true,
};

const storageKey = "skilldrop-provider-settings";

export function ProviderSettingsControls() {
  const [settings, setSettings] = useState<ProviderSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<ProviderSettings>;

      setSettings({
        ...defaultSettings,
        ...parsed,
      });
    } catch {
      setSettings(defaultSettings);
    }
  }, []);

  function updateSetting<K extends keyof ProviderSettings>(
    key: K,
    value: ProviderSettings[K],
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
        <div className="rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black text-[var(--success)]">
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
            description="Get an email when a client books you."
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
            description="Know when a client leaves a review."
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
          text="Control what clients can see before booking."
        >
          <ToggleRow
            label="Profile visible"
            description="Allow clients to discover your profile."
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
          text="Set simple rules for how people can book calls."
        >
          <ToggleRow
            label="Auto-confirm bookings"
            description="Automatically confirm paid bookings."
            checked={settings.autoConfirmBookings}
            onChange={(value) => updateSetting("autoConfirmBookings", value)}
          />

          <ToggleRow
            label="Allow same-day bookings"
            description="Let clients book available slots today."
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
            options={["No buffer", "5 minutes", "10 minutes", "15 minutes", "30 minutes"]}
            onChange={(value) => updateSetting("bufferBetweenCalls", value)}
          />
        </SettingsSection>

        <SettingsSection
          icon={Lock}
          badge="Privacy"
          title="Client protection"
          text="Protect your contact details and improve booking quality."
        >
          <ToggleRow
            label="Hide email from clients"
            description="Clients will contact you through SkillDrop."
            checked={settings.hideEmailFromClients}
            onChange={(value) => updateSetting("hideEmailFromClients", value)}
          />

          <ToggleRow
            label="Require client message"
            description="Ask clients to explain what they need before booking."
            checked={settings.requireClientMessage}
            onChange={(value) => updateSetting("requireClientMessage", value)}
          />

          <InfoRow
            icon={ShieldCheck}
            label="Payments"
            value="Protected through platform flow"
          />

          <InfoRow
            icon={Video}
            label="Calls"
            value="Jitsi video rooms enabled"
          />
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
    <section className="rounded-[28px] border border-[var(--border)] bg-white/64 p-5 shadow-sm">
      <Badge variant="primary">
        <Icon size={14} />
        {badge}
      </Badge>

      <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">{title}</h3>

      <p className="mt-2 text-sm font-semibold leading-6 text-muted">{text}</p>

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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <div>
        <p className="font-black tracking-[-0.02em]">{label}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-muted">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={
          checked
            ? "flex h-8 w-14 shrink-0 items-center justify-end rounded-full bg-[var(--primary)] p-1 transition"
            : "flex h-8 w-14 shrink-0 items-center justify-start rounded-full bg-[var(--border-strong)] p-1 transition"
        }
        aria-pressed={checked}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm">
          {checked ? <Check size={14} className="text-[var(--primary)]" /> : null}
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
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_180px] md:items-center">
        <div>
          <p className="font-black tracking-[-0.02em]">{label}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-muted">
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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
          <Icon size={18} />
        </div>

        <p className="font-black tracking-[-0.02em]">{label}</p>
      </div>

      <p className="text-right text-sm font-bold text-muted">{value}</p>
    </div>
  );
}