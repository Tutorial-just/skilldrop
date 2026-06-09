import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingStatus, HelpRequestStatus, HelpType } from "@prisma/client";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Eye,
  Bell,
  Lightbulb,
  ListChecks,
  MessageCircle,
  Plus,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Video,
  WalletCards,
  Zap,
} from "lucide-react";
import { getExpertQuality } from "@/lib/expert-quality";
import { ExpertProfileCompletenessCard } from "@/components/experts/expert-profile-completeness-card";
import { ExpertVerificationCard } from "@/components/experts/expert-verification-card";
import { requireRole } from "@/lib/auth/get-current-user";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { UnreadNotificationsCard } from "@/components/notifications/unread-notifications-card";

type ExpertDashboardPageProps = {
  searchParams?: Promise<{
    profile?: string;
  }>;
};

const activeBookingStatuses: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.PAID,
  BookingStatus.CONFIRMED,
  BookingStatus.DISPUTED,
];

const finishedOrInactiveStatuses: BookingStatus[] = [
  BookingStatus.CANCELLED,
  BookingStatus.REFUNDED,
  BookingStatus.COMPLETED,
  BookingStatus.EXPIRED,
];

const DASHBOARD_BOOKINGS_LIMIT = 20;
const DASHBOARD_SERVICES_LIMIT = 20;
const DASHBOARD_REVIEWS_LIMIT = 4;
const DASHBOARD_AVAILABILITY_LIMIT = 24;

const workspaceLinks = [
  {
    title: "Profile",
    text: "Bio, skills, languages and public trust.",
    href: "/expert/profile",
    icon: UserRound,
    tone: "Profile quality",
  },
  {
    title: "Offers",
    text: "Services, price, duration and categories.",
    href: "/expert/services",
    icon: WalletCards,
    tone: "What clients buy",
  },
  {
    title: "Availability",
    text: "Open windows clients can book inside.",
    href: "/expert/availability",
    icon: CalendarDays,
    tone: "Your calendar",
  },
  {
    title: "Bookings",
    text: "Upcoming calls, payments and call rooms.",
    href: "/expert/bookings",
    icon: Video,
    tone: "Live work",
  },
  {
    title: "Action plans",
    text: "Give buyers clear next steps after calls.",
    href: "/expert/outcomes",
    icon: ListChecks,
    tone: "After-call value",
  },
  {
    title: "Earnings",
    text: "Revenue, fees and payout readiness.",
    href: "/expert/earnings",
    icon: CircleDollarSign,
    tone: "Money",
  },
];

