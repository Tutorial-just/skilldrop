import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Database,
  FileText,
  Globe2,
  Mail,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Video,
  XCircle,
  type LucideIcon
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { seedOfficialCategoriesAction } from "@/server/actions/admin.actions";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default async function AdminLaunchChecklistPage() {
  await requireRole(["admin"]);

  const [
    usersCount,
    expertsCount,
    approvedExpertsCount,
    servicesCount,
    categoriesCount,
    activeCategoriesCount,
    subcategoriesCount,
    categoryRequestsCount,
    pendingCategoryRequestsCount,
    openSlotsCount,
    bookingsCount,
    confirmedBookingsCount,
    completedBookingsCount,
    reviewsCount,
    notificationsCount,
    callOutcomesCount,
    stripeConnectedExpertsCount,
    payoutReadyExpertsCount,
    expertsWithoutAvailabilityCount,
    pendingBookingsCount,
    disputedBookingsCount,
    completedWithoutOutcomeCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.expertProfile.count(),
    prisma.expertProfile.count({
      where: {
        status: "APPROVED",
      },
    }),
    prisma.service.count({
      where: {
        isActive: true,
      },
    }),
    prisma.category.count(),
    prisma.category.count({
      where: {
        isActive: true,
      },
    }),
    prisma.subcategory.count({
      where: {
        isActive: true,
      },
    }),
    prisma.categoryRequest.count(),
    prisma.categoryRequest.count({
      where: {
        status: "PENDING",
      },
    }),
    prisma.availability.count({
      where: {
        isActive: true,
        endTime: {
          gte: new Date(),
        },
      },
    }),
    prisma.booking.count(),
    prisma.booking.count({
      where: {
        status: "CONFIRMED",
      },
    }),
    prisma.booking.count({
      where: {
        status: "COMPLETED",
      },
    }),
    prisma.review.count(),
    prisma.notification.count(),
    prisma.callOutcome.count(),
    prisma.expertProfile.count({
      where: {
        stripeAccountId: {
          not: null,
        },
      },
    }),
    prisma.expertProfile.count({
      where: {
        status: "APPROVED",
        stripeAccountId: { not: null },
        stripeDetailsSubmitted: true,
        stripePayoutsEnabled: true,
      },
    }),
    prisma.expertProfile.count({
      where: {
        status: "APPROVED",
        availability: {
          none: {
            isActive: true,
            endTime: { gte: new Date() },
          },
        },
      },
    }),
    prisma.booking.count({
      where: { status: "PENDING" },
    }),
    prisma.booking.count({
      where: { status: "DISPUTED" },
    }),
    prisma.booking.count({
      where: {
        status: "COMPLETED",
        outcome: { is: null },
      },
    }),
  ]);

  const appUrlReady = Boolean(process.env.NEXT_PUBLIC_APP_URL);
  const databaseReady = Boolean(process.env.DATABASE_URL);
  const directUrlReady = Boolean(process.env.DIRECT_URL);
  const stripeSecretReady = Boolean(process.env.STRIPE_SECRET_KEY);
  const stripeWebhookReady = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const supabaseUrlReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const supportEmailReady = Boolean(process.env.NEXT_PUBLIC_SUPPORT_EMAIL);
  const resendApiKeyReady = Boolean(process.env.RESEND_API_KEY);
  const resendFromEmailReady = Boolean(process.env.RESEND_FROM_EMAIL);
  const jitsiBaseUrlReady = Boolean(process.env.JITSI_BASE_URL);
  const productionUrlReady =
    Boolean(process.env.NEXT_PUBLIC_APP_URL) &&
    !process.env.NEXT_PUBLIC_APP_URL?.includes("localhost");

  const envChecks = [
    {
      title: "App URL",
      text: "NEXT_PUBLIC_APP_URL is required for Stripe redirects and production links.",
      ready: appUrlReady,
      icon: Globe2,
    },
    {
      title: "Database URL",
      text: "DATABASE_URL is required for Prisma and production database access.",
      ready: databaseReady,
      icon: Database,
    },
    {
      title: "Direct database URL",
      text: "DIRECT_URL is required for Prisma migrations on hosted PostgreSQL.",
      ready: directUrlReady,
      icon: Server,
    },
    {
      title: "Stripe secret key",
      text: "STRIPE_SECRET_KEY is required for checkout, refunds and Connect.",
      ready: stripeSecretReady,
      icon: CreditCard,
    },
    {
      title: "Stripe webhook secret",
      text: "STRIPE_WEBHOOK_SECRET is required to confirm payments safely.",
      ready: stripeWebhookReady,
      icon: ShieldCheck,
    },
    {
      title: "Supabase URL",
      text: "NEXT_PUBLIC_SUPABASE_URL is required for authentication.",
      ready: supabaseUrlReady,
      icon: ShieldCheck,
    },
    {
      title: "Supabase anon key",
      text: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required for client authentication.",
      ready: supabaseAnonReady,
      icon: ShieldCheck,
    },
    {
      title: "Support email",
      text: "NEXT_PUBLIC_SUPPORT_EMAIL should be set for legal/help pages.",
      ready: supportEmailReady,
      icon: Mail,
    },
    {
      title: "Resend API key",
      text: "RESEND_API_KEY is required to send booking, review, dispute and verification emails.",
      ready: resendApiKeyReady,
      icon: Mail,
    },
    {
      title: "Resend from email",
      text: "RESEND_FROM_EMAIL should be configured so production emails have a valid sender.",
      ready: resendFromEmailReady,
      icon: Mail,
    },
    {
      title: "Jitsi base URL",
      text: "JITSI_BASE_URL is required to generate reliable call room links.",
      ready: jitsiBaseUrlReady,
      icon: Video,
    },
    {
      title: "Production app URL",
      text: "NEXT_PUBLIC_APP_URL should be the final public domain, not localhost.",
      ready: productionUrlReady,
      icon: Globe2,
    },
  ];

  const productChecks = [
    {
      title: "Users exist",
      text: `${usersCount} user account${usersCount === 1 ? "" : "s"} created.`,
      ready: usersCount > 0,
      icon: BadgeCheck,
    },
    {
      title: "Experts exist",
      text: `${expertsCount} expert profile${expertsCount === 1 ? "" : "s"} created.`,
      ready: expertsCount > 0,
      icon: Sparkles,
    },
    {
      title: "Approved experts",
      text: `${approvedExpertsCount} approved expert${approvedExpertsCount === 1 ? "" : "s"}.`,
      ready: approvedExpertsCount > 0,
      icon: ShieldCheck,
    },
    {
      title: "Active services",
      text: `${servicesCount} active service${servicesCount === 1 ? "" : "s"}.`,
      ready: servicesCount > 0,
      icon: FileText,
    },
    {
      title: "Official categories",
      text: `${activeCategoriesCount} active categor${activeCategoriesCount === 1 ? "y" : "ies"} and ${subcategoriesCount} active subcategor${subcategoriesCount === 1 ? "y" : "ies"}.`,
      ready: activeCategoriesCount > 0 && subcategoriesCount > 0,
      icon: FileText,
    },
    {
      title: "Missing help request board",
      text: `${categoryRequestsCount} request${categoryRequestsCount === 1 ? "" : "s"} captured, including ${pendingCategoryRequestsCount} pending moderation item${pendingCategoryRequestsCount === 1 ? "" : "s"}.`,
      ready: true,
      icon: ShieldCheck,
    },
    {
      title: "Open availability",
      text: `${openSlotsCount} open future slot${openSlotsCount === 1 ? "" : "s"}.`,
      ready: openSlotsCount > 0,
      icon: Video,
    },
    {
      title: "Stripe accounts created",
      text: `${stripeConnectedExpertsCount} expert${
        stripeConnectedExpertsCount === 1 ? "" : "s"
      } with a Stripe Connect account ID. Final payout readiness is checked during checkout.`,
      ready: stripeConnectedExpertsCount > 0,
      icon: CreditCard,

    },
  ];

  const flowChecks = [
    {
      title: "Bookings created",
      text: `${bookingsCount} booking${bookingsCount === 1 ? "" : "s"} created.`,
      ready: bookingsCount > 0,
      icon: CalendarDays,
    },
    {
      title: "Confirmed bookings",
      text: `${confirmedBookingsCount} confirmed booking${confirmedBookingsCount === 1 ? "" : "s"}.`,
      ready: confirmedBookingsCount > 0,
      icon: CheckCircle2,
    },
    {
      title: "Completed calls",
      text: `${completedBookingsCount} completed call${completedBookingsCount === 1 ? "" : "s"}.`,
      ready: completedBookingsCount > 0,
      icon: Video,
    },
    {
      title: "Reviews",
      text: `${reviewsCount} review${reviewsCount === 1 ? "" : "s"} submitted.`,
      ready: reviewsCount > 0,
      icon: BadgeCheck,
    },
    {
      title: "Action plans",
      text: `${callOutcomesCount} post-call action plan${callOutcomesCount === 1 ? "" : "s"} created.`,
      ready: callOutcomesCount > 0,
      icon: FileText,
    },
    {
      title: "Notifications",
      text: `${notificationsCount} notification${notificationsCount === 1 ? "" : "s"} created.`,
      ready: notificationsCount > 0,
      icon: Mail,
    },
    {
      title: "Legal pages reviewed",
      text: "Terms, refund policy, safety, privacy and Help Center should be checked manually before public launch.",
      ready: Boolean(process.env.NEXT_PUBLIC_SUPPORT_EMAIL),
      icon: FileText,
    },
    {
      title: "SEO files",
      text: "robots.ts and sitemap.ts should exist so search engines can discover public pages.",
      ready: true,
      icon: Globe2,
    },
  ];

  const allChecks = [...envChecks, ...productChecks, ...flowChecks];
  const readyCount = allChecks.filter((check) => check.ready).length;
  const totalCount = allChecks.length;
  const launchScore = Math.round((readyCount / totalCount) * 100);
  const canSoftLaunch =
    launchScore >= 75 &&
    databaseReady &&
    stripeSecretReady &&
    stripeWebhookReady &&
    activeCategoriesCount > 0 &&
    supabaseUrlReady &&
    supabaseAnonReady &&
    resendApiKeyReady &&
    jitsiBaseUrlReady;

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative container-page py-8 md:py-10 lg:py-14">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to admin
          </Link>

          <Badge variant={canSoftLaunch ? "success" : "accent"} className="mt-8">
            {canSoftLaunch ? (
              <>
                <ShieldCheck size={14} />
                Soft launch possible
              </>
            ) : (
              <>
                <ShieldAlert size={14} />
                Launch checklist
              </>
            )}
          </Badge>

          <h1 className="heading-lg mt-5 max-w-4xl text-balance">
            SkillDrop production readiness.
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
            Check environment variables, marketplace data, Stripe setup and core
            user flows before launching publicly.
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <LaunchStat label="Launch score" value={`${launchScore}%`} />
            <LaunchStat label="Checks ready" value={`${readyCount}/${totalCount}`} />
            <LaunchStat label="Categories" value={`${activeCategoriesCount}/${categoriesCount}`} />
            <LaunchStat label="Payout ready" value={String(payoutReadyExpertsCount)} />
            <LaunchStat label="Disputes" value={String(disputedBookingsCount)} />
            <LaunchStat
              label="Status"
              value={canSoftLaunch ? "Soft launch ready" : "Needs work"}
            />
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-start">
          <div className="grid gap-6">
            <ChecklistSection
              badge="Environment"
              title="Production environment"
              text="These values must be configured in Vercel or your production host."
              checks={envChecks}
            />

            <ChecklistSection
              badge="Marketplace"
              title="Marketplace readiness"
              text="These checks confirm that users, experts, services and availability exist."
              checks={productChecks}
            />

            <ChecklistSection
              badge="Core flow"
              title="Booking flow readiness"
              text="These checks confirm that the full marketplace loop has been tested."
              checks={flowChecks}
            />
          </div>

          <div className="grid gap-6 xl:sticky xl:top-[96px]">
            <Card className="p-5 md:p-6">
              <Badge variant={canSoftLaunch ? "success" : "accent"}>
                <Sparkles size={14} />
                Launch decision
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                {canSoftLaunch ? "You can soft launch." : "Not ready yet."}
              </h2>

              <p className="mt-3 text-sm font-bold leading-6 text-muted">
                Soft launch means testing with a small group of real users before
                a full public launch.
              </p>

              <div className="mt-5 grid gap-3">
                <DecisionRow
                  label="Database"
                  ready={databaseReady && directUrlReady}
                />
                <DecisionRow
                  label="Stripe checkout + webhook"
                  ready={stripeSecretReady && stripeWebhookReady}
                />
                <DecisionRow
                  label="Authentication"
                  ready={supabaseUrlReady && supabaseAnonReady}
                />
                <DecisionRow
                  label="Emails"
                  ready={resendApiKeyReady && resendFromEmailReady}
                />

                <DecisionRow
                  label="Video calls"
                  ready={jitsiBaseUrlReady}
                />
                <DecisionRow label="Marketplace data" ready={expertsCount > 0} />
                <DecisionRow
                  label="Official categories"
                  ready={activeCategoriesCount > 0 && subcategoriesCount > 0}
                />
                <DecisionRow label="Open slots" ready={openSlotsCount > 0} />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <ShieldAlert size={14} />
                Operational alerts
              </Badge>

              <div className="mt-5 grid gap-3">
                <DecisionRow label="Pending payments" ready={pendingBookingsCount === 0} />
                <DecisionRow label="Open disputes" ready={disputedBookingsCount === 0} />
                <DecisionRow label="Completed calls need outcomes" ready={completedWithoutOutcomeCount === 0} />
                <DecisionRow label="Approved experts need availability" ready={expertsWithoutAvailabilityCount === 0} />
              </div>
            </Card>

            <Card soft className="p-5 md:p-6">
              <Badge variant="primary">
                <ShieldCheck size={14} />
                Before public launch
              </Badge>

              <div className="mt-5 grid gap-3">
                <LaunchTip text="Test one full paid booking with Stripe test mode." />
                <LaunchTip text="Check Stripe webhook logs after payment." />
                <LaunchTip text="After test payment, confirm the booking becomes CONFIRMED automatically." />
                <LaunchTip text="After refund from admin panel, confirm the booking becomes REFUNDED and both users receive notifications." />
                <LaunchTip text="Test buyer review after completed call." />
                <LaunchTip text="Check legal pages: terms, privacy, refunds, safety and Help Center." />
                <LaunchTip text="Open /robots.txt and /sitemap.xml in production after deployment." />
                <LaunchTip text="Complete one post-call action plan after a completed test booking." />
                <LaunchTip text="Use a real support email before public users arrive." />
              </div>
            </Card>

            {activeCategoriesCount === 0 ? (
              <Card className="p-5 md:p-6">
                <Badge variant="accent">
                  <FileText size={14} />
                  Category setup
                </Badge>

                <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                  Seed official categories.
                </h2>

                <p className="mt-3 text-sm font-bold leading-6 text-muted">
                  Add the first clean SkillDrop categories and subcategories so
                  helpers can create searchable offers.
                </p>

                <form action={seedOfficialCategoriesAction} className="mt-5">
                  <button type="submit" className="btn btn-primary w-full">
                    Seed categories
                  </button>
                </form>
              </Card>
            ) : null}

            <Card className="border-[var(--danger)]/20 bg-[var(--danger-soft)] p-5 md:p-6">
              <Badge>
                <ShieldAlert size={14} />
                Important
              </Badge>

              <p className="mt-4 text-sm font-black leading-6 text-[var(--danger)]">
                Do not launch publicly with real payments until Stripe webhook,
                refund logic, support email, legal text and admin dispute flow
                have been tested.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

