import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Download,
  Eye,
  Globe2,
  Languages,
  Mail,
  Palette,
  ShieldCheck,
  Settings,
  Trash2,
  UserRound,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppearanceSettings } from "@/components/expert/appearance-settings";
import { ProviderSettingsControls } from "@/components/expert/provider-settings-controls";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function ExpertSettingsPage() {
  const { user, role } = await requireRole(["expert", "admin"]);

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
      services: {
        where: {
          isActive: true,
        },
      },
      availability: {
        where: {
          startTime: {
            gte: new Date(),
          },
          isBooked: false,
        },
      },
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <Link
                href="/expert"
                className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
              >
                <ArrowLeft size={16} />
                Back to dashboard
              </Link>

              <div className="mt-6">
                <Badge variant="primary">
                  <Settings size={14} />
                  Settings
                </Badge>
              </div>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Professional account settings.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Manage your account, workspace appearance, public visibility,
                booking rules, notifications and provider preferences.
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

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Account details
              </h2>

              <p className="mt-3 text-sm leading-6 text-muted">
                Basic information connected to your provider workspace.
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

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Workspace theme
              </h2>

              <p className="mt-3 leading-7 text-muted">
                Choose how your provider dashboard looks while you work.
              </p>

              <div className="mt-6">
                <AppearanceSettings />
              </div>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <Card className="p-5 md:p-6">
              <Badge variant={expert.isVerified ? "success" : "accent"}>
                <BadgeCheck size={14} />
                Provider status
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                {expert.isVerified
                  ? "Verified provider"
                  : "Verification in progress"}
              </h2>

              <p className="mt-3 leading-7 text-muted">
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

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Public profile health
              </h2>

              <p className="mt-3 leading-7 text-muted">
                These signals affect how ready your profile is for clients.
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
                  label="Verified badge"
                  value={expert.isVerified ? "Visible" : "Not yet"}
                  tone={expert.isVerified ? "success" : "accent"}
                />
              </div>
            </Card>
          </div>

          <ProviderSettingsControls />

          <Card className="p-5 md:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <Badge variant="accent">
                  <Download size={14} />
                  Data tools
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  Provider data and exports
                </h2>

                <p className="mt-3 max-w-3xl leading-7 text-muted">
                  Later this area can include booking export, review export,
                  invoices, tax documents and account archive.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-4 text-sm font-black text-[var(--muted-foreground)]">
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

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  Sensitive account actions
                </h2>

                <p className="mt-3 max-w-3xl leading-7 text-muted">
                  Later this area can include pause profile, deactivate provider
                  account, export data and delete account. For now these actions
                  are disabled to protect your data.
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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <p className="text-sm font-bold text-muted">{label}</p>
      <Badge variant={tone}>{value}</Badge>
    </div>
  );
}

function SmallStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <p className="text-2xl font-black tracking-[-0.04em]">{value}</p>

      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
    </div>
  );
}