export default async function ExpertDashboardPage({
  searchParams,
}: ExpertDashboardPageProps) {
  const { user } = await requireRole(["expert", "admin"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const now = new Date();

  const expert = await prisma.expertProfile.findFirst({
    where: {
      user: {
        email,
      },
    },
    include: {
      user: true,
      services: {
        include: {
          category: true,
          subcategory: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: DASHBOARD_SERVICES_LIMIT,
      },
      availability: {
        where: {
          isActive: true,
          endTime: {
            gte: now,
          },
        },
        include: {
          bookings: {
            where: {
              status: {
                in: activeBookingStatuses,
              },
            },
            select: {
              startTime: true,
              endTime: true,
              status: true,
            },
            orderBy: {
              startTime: "asc",
            },
          },
        },
        orderBy: {
          startTime: "asc",
        },
        take: DASHBOARD_AVAILABILITY_LIMIT,
      },
      bookings: {
        where: {
          OR: [
            {
              startTime: {
                gte: now,
              },
              status: {
                in: activeBookingStatuses,
              },
            },
            {
              endTime: {
                lt: now,
              },
              status: BookingStatus.COMPLETED,
            },
            {
              status: BookingStatus.DISPUTED,
            },
          ],
        },
        orderBy: {
          startTime: "asc",
        },
        take: DASHBOARD_BOOKINGS_LIMIT,
        include: {
          buyer: true,
          service: true,
          callRoom: true,
          outcome: true,
        },
      },
      reviews: {
        orderBy: {
          createdAt: "desc",
        },
        take: DASHBOARD_REVIEWS_LIMIT,
      },
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  const helperName = expert.user.name || "Helper";
  const helperEmail = expert.user.email || email;
  const bio = expert.bio ?? "";

  const activeServices = expert.services.filter((service) => service.isActive);
  const openSlots = expert.availability.filter(
    (window) =>
      window.isActive &&
      window.endTime >= now &&
      getWindowFreeMinutes(window) > 0,
  );

  const hasStripePayouts = Boolean(
    expert.stripeAccountId &&
      expert.stripeDetailsSubmitted &&
      expert.stripePayoutsEnabled,
  );

  const isBookable =
    activeServices.length > 0 && openSlots.length > 0 && hasStripePayouts;

  const missingBookableSteps = [
    activeServices.length === 0 ? "create an active offer" : null,
    openSlots.length === 0 ? "add availability" : null,
    !hasStripePayouts ? "finish Stripe payouts" : null,
  ].filter(Boolean) as string[];

  const nextSetupHref =
    activeServices.length === 0
      ? "/expert/services"
      : openSlots.length === 0
        ? "/expert/availability"
        : !hasStripePayouts
          ? "/expert/earnings"
          : `/experts/${expert.id}`;

  const upcomingBookings = expert.bookings
    .filter(
      (booking) =>
        booking.startTime >= now &&
        !finishedOrInactiveStatuses.includes(booking.status),
    )
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const pendingBookings = expert.bookings.filter(
    (booking) => booking.status === BookingStatus.PENDING,
  );

  const paidBookings = expert.bookings.filter(
    (booking) => booking.status === BookingStatus.PAID,
  );

  const confirmedBookings = expert.bookings.filter(
    (booking) => booking.status === BookingStatus.CONFIRMED,
  );

  const completedBookings = expert.bookings.filter(
    (booking) => booking.status === BookingStatus.COMPLETED,
  );

  const completedWithoutOutcome = completedBookings.filter(
    (booking) => !booking.outcome,
  );

  const disputedBookings = expert.bookings.filter(
    (booking) => booking.status === BookingStatus.DISPUTED,
  );

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const todaysBookings = upcomingBookings.filter(
    (booking) => booking.startTime >= todayStart && booking.startTime <= todayEnd,
  );

  const todaysOpenSlots = openSlots.filter(
    (slot) => slot.startTime >= todayStart && slot.startTime <= todayEnd,
  );

  const nextBooking = todaysBookings[0] ?? upcomingBookings[0] ?? null;
  const nextOpenSlots = openSlots.slice(0, 6);

  const upcomingRevenueCents = confirmedBookings.reduce(
    (sum, booking) => sum + getProviderNetCents(booking),
    0,
  );

  const completedRevenueCents = completedBookings.reduce(
    (sum, booking) => sum + getProviderNetCents(booking),
    0,
  );

  const quality = getExpertQuality({
    image: expert.user.avatarUrl,
    headline: expert.headline,
    bio: expert.bio,
    country: expert.country,
    timezone: expert.timezone,
    languages: expert.languages,
    skills: expert.skills,
    totalSessions: expert.totalSessions,
    completedCalls: expert.totalSessions,
    totalReviews: expert.totalReviews,
    rating: expert.rating,
    servicesCount: expert.services.length,
    activeServicesCount: activeServices.length,
    availabilityCount: expert.availability.length,
    isManuallyVerified: expert.isVerified,
  });

  const checklist = [
    {
      title: "Public profile",
      text: "Headline, long bio, languages and 3+ skills.",
      done:
        Boolean(expert.headline?.trim()) &&
        bio.trim().length >= 120 &&
        expert.skills.length >= 3 &&
        expert.languages.length > 0,
      href: "/expert/profile",
    },
    {
      title: "Bookable offer",
      text: "At least one active service with clear result.",
      done: activeServices.length > 0,
      href: "/expert/services",
    },
    {
      title: "Open calendar",
      text: "Availability for the next few days.",
      done: openSlots.length > 0,
      href: "/expert/availability",
    },
    {
      title: "Payouts ready",
      text: "Stripe onboarding submitted and payouts enabled.",
      done: hasStripePayouts,
      href: "/expert/earnings",
    },
    {
      title: "First trust signal",
      text: "At least one review or 3 completed calls.",
      done: expert.totalReviews > 0 || expert.totalSessions >= 3,
      href: "/expert/stats",
    },
  ];

  const completedChecklist = checklist.filter((item) => item.done).length;
  const setupProgress = Math.round((completedChecklist / checklist.length) * 100);

  const activeServiceCategoryIds = Array.from(
    new Set(activeServices.map((service) => service.categoryId).filter(Boolean)),
  ) as string[];
  const activeServiceSubcategoryIds = Array.from(
    new Set(activeServices.map((service) => service.subcategoryId).filter(Boolean)),
  ) as string[];
  const activeServiceHelpTypes = Array.from(
    new Set(activeServices.map((service) => service.helpType).filter(Boolean)),
  ) as HelpType[];

  const incomingHelpRequests =
    activeServices.length > 0
      ? await prisma.helpRequest.findMany({
          where: {
            status: {
              in: [HelpRequestStatus.OPEN, HelpRequestStatus.MATCHED],
            },
            OR: [
              activeServiceCategoryIds.length > 0
                ? { categoryId: { in: activeServiceCategoryIds } }
                : undefined,
              activeServiceSubcategoryIds.length > 0
                ? { subcategoryId: { in: activeServiceSubcategoryIds } }
                : undefined,
              activeServiceHelpTypes.length > 0
                ? { helpType: { in: activeServiceHelpTypes } }
                : undefined,
              expert.skills[0] || expert.tags[0]
                ? {
                    query: {
                      contains: expert.skills[0] ?? expert.tags[0],
                      mode: "insensitive",
                    },
                  }
                : undefined,
            ].filter(Boolean) as any,
          },
          include: {
            category: true,
            subcategory: true,
            buyer: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 4,
        })
      : [];

  const avatarLetter = (
    helperName.charAt(0) ||
    helperEmail.charAt(0) ||
    "H"
  ).toUpperCase();

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-[radial-gradient(circle_at_top_left,var(--primary-soft),transparent_34%),linear-gradient(135deg,var(--background),var(--background-soft))]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          {resolvedSearchParams.profile === "created" ? (
            <div className="mb-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]">
              Your helper profile is live. Add availability so clients can book your calls.
            </div>
          ) : null}

          <div className="grid gap-8 xl:grid-cols-[1fr_360px] xl:items-stretch">
            <div className="flex min-h-[340px] flex-col justify-between rounded-[34px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-md)] md:p-8">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={expert.isVerified ? "success" : "accent"}>
                    {expert.isVerified ? <BadgeCheck size={14} /> : <ShieldCheck size={14} />}
                    {expert.isVerified ? "Verified helper" : "Verification in progress"}
                  </Badge>

                  <Badge variant={isBookable ? "success" : "accent"}>
                    {isBookable ? <CheckCircle2 size={14} /> : <ListChecks size={14} />}
                    {isBookable ? "Bookable" : "Setup required"}
                  </Badge>

                  {disputedBookings.length > 0 ? (
                    <Badge variant="danger">
                      <ShieldAlert size={14} />
                      {disputedBookings.length} disputed
                    </Badge>
                  ) : null}
                </div>

                <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                  Welcome back, {helperName}.
                </h1>

                <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                  This dashboard is now your expert cockpit: next call, setup readiness, buyer demand and the exact actions that make your profile bookable.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <HeroStat label="Today" value={`${todaysBookings.length} calls`} hint={`${todaysOpenSlots.length} open windows`} />
                <HeroStat label="Setup" value={`${setupProgress}%`} hint={`${completedChecklist}/${checklist.length} ready`} />
                <HeroStat label="Net confirmed" value={formatMoney(upcomingRevenueCents)} hint="Estimated helper net" />
              </div>
            </div>

            <Card className="flex flex-col justify-between overflow-hidden p-6">
              <div>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-2xl font-black text-white shadow-[var(--shadow-sm)]">
                    {avatarLetter}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xl font-black tracking-[-0.04em]">{helperName}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-muted">
                      {expert.headline || "Practical help through short calls"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <ReadinessLine label="Offer" done={activeServices.length > 0} />
                  <ReadinessLine label="Availability" done={openSlots.length > 0} />
                  <ReadinessLine label="Payouts" done={hasStripePayouts} />
                  <ReadinessLine label="Trust" done={expert.isVerified || expert.totalReviews > 0} />
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <ButtonLink href={isBookable ? `/experts/${expert.id}` : nextSetupHref}>
                  {isBookable ? "View public profile" : "Complete setup"}
                  <ArrowRight size={18} />
                </ButtonLink>

                <div className="grid grid-cols-2 gap-3">
                  <ButtonLink href="/expert/availability" variant="secondary">
                    <Plus size={17} />
                    Availability
                  </ButtonLink>
                  <ButtonLink href="/expert/settings" variant="secondary">
                    <Settings size={17} />
                    Settings
                  </ButtonLink>
                </div>

                <SignOutButton />
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6">
          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <NextCallPanel
              nextBooking={nextBooking}
              nextOpenSlots={nextOpenSlots}
              openSlotsCount={openSlots.length}
              completedWithoutOutcomeCount={completedWithoutOutcome.length}
            />

            <SetupCommandCenter
              isBookable={isBookable}
              missingBookableSteps={missingBookableSteps}
              nextSetupHref={nextSetupHref}
              checklist={checklist}
              completedChecklist={completedChecklist}
            />
          </div>

          {(pendingBookings.length > 0 || paidBookings.length > 0 || disputedBookings.length > 0 || completedWithoutOutcome.length > 0) ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {pendingBookings.length > 0 ? (
                <AttentionCard
                  icon={Clock3}
                  title="Payment waiting"
                  value={String(pendingBookings.length)}
                  text="Reserved slots where the client has not completed payment."
                  href="/expert/bookings"
                  variant="warning"
                />
              ) : null}

              {paidBookings.length > 0 ? (
                <AttentionCard
                  icon={WalletCards}
                  title="Paid processing"
                  value={String(paidBookings.length)}
                  text="Paid bookings that may still need confirmation or webhook review."
                  href="/expert/bookings"
                  variant="primary"
                />
              ) : null}

              {completedWithoutOutcome.length > 0 ? (
                <AttentionCard
                  icon={ListChecks}
                  title="Action plans due"
                  value={String(completedWithoutOutcome.length)}
                  text="Completed calls without a written outcome for the buyer."
                  href="/expert/outcomes"
                  variant="primary"
                />
              ) : null}

              {disputedBookings.length > 0 ? (
                <AttentionCard
                  icon={ShieldAlert}
                  title="Disputes"
                  value={String(disputedBookings.length)}
                  text="Bookings under SkillDrop admin review."
                  href="/expert/bookings"
                  variant="danger"
                />
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="grid gap-6">
              <IncomingHelpRequestsPanel
                requests={incomingHelpRequests}
                expertId={expert.id}
                defaultServiceId={activeServices[0]?.id ?? ""}
              />

              <Card className="p-5 md:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <Badge variant="primary">
                      <CalendarDays size={14} />
                      Upcoming availability
                    </Badge>
                    <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                      {openSlots.length > 0 ? `${openSlots.length} open windows` : "No open availability"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      Buyers can book calls inside these future windows.
                    </p>
                  </div>
                  <ButtonLink href="/expert/availability" variant="secondary">
                    Manage
                  </ButtonLink>
                </div>

                <div className="mt-5 grid gap-2">
                  {nextOpenSlots.length > 0 ? (
                    nextOpenSlots.map((slot) => <SlotRow key={slot.id} slot={slot} />)
                  ) : (
                    <EmptyMini
                      title="Add your first windows"
                      text="A profile without availability is hard to book, even with good services."
                      href="/expert/availability"
                      cta="Add availability"
                    />
                  )}
                </div>
              </Card>
            </div>

            <div className="grid gap-6">
              <WorkspacePanel />

              <div className="grid gap-6 lg:grid-cols-2">
                <PerformancePanel
                  rating={expert.rating}
                  totalReviews={expert.totalReviews}
                  totalSessions={expert.totalSessions}
                  activeServicesCount={activeServices.length}
                  completedRevenueCents={completedRevenueCents}
                  hasStripePayouts={hasStripePayouts}
                />

                <Card className="p-5 md:p-6">
                  <Badge variant="accent">
                    <Lightbulb size={14} />
                    Smart next step
                  </Badge>
                  <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">Recommended action</h2>
                  <p className="mt-3 min-h-[96px] text-sm font-semibold leading-6 text-muted">
                    {getSmartTip({
                      hasServices: activeServices.length > 0,
                      hasAvailability: openSlots.length > 0,
                      hasReviews: expert.reviews.length > 0,
                      hasStrongBio: bio.trim().length >= 120,
                      hasStripePayouts,
                      hasPendingPayment: pendingBookings.length > 0,
                      hasDisputes: disputedBookings.length > 0,
                      hasCompletedWithoutOutcome: completedWithoutOutcome.length > 0,
                    })}
                  </p>
                  <ButtonLink
                    href={getSmartTipHref({
                      hasServices: activeServices.length > 0,
                      hasAvailability: openSlots.length > 0,
                      hasReviews: expert.reviews.length > 0,
                      hasStrongBio: bio.trim().length >= 120,
                      hasStripePayouts,
                      hasPendingPayment: pendingBookings.length > 0,
                      hasDisputes: disputedBookings.length > 0,
                      hasCompletedWithoutOutcome: completedWithoutOutcome.length > 0,
                    })}
                    variant="secondary"
                  >
                    Open
                    <ArrowRight size={18} />
                  </ButtonLink>
                </Card>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ExpertProfileCompletenessCard quality={quality} />
            <ExpertVerificationCard
              totalSessions={expert.totalSessions}
              totalReviews={expert.totalReviews}
              rating={expert.rating}
              isVerified={expert.isVerified}
            />
          </div>

          <UnreadNotificationsCard userId={expert.user.id} email={helperEmail} />
        </div>
      </section>
    </main>
  );
}

function HeroStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-[-0.05em]">{value}</p>
      <p className="mt-1 text-sm font-semibold text-muted">{hint}</p>
    </div>
  );
}

function ReadinessLine({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-3">
      <p className="text-sm font-black">{label}</p>
      <span className={done ? "text-[var(--success)]" : "text-[var(--accent)]"}>
        {done ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
      </span>
    </div>
  );
}

function NextCallPanel({
  nextBooking,
  nextOpenSlots,
  openSlotsCount,
  completedWithoutOutcomeCount,
}: {
  nextBooking: {
    id: string;
    note: string | null;
    startTime: Date;
    endTime: Date;
    status: BookingStatus;
    priceCents: number;
    providerNetCents?: number | null;
    platformFeeCents?: number | null;
    buyer: { name: string | null; email: string };
    service: { title: string };
    callRoom: { roomUrl: string } | null;
  } | null;
  nextOpenSlots: {
    id: string;
    startTime: Date;
    endTime: Date;
    isActive: boolean;
    bookings: { startTime: Date; endTime: Date; status: BookingStatus }[];
  }[];
  openSlotsCount: number;
  completedWithoutOutcomeCount: number;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] bg-[var(--card-soft)] p-5 md:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Badge variant="primary">
              <Video size={14} />
              Live work
            </Badge>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
              {nextBooking ? "Next call command center" : "No booked call right now"}
            </h2>
          </div>
          <ButtonLink href="/expert/bookings" variant="secondary">
            All bookings
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="p-5 md:p-6">
          {nextBooking ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant={nextBooking.status === BookingStatus.CONFIRMED ? "success" : "accent"}>
                  {formatStatus(nextBooking.status)}
                </Badge>
                <Badge>{formatDateTime(nextBooking.startTime)}</Badge>
              </div>

              <h3 className="mt-5 text-3xl font-black tracking-[-0.05em]">
                {nextBooking.service?.title ?? "Helper call"}
              </h3>
              <p className="mt-2 text-sm font-bold text-muted">
                Client: {nextBooking.buyer.name ?? nextBooking.buyer.email}
              </p>

              {nextBooking.note ? (
                <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
                  <div className="flex gap-3">
                    <MessageCircle size={18} className="mt-0.5 shrink-0 text-[var(--primary-dark)]" />
                    <div>
                      <p className="text-sm font-black">Problem brief</p>
                      <p className="mt-1 line-clamp-5 whitespace-pre-wrap text-sm font-semibold leading-6 text-muted">
                        {nextBooking.note}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--card-soft)] p-4">
                  <p className="text-sm font-bold text-muted">No buyer note was added for this call.</p>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {canJoinBooking(nextBooking) ? (
                  <Link href={`/calls/${nextBooking.id}`} className="btn btn-primary">
                    Join call
                    <Video size={17} />
                  </Link>
                ) : null}
                <ButtonLink href="/expert/bookings" variant={canJoinBooking(nextBooking) ? "secondary" : "primary"}>
                  Prepare call
                  <ArrowRight size={17} />
                </ButtonLink>
              </div>
            </>
          ) : (
            <EmptyMini
              title={openSlotsCount > 0 ? "Your calendar is open" : "Add availability to become bookable"}
              text={openSlotsCount > 0 ? "Clients can book your open windows. Keep your next 7 days fresh." : "Without open windows, buyers cannot choose a time."}
              href="/expert/availability"
              cta={openSlotsCount > 0 ? "Review availability" : "Add availability"}
            />
          )}
        </div>

        <div className="border-t border-[var(--border)] bg-[var(--background-soft)] p-5 md:p-6 lg:border-l lg:border-t-0">
          <h3 className="text-xl font-black tracking-[-0.04em]">Today’s focus</h3>
          <div className="mt-5 grid gap-3">
            <FocusRow
              icon={Clock3}
              title="Keep calendar fresh"
              text={nextOpenSlots[0] ? `${formatShortDate(nextOpenSlots[0].startTime)} · ${formatTime(nextOpenSlots[0].startTime)}–${formatTime(nextOpenSlots[0].endTime)}` : "No upcoming open window"}
              href="/expert/availability"
            />
            <FocusRow
              icon={ListChecks}
              title="Action plans"
              text={completedWithoutOutcomeCount > 0 ? `${completedWithoutOutcomeCount} outcome missing` : "No action plan due"}
              href="/expert/outcomes"
            />
            <FocusRow
              icon={Sparkles}
              title="Improve conversion"
              text="Make your best offer specific and result-oriented."
              href="/expert/services"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function SetupCommandCenter({
  isBookable,
  missingBookableSteps,
  nextSetupHref,
  checklist,
  completedChecklist,
}: {
  isBookable: boolean;
  missingBookableSteps: string[];
  nextSetupHref: string;
  checklist: { title: string; text: string; done: boolean; href: string }[];
  completedChecklist: number;
}) {
  return (
    <Card className={isBookable ? "border-[var(--success)]/20 bg-[var(--success-soft)] p-5 md:p-6" : "border-[var(--warning)]/20 bg-[var(--warning-soft)] p-5 md:p-6"}>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--background-soft)] text-[var(--primary-dark)]">
          {isBookable ? <CheckCircle2 size={22} /> : <ShieldCheck size={22} />}
        </div>
        <div>
          <Badge variant={isBookable ? "success" : "accent"}>
            {completedChecklist}/{checklist.length} complete
          </Badge>
          <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
            {isBookable ? "Ready for paid bookings" : "Finish your launch setup"}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted">
            {isBookable
              ? "Your offer, calendar and payout setup are ready. Keep availability fresh."
              : `Next: ${missingBookableSteps.join(", ")}.`}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-2">
        {checklist.map((item) => <ChecklistRow key={item.title} item={item} />)}
      </div>

      <div className="mt-6">
        <ButtonLink href={nextSetupHref}>
          {isBookable ? "View buyer profile" : "Continue setup"}
          <ArrowRight size={18} />
        </ButtonLink>
      </div>
    </Card>
  );
}

function WorkspacePanel() {
  return (
    <Card className="p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge variant="primary">
            <Zap size={14} />
            Workspace
          </Badge>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
            Manage your helper business
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Different areas, different jobs. No more identical dashboard boxes.
          </p>
        </div>
        <ButtonLink href="/notifications" variant="secondary">
          <Bell size={17} />
          Notifications
        </ButtonLink>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {workspaceLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group">
              <div className="h-full rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4 transition group-hover:-translate-y-1 group-hover:border-[var(--border-strong)] group-hover:bg-[var(--background-soft)] group-hover:shadow-[var(--shadow-sm)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                    <Icon size={19} />
                  </div>
                  <ArrowRight size={16} className="text-muted transition group-hover:translate-x-1 group-hover:text-[var(--primary-dark)]" />
                </div>
                <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-muted">{item.tone}</p>
                <h3 className="mt-2 text-lg font-black tracking-[-0.03em]">{item.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-muted">{item.text}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function PerformancePanel({
  rating,
  totalReviews,
  totalSessions,
  activeServicesCount,
  completedRevenueCents,
  hasStripePayouts,
}: {
  rating: number;
  totalReviews: number;
  totalSessions: number;
  activeServicesCount: number;
  completedRevenueCents: number;
  hasStripePayouts: boolean;
}) {
  return (
    <Card className="p-5 md:p-6">
      <Badge variant="success">
        <BarChart3 size={14} />
        Performance
      </Badge>
      <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">Snapshot</h2>
      <div className="mt-5 grid gap-3">
        <MoneyRow label="Completed net" value={formatMoney(completedRevenueCents)} />
        <MoneyRow label="Rating" value={rating ? rating.toFixed(1) : "New"} />
        <MoneyRow label="Reviews" value={String(totalReviews)} />
        <MoneyRow label="Completed calls" value={String(totalSessions)} />
        <MoneyRow label="Active offers" value={String(activeServicesCount)} />
        <MoneyRow label="Stripe payouts" value={hasStripePayouts ? "Ready" : "Missing"} />
      </div>
    </Card>
  );
}

function AttentionCard({
  icon: Icon,
  title,
  value,
  text,
  href,
  variant,
}: {
  icon: typeof Clock3;
  title: string;
  value: string;
  text: string;
  href: string;
  variant: "warning" | "primary" | "danger";
}) {
  const className =
    variant === "warning"
      ? "border-[var(--warning)]/20 bg-[var(--warning-soft)]"
      : variant === "danger"
        ? "border-[var(--danger)]/20 bg-[var(--danger-soft)]"
        : "border-[var(--primary)]/20 bg-[var(--primary-soft)]";

  return (
    <Link href={href} className="group">
      <Card className={`h-full p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-md)] ${className}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--background-soft)] text-[var(--primary-dark)]">
            <Icon size={21} />
          </div>
          <p className="text-3xl font-black tracking-[-0.05em]">{value}</p>
        </div>
        <h3 className="mt-5 text-xl font-black tracking-[-0.03em]">{title}</h3>
        <p className="mt-2 text-sm font-bold leading-6 text-muted">{text}</p>
        <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]">
          Open
          <ArrowRight size={16} />
        </div>
      </Card>
    </Link>
  );
}

function FocusRow({
  icon: Icon,
  title,
  text,
  href,
}: {
  icon: typeof Clock3;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-4 transition hover:bg-[var(--card-soft)] hover:shadow-[var(--shadow-sm)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-black tracking-[-0.02em]">{title}</p>
        <p className="mt-1 truncate text-sm font-semibold text-muted">{text}</p>
      </div>
      <ArrowRight size={16} className="text-muted transition group-hover:translate-x-1" />
    </Link>
  );
}

function SlotRow({
  slot,
}: {
  slot: {
    id: string;
    startTime: Date;
    endTime: Date;
    isActive: boolean;
    bookings: {
      startTime: Date;
      endTime: Date;
      status: BookingStatus;
    }[];
  };
}) {
  const freeMinutes = getWindowFreeMinutes(slot);
  return (
    <Link href="/expert/availability" className="flex items-center justify-between gap-4 rounded-[20px] border border-[var(--border)] bg-[var(--card-soft)] p-3 transition hover:bg-[var(--background-soft)] hover:shadow-[var(--shadow-sm)]">
      <div>
        <p className="font-black tracking-[-0.02em]">
          {formatShortDate(slot.startTime)} · {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
        </p>
        <p className="mt-1 text-xs font-bold text-muted">{freeMinutes} min free</p>
      </div>
      <ArrowRight size={16} className="text-muted" />
    </Link>
  );
}

function ChecklistRow({
  item,
}: {
  item: {
    title: string;
    text: string;
    done: boolean;
    href: string;
  };
}) {
  return (
    <Link href={item.href} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 transition hover:bg-[var(--background-soft)] hover:shadow-[var(--shadow-sm)]">
      <div className={item.done ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]" : "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"}>
        {item.done ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
      </div>
      <div className="min-w-0">
        <p className="font-black tracking-[-0.02em]">{item.title}</p>
        <p className="mt-1 line-clamp-1 text-xs font-semibold text-muted">{item.text}</p>
      </div>
    </Link>
  );
}

function EmptyMini({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card-soft)] p-5">
      <p className="font-black tracking-[-0.02em]">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-muted">{text}</p>
      <div className="mt-4">
        <ButtonLink href={href} variant="secondary">
          {cta}
          <ArrowRight size={17} />
        </ButtonLink>
      </div>
    </div>
  );
}

function MoneyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="text-right font-black">{value}</p>
    </div>
  );
}

function IncomingHelpRequestsPanel({
  requests,
  expertId,
  defaultServiceId,
}: {
  requests: {
    id: string;
    query: string;
    helpType: HelpType | null;
    urgency: string;
    budgetMaxCents: number | null;
    preferredLanguage: string | null;
    createdAt: Date;
    category: { name: string; slug: string } | null;
    subcategory: { name: string; slug: string } | null;
    buyer: { name: string | null; email: string } | null;
  }[];
  expertId: string;
  defaultServiceId: string;
}) {
  return (
    <Card className="p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge variant="primary">
            <Sparkles size={14} />
            Matching demand
          </Badge>
          <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
            Buyer problems for you
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted">
            Real problem requests that match your categories, help types or skills.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {requests.length > 0 ? (
          requests.map((request) => {
            const params = new URLSearchParams({ requestId: request.id });
            if (defaultServiceId) params.set("service", defaultServiceId);

            return (
              <Link key={request.id} href={`/experts/${expertId}?${params.toString()}`} className="group">
                <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)] p-4 transition group-hover:-translate-y-0.5 group-hover:bg-[var(--background-soft)] group-hover:shadow-[var(--shadow-sm)]">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="accent">{request.subcategory?.name ?? request.category?.name ?? "Open problem"}</Badge>
                    {request.helpType ? <Badge>{request.helpType.replaceAll("_", " ")}</Badge> : null}
                    {request.preferredLanguage ? <Badge>{request.preferredLanguage}</Badge> : null}
                  </div>
                  <h3 className="mt-4 line-clamp-3 font-black leading-6 tracking-[-0.02em]">{request.query}</h3>
                  <div className="mt-4 flex items-center justify-between gap-3 text-xs font-black text-[var(--muted-foreground)]">
                    <span>{formatShortDate(request.createdAt)}</span>
                    <span>{request.budgetMaxCents ? `Up to ${formatMoney(request.budgetMaxCents)}` : "Budget open"}</span>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <EmptyMini
            title="No matching buyer demand yet"
            text="Improve your offer titles, tags and availability. Requests will appear here when buyers describe problems."
            href="/expert/services"
            cta="Improve offers"
          />
        )}
      </div>
    </Card>
  );
}

function canJoinBooking(booking: {
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  callRoom: {
    roomUrl: string;
  } | null;
}) {
  const now = new Date();
  const joinWindowStart = new Date(booking.startTime.getTime() - 10 * 60 * 1000);
  const joinWindowEnd = new Date(booking.endTime.getTime() + 15 * 60 * 1000);

  return (
    booking.status === BookingStatus.CONFIRMED &&
    Boolean(booking.callRoom?.roomUrl) &&
    now >= joinWindowStart &&
    now <= joinWindowEnd
  );
}

function getProviderNetCents(booking: {
  priceCents: number;
  providerNetCents?: number | null;
  platformFeeCents?: number | null;
}) {
  if (typeof booking.providerNetCents === "number") {
    return booking.providerNetCents;
  }

  if (typeof booking.platformFeeCents === "number") {
    return Math.max(booking.priceCents - booking.platformFeeCents, 0);
  }

  return Math.max(booking.priceCents - Math.round(booking.priceCents * 0.1), 0);
}

function getWindowFreeMinutes(window: {
  startTime: Date;
  endTime: Date;
  bookings: {
    startTime: Date;
    endTime: Date;
    status: BookingStatus;
  }[];
}) {
  const totalMinutes = getDurationMinutes(window.startTime, window.endTime);

  const bookedMinutes = window.bookings
    .filter((booking) => activeBookingStatuses.includes(booking.status))
    .reduce((sum, booking) => sum + getDurationMinutes(booking.startTime, booking.endTime), 0);

  return Math.max(totalMinutes - bookedMinutes, 0);
}

function getDurationMinutes(startTime: Date, endTime: Date) {
  return Math.max(Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60), 0);
}

function getSmartTip({
  hasServices,
  hasAvailability,
  hasReviews,
  hasStrongBio,
  hasStripePayouts,
  hasPendingPayment,
  hasDisputes,
  hasCompletedWithoutOutcome,
}: {
  hasServices: boolean;
  hasAvailability: boolean;
  hasReviews: boolean;
  hasStrongBio: boolean;
  hasStripePayouts: boolean;
  hasPendingPayment: boolean;
  hasDisputes: boolean;
  hasCompletedWithoutOutcome: boolean;
}) {
  if (hasDisputes) return "You have disputed bookings under admin review. Open bookings and check the affected sessions.";
  if (hasCompletedWithoutOutcome) return "Some completed calls still need an action plan. This is what makes SkillDrop stronger than a normal video call.";
  if (hasPendingPayment) return "Some clients reserved time but have not paid yet. Keep your availability fresh and wait for payment confirmation.";
  if (!hasStrongBio) return "Strengthen your biography so clients quickly understand who you help, why they can trust you and what they get from a call.";
  if (!hasServices) return "Create your first clear offer with price and duration. Clients book faster when the result is easy to understand.";
  if (!hasAvailability) return "Add open availability for the next 7 days. A profile without availability is hard to book.";
  if (!hasStripePayouts) return "Finish Stripe payouts before enabling real paid bookings.";
  if (!hasReviews) return "Complete your first calls and ask clients to leave a review. Reviews are one of the strongest trust signals.";
  return "Your workspace looks healthy. Keep availability fresh every week and improve your best-performing offer.";
}

function getSmartTipHref({
  hasServices,
  hasAvailability,
  hasReviews,
  hasStrongBio,
  hasStripePayouts,
  hasPendingPayment,
  hasDisputes,
  hasCompletedWithoutOutcome,
}: {
  hasServices: boolean;
  hasAvailability: boolean;
  hasReviews: boolean;
  hasStrongBio: boolean;
  hasStripePayouts: boolean;
  hasPendingPayment: boolean;
  hasDisputes: boolean;
  hasCompletedWithoutOutcome: boolean;
}) {
  if (hasDisputes || hasPendingPayment) return "/expert/bookings";
  if (hasCompletedWithoutOutcome) return "/expert/outcomes";
  if (!hasStrongBio) return "/expert/profile";
  if (!hasServices) return "/expert/services";
  if (!hasAvailability) return "/expert/availability";
  if (!hasStripePayouts) return "/expert/earnings";
  if (!hasReviews) return "/expert/bookings";
  return "/expert/stats";
}

function formatMoney(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".00", "")}`;
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

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatStatus(status: BookingStatus) {
  return status.toLowerCase().replaceAll("_", " ");
}