function ChecklistSection({
  badge,
  title,
  text,
  checks,
}: {
  badge: string;
  title: string;
  text: string;
  checks: {
    title: string;
    text: string;
    ready: boolean;
    icon: LucideIcon;
  }[];
}) {
  return (
    <Card className="p-5 md:p-6">
      <Badge variant="primary">{badge}</Badge>

      <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">{title}</h2>

      <p className="mt-2 text-sm font-bold leading-6 text-muted">{text}</p>

      <div className="mt-6 grid gap-3">
        {checks.map((check) => (
          <ChecklistRow key={check.title} check={check} />
        ))}
      </div>
    </Card>
  );
}

function ChecklistRow({
  check,
}: {
  check: {
    title: string;
    text: string;
    ready: boolean;
    icon: LucideIcon;
  };
}) {
  const Icon = check.icon;

  return (
    <div
      className={
        check.ready
          ? "rounded-[22px] border border-[var(--success)]/20 bg-[var(--success-soft)] p-4"
          : "rounded-[22px] border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-4"
      }
    >
      <div className="flex gap-4">
        <div
          className={
            check.ready
              ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-[var(--success)]"
              : "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-[var(--warning)]"
          }
        >
          <Icon size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black tracking-[-0.02em]">{check.title}</p>

            {check.ready ? (
              <Badge variant="success">
                <CheckCircle2 size={14} />
                Ready
              </Badge>
            ) : (
              <Badge variant="accent">
                <XCircle size={14} />
                Check
              </Badge>
            )}
          </div>

          <p className="mt-1 text-sm font-bold leading-6 text-muted">
            {check.text}
          </p>
        </div>
      </div>
    </div>
  );
}

function LaunchStat({ label, value }: { label: string; value: string }) {
  return (
    <Card soft className="p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{value}</p>
    </Card>
  );
}

function DecisionRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>

      {ready ? (
        <Badge variant="success">Ready</Badge>
      ) : (
        <Badge variant="accent">Missing</Badge>
      )}
    </div>
  );
}

function LaunchTip({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--success)]" />
      <p className="text-sm font-bold leading-6 text-muted">{text}</p>
    </div>
  );
}

