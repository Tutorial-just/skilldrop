import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";
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
];

const inactiveBookingStatuses: BookingStatus[] = [
  BookingStatus.CANCELLED,
  BookingStatus.REFUNDED,
  BookingStatus.COMPLETED,
  BookingStatus.DISPUTED,
];

const workspaceLinks = [
  {
    title: "Profile",
    text: "Edit biography, skills, languages and public details.",
    href: "/expert/profile",
    icon: UserRound,
  },
  {
    title: "Offers",
    text: "Manage bookable services, prices and duration.",
    href: "/expert/services",
    icon: WalletCards,
  },
  {
    title: "Availability",
    text: "Add availability windows and manage your calendar.",
    href: "/expert/availability",
    icon: CalendarDays,
  },
  {
    title: "Bookings",
    text: "See upcoming calls and manage sessions.",
    href: "/expert/bookings",
    icon: Video,
  },
  {
    title: "Notifications",
    text: "See booking updates, payments, refunds, disputes and review requests.",
    href: "/notifications",
    icon: Bell,
  },
  {
    title: "Earnings",
    text: "Track completed calls, estimated fees and payout-ready income.",
    href: "/expert/earnings",
    icon: CircleDollarSign,
  },
  {
    title: "Statistics",
    text: "Track revenue, calls, rating and growth.",
    href: "/expert/stats",
    icon: BarChart3,
  },
  {
    title: "Settings",
    text: "Appearance, visibility, privacy and booking rules.",
    href: "/expert/settings",
    icon: Settings,
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
        },
        orderBy: {
          createdAt: "desc",
        },
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
              id: true,
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
        take: 24,
      },
      bookings: {
        where: {
          startTime: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: {
          startTime: "asc",
        },
        take: 100,
        include: {
          buyer: true,
          service: true,
          callRoom: true,
        },
      },
      reviews: {
        orderBy: {
          createdAt: "desc",
        },
        take: 4,
      },
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  const bio = expert.bio ?? "";
  const providerName = expert.user.name || "Provider";
  const providerEmail = expert.user.email || email;

  const activeServices = expert.services.filter((service) => service.isActive);
  const quality = getExpertQuality({
    image: null,
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
  const openSlots = expert.availability.filter(
    (window) =>
      window.isActive &&
      window.endTime >= now &&
      getWindowFreeMinutes(window) > 0,
  );

  const nextOpenSlots = openSlots.slice(0, 8);

  const hasStripePayouts = Boolean(expert.stripeAccountId);

  const isBookable =
    activeServices.length > 0 && openSlots.length > 0 && hasStripePayouts;

  const missingBookableSteps = [
    activeServices.length === 0 ? "create at least one active offer" : null,
    openSlots.length === 0 ? "add open availability" : null,
    !hasStripePayouts ? "connect Stripe payouts" : null,
  ].filter(Boolean);

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
        !inactiveBookingStatuses.includes(booking.status),
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
  const nextTodayOpenSlot = todaysOpenSlots[0] ?? null;

  const upcomingRevenueCents = confirmedBookings.reduce(
    (sum, booking) => sum + getProviderNetCents(booking),
    0,
  );

  const completedRevenueCents = completedBookings.reduce(
    (sum, booking) => sum + getProviderNetCents(booking),
    0,
  );

  const profileScore = calculateProfileScore({
    hasHeadline: Boolean(expert.headline?.trim()),
    hasBio: bio.trim().length >= 120,
    hasSkills: expert.skills.length >= 3,
    hasLanguages: expert.languages.length > 0,
    hasServices: activeServices.length > 0,
    hasAvailability: openSlots.length > 0,
    hasStripePayouts,
    isVerified: expert.isVerified,
  });

  const verificationProgress = calculateVerificationProgress({
    totalSessions: expert.totalSessions,
    rating: expert.rating,
    isVerified: expert.isVerified,
  });

  const checklist = [
    {
      title: "Complete public profile",
      text: "Add a strong biography, headline, languages and skills.",
      done:
        Boolean(expert.headline?.trim()) &&
        bio.trim().length >= 120 &&
        expert.skills.length >= 3 &&
        expert.languages.length > 0,
      href: "/expert/profile",
    },
    {
      title: "Create at least one offer",
      text: "Clients need a clear service to book.",
      done: activeServices.length > 0,
      href: "/expert/services",
    },
    {
      title: "Add open availability",
      text: "Open windows make your profile bookable.",
      done: openSlots.length > 0,
      href: "/expert/availability",
    },
    {
      title: "Connect Stripe payouts",
      text: "Required before clients can safely book and pay you.",
      done: hasStripePayouts,
      href: "/expert/earnings",
    },
    {
      title: "Complete first 3 calls",
      text: "This helps unlock verification.",
      done: expert.totalSessions >= 3,
      href: "/expert/bookings",
    },
    {
      title: "Earn client reviews",
      text: "Reviews make future clients trust you faster.",
      done: expert.totalReviews > 0,
      href: "/expert/stats",
    },
  ];

  const completedChecklist = checklist.filter((item) => item.done).length;
  const checklistProgress = Math.round(
    (completedChecklist / checklist.length) * 100,
  );

  const avatarLetter = (
    providerName.charAt(0) ||
    providerEmail.charAt(0) ||
    "P"
  ).toUpperCase();

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          {resolvedSearchParams.profile === "created" ? (
            <div className="mb-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black text-[var(--success)]">
              Your provider profile is live. Add availability so clients can book your calls.
            </div>
          ) : null}

          <div className="grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={expert.isVerified ? "success" : "accent"}>
                  {expert.isVerified ? (
                    <>
                      <BadgeCheck size={14} />
                      Verified provider
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      Verification in progress
                    </>
                  )}
                </Badge>

                <Badge variant={isBookable ? "success" : "accent"}>
                  {isBookable ? (
                    <>
                      <CheckCircle2 size={14} />
                      Ready to accept bookings
                    </>
                  ) : (
                    <>
                      <ListChecks size={14} />
                      Setup required
                    </>
                  )}
                </Badge>

                {disputedBookings.length > 0 ? (
                  <Badge variant="danger">
                    <ShieldAlert size={14} />
                    {disputedBookings.length} disputed
                  </Badge>
                ) : null}
              </div>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Welcome back, {providerName}.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Your workspace for calls, offers, availability, payouts, profile
                growth and client trust.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
              <ButtonLink href={`/experts/${expert.id}`}>
                <Eye size={18} />
                Public profile
              </ButtonLink>

              <ButtonLink href="/expert/availability" variant="secondary">
                <Plus size={18} />
                Add availability
              </ButtonLink>

              <SignOutButton />
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              icon={Video}
              label="Calls today"
              value={String(todaysBookings.length)}
              hint={`${todaysOpenSlots.length} open windows today`}
            />

            <MetricCard
              icon={CalendarDays}
              label="Open windows"
              value={String(openSlots.length)}
              hint="Future bookable availability"
            />

            <MetricCard
              icon={CircleDollarSign}
              label="Confirmed net"
              value={formatMoney(upcomingRevenueCents)}
              hint="Estimated provider net"
            />

            <MetricCard
              icon={Star}
              label="Rating"
              value={expert.rating ? expert.rating.toFixed(1) : "New"}
              hint={`${expert.totalReviews} reviews`}
            />

            <MetricCard
              icon={WalletCards}
              label="Payouts"
              value={hasStripePayouts ? "Ready" : "Missing"}
              hint={hasStripePayouts ? "Stripe connected" : "Connect before launch"}
            />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-5">
          <ExpertProfileCompletenessCard quality={quality}/>
          <ExpertVerificationCard
            totalSessions={expert.totalSessions}
            totalReviews={expert.totalReviews}
            rating={expert.rating}
            isVerified={expert.isVerified}
          />
          {!isBookable ? (
            <Card className="border-[var(--warning)]/20 bg-[var(--warning-soft)] p-5 md:p-6">
              <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/70 text-[var(--warning)]">
                  <ShieldCheck size={24} />
                </div>

                <div>
                  <h2 className="text-2xl font-black tracking-[-0.04em]">
                    Your profile is not ready for paid bookings yet
                  </h2>

                  <p className="mt-2 leading-7 text-muted">
                    Complete this before connecting real payments:{" "}
                    <span className="font-black text-[var(--foreground)]">
                      {missingBookableSteps.join(", ")}
                    </span>
                    .
                  </p>
                </div>

                <ButtonLink href={nextSetupHref}>
                  Complete setup
                  <ArrowRight size={18} />
                </ButtonLink>
              </div>
            </Card>
          ) : (
            <Card className="border-[var(--success)]/20 bg-[var(--success-soft)] p-5 md:p-6">
              <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/70 text-[var(--success)]">
                  <CheckCircle2 size={24} />
                </div>

                <div>
                  <h2 className="text-2xl font-black tracking-[-0.04em]">
                    Your profile is ready for paid bookings
                  </h2>

                  <p className="mt-2 leading-7 text-muted">
                    You have an active offer, open availability and Stripe payouts
                    connected.
                  </p>
                </div>

                <ButtonLink href={`/experts/${expert.id}`}>
                  View public profile
                  <Eye size={18} />
                </ButtonLink>
              </div>
            </Card>
          )}

          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="p-5 md:p-6">
              {nextBooking ? (
                <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
                  <div>
                    <Badge variant="primary">
                      <Sparkles size={14} />
                      Today
                    </Badge>

                    <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                      {todaysBookings.length > 0
                        ? "Your next call is ready."
                        : "Your next call is upcoming."}
                    </h2>

                    <p className="mt-3 leading-7 text-muted">
                      {todaysBookings.length > 0
                        ? "Prepare for your next session today."
                        : "You have no booked calls today, but a future call is already scheduled."}
                    </p>

                    {nextBooking.note ? (
                      <div className="mt-5 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
                        <div className="flex gap-3">
                          <MessageCircle
                            size={18}
                            className="mt-0.5 shrink-0 text-[var(--primary-dark)]"
                          />

                          <div>
                            <p className="text-sm font-black">Client note</p>
                            <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm font-semibold leading-6 text-muted">
                              {nextBooking.note}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <ButtonLink href="/expert/bookings">
                        View bookings
                        <Video size={18} />
                      </ButtonLink>

                      <ButtonLink href="/expert/availability" variant="secondary">
                        Add availability
                        <Plus size={18} />
                      </ButtonLink>
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-[var(--border)] bg-white/64 p-5">
                    <Badge variant="accent">
                      <Clock3 size={14} />
                      {todaysBookings.length > 0 ? "Next call today" : "Upcoming call"}
                    </Badge>

                    <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                      {nextBooking.service?.title ?? "Provider call"}
                    </h3>

                    <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                      Client: {nextBooking.buyer.name ?? nextBooking.buyer.email}
                    </p>

                    <p className="mt-4 text-sm font-black text-[var(--primary-dark)]">
                      {formatDateTime(nextBooking.startTime)}
                    </p>

                    <div className="mt-5 grid gap-3">
                      <SmallInfoRow
                        label="Status"
                        value={formatStatus(nextBooking.status)}
                      />

                      <SmallInfoRow
                        label="Provider net"
                        value={formatMoney(getProviderNetCents(nextBooking))}
                      />
                    </div>

                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                      {canJoinBooking(nextBooking) ? (
                        <Link
                          href={`/calls/${nextBooking.id}`}
                          className="btn btn-primary"
                        >
                          Join call
                          <Video size={17} />
                        </Link>
                      ) : null}

                      <Link href="/expert/bookings" className="btn btn-secondary">
                        View booking
                      </Link>
                    </div>

                    {nextBooking.status === BookingStatus.PENDING ? (
                      <p className="mt-4 rounded-2xl border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-3 text-sm font-bold text-[var(--warning)]">
                        Waiting for client payment.
                      </p>
                    ) : null}

                    {nextBooking.status === BookingStatus.PAID ? (
                      <p className="mt-4 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary-soft)] p-3 text-sm font-bold text-[var(--primary-dark)]">
                        Payment received. Confirmation may still be processing.
                      </p>
                    ) : null}

                    {nextBooking.status === BookingStatus.CONFIRMED ? (
                      <p className="mt-4 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-3 text-sm font-bold text-[var(--success)]">
                        Booking confirmed. The call room opens 10 minutes before start.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl">
                  <Badge variant="primary">
                    <Sparkles size={14} />
                    Today
                  </Badge>

                  <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                    {nextTodayOpenSlot
                      ? "You have open availability today."
                      : "No calls yet today."}
                  </h2>

                  <p className="mt-3 max-w-xl leading-7 text-muted">
                    {nextTodayOpenSlot
                      ? `Your next open window today is ${formatTime(
                          nextTodayOpenSlot.startTime,
                        )}–${formatTime(
                          nextTodayOpenSlot.endTime,
                        )}. Clients can book inside this window.`
                      : "You have no booked calls today. Add availability or improve offers to get your next client."}
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <ButtonLink href="/expert/availability">
                      Add availability
                      <Plus size={18} />
                    </ButtonLink>

                    <ButtonLink href="/expert/services" variant="secondary">
                      Improve offers
                    </ButtonLink>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <ListChecks size={14} />
                Setup checklist
              </Badge>

              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black tracking-[-0.05em]">
                    {checklistProgress}% complete
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    {completedChecklist} of {checklist.length} tasks done.
                  </p>
                </div>

                <p className="text-sm font-black text-[var(--primary-dark)]">
                  {checklistProgress >= 80 ? "Strong" : "Keep going"}
                </p>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[#8b5cf6]"
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>

              <div className="mt-5 grid gap-2">
                {checklist.map((item) => (
                  <ChecklistRow key={item.title} item={item} />
                ))}
              </div>
            </Card>
          </div>

          {pendingBookings.length > 0 || paidBookings.length > 0 || disputedBookings.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-3">
              {pendingBookings.length > 0 ? (
                <AttentionCard
                  icon={Clock3}
                  title="Waiting for payment"
                  value={String(pendingBookings.length)}
                  text="Clients reserved these times but payment is not completed yet."
                  href="/expert/bookings"
                  variant="warning"
                />
              ) : null}

              {paidBookings.length > 0 ? (
                <AttentionCard
                  icon={WalletCards}
                  title="Payment received"
                  value={String(paidBookings.length)}
                  text="These bookings are paid and may need confirmation or webhook review."
                  href="/expert/bookings"
                  variant="primary"
                />
              ) : null}

              {disputedBookings.length > 0 ? (
                <AttentionCard
                  icon={ShieldAlert}
                  title="Disputed bookings"
                  value={String(disputedBookings.length)}
                  text="These bookings are under SkillDrop admin review."
                  href="/expert/bookings"
                  variant="danger"
                />
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[0.86fr_1.14fr]">
            <div className="grid gap-5">
              <Card className="p-5 md:p-6">
                <Badge variant="primary">
                  <CalendarDays size={14} />
                  Upcoming availability
                </Badge>

                <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <h2 className="text-3xl font-black tracking-[-0.05em]">
                      {openSlots.length > 0
                        ? `${openSlots.length} future windows`
                        : "No open availability"}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-muted">
                      These are future availability windows where clients can book.
                    </p>
                  </div>

                  <ButtonLink href="/expert/availability" variant="secondary">
                    View calendar
                  </ButtonLink>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {nextOpenSlots.length > 0 ? (
                    nextOpenSlots.map((slot) => (
                      <SlotChip key={slot.id} slot={slot} />
                    ))
                  ) : (
                    <div className="w-full rounded-[22px] border border-dashed border-[var(--border-strong)] bg-white/55 p-5">
                      <p className="font-black">No bookable times yet</p>

                      <p className="mt-2 text-sm leading-6 text-muted">
                        Add availability so clients can choose a time.
                      </p>

                      <div className="mt-4">
                        <ButtonLink href="/expert/availability">
                          Add availability
                          <Plus size={17} />
                        </ButtonLink>
                      </div>
                    </div>
                  )}
                </div>

                {openSlots.length > nextOpenSlots.length ? (
                  <p className="mt-4 text-sm font-bold text-muted">
                    Showing {nextOpenSlots.length} of {openSlots.length}. Open
                    calendar to see all.
                  </p>
                ) : null}
              </Card>

              <Card className="p-5 md:p-6">
                <Badge variant="primary">
                  <UserRound size={14} />
                  Profile readiness
                </Badge>

                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-5xl font-black tracking-[-0.06em]">
                      {profileScore}%
                    </p>

                    <p className="mt-2 text-sm font-semibold text-muted">
                      Public profile strength
                    </p>
                  </div>

                  <ButtonLink href="/expert/profile" variant="secondary">
                    Edit
                  </ButtonLink>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[#8b5cf6]"
                    style={{ width: `${profileScore}%` }}
                  />
                </div>

                <div className="mt-5 grid gap-2">
                  <MiniCheck done={Boolean(expert.headline?.trim())} text="Headline added" />
                  <MiniCheck done={bio.trim().length >= 120} text="Strong biography" />
                  <MiniCheck done={expert.skills.length >= 3} text="Searchable skills" />
                  <MiniCheck done={expert.languages.length > 0} text="Languages added" />
                  <MiniCheck done={hasStripePayouts} text="Stripe payouts connected" />
                </div>
              </Card>

              
            </div>

            <div className="grid gap-5">
              <Card className="p-5 md:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <Badge variant="primary">
                      <WalletCards size={14} />
                      Workspace
                    </Badge>

                    <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                      Manage your provider business
                    </h2>

                    <p className="mt-3 max-w-2xl leading-7 text-muted">
                      Quick access to the tools you use most often.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {workspaceLinks.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Link key={item.href} href={item.href} className="group">
                        <div className="h-full rounded-[22px] border border-[var(--border)] bg-white/64 p-4 transition group-hover:-translate-y-0.5 group-hover:bg-white group-hover:shadow-[var(--shadow-sm)]">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                              <Icon size={18} />
                            </div>

                            <ArrowRight
                              size={16}
                              className="text-muted transition group-hover:translate-x-1 group-hover:text-[var(--primary-dark)]"
                            />
                          </div>

                          <h3 className="mt-4 text-lg font-black tracking-[-0.03em]">
                            {item.title}
                          </h3>

                          <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                            {item.text}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </Card>

              <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
                <Card className="p-5">
                  <Badge variant="success">
                    <CircleDollarSign size={14} />
                    Revenue snapshot
                  </Badge>

                  <div className="mt-5 grid gap-3">
                    <MoneyRow
                      label="Confirmed net"
                      value={formatMoney(upcomingRevenueCents)}
                    />

                    <MoneyRow
                      label="Completed net"
                      value={formatMoney(completedRevenueCents)}
                    />

                    <MoneyRow
                      label="Active offers"
                      value={String(activeServices.length)}
                    />

                    <MoneyRow
                      label="Waiting payment"
                      value={String(pendingBookings.length)}
                    />

                    <MoneyRow
                      label="Paid pending confirmation"
                      value={String(paidBookings.length)}
                    />

                    <MoneyRow
                      label="Disputed"
                      value={String(disputedBookings.length)}
                    />

                    <MoneyRow
                      label="Stripe payouts"
                      value={hasStripePayouts ? "Connected" : "Missing"}
                    />
                  </div>
                </Card>

                <Card className="p-5">
                  <Badge variant="accent">
                    <Eye size={14} />
                    Client preview
                  </Badge>

                  <div className="mt-5 flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-xl font-black text-white">
                      {avatarLetter}
                    </div>

                    <div className="min-w-0">
                      <p className="font-black tracking-[-0.02em]">
                        {providerName}
                      </p>

                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
                        {expert.headline || "Practical help through short calls"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {expert.skills.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-[var(--border)] bg-white/64 px-3 py-1 text-xs font-black text-[var(--muted-foreground)]"
                      >
                        #{skill}
                      </span>
                    ))}

                    {expert.skills.length === 0 ? (
                      <span className="text-sm font-semibold text-muted">
                        Add skills to improve discovery.
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5">
                    <ButtonLink href={`/experts/${expert.id}`} variant="secondary">
                      View as client
                    </ButtonLink>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          <UnreadNotificationsCard userId={expert.user.id} email={providerEmail} />

          <Card soft className="p-5 md:p-6">
            <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Lightbulb size={24} />
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-[-0.04em]">
                  Smart next step
                </h2>

                <p className="mt-2 leading-7 text-muted">
                  {getSmartTip({
                    hasServices: activeServices.length > 0,
                    hasAvailability: openSlots.length > 0,
                    hasReviews: expert.reviews.length > 0,
                    hasStrongBio: bio.trim().length >= 120,
                    hasStripePayouts,
                    hasPendingPayment: pendingBookings.length > 0,
                    hasDisputes: disputedBookings.length > 0,
                  })}
                </p>
              </div>

              <ButtonLink
                href={getSmartTipHref({
                  hasServices: activeServices.length > 0,
                  hasAvailability: openSlots.length > 0,
                  hasReviews: expert.reviews.length > 0,
                  hasStrongBio: bio.trim().length >= 120,
                  hasStripePayouts,
                  hasPendingPayment: pendingBookings.length > 0,
                  hasDisputes: disputedBookings.length > 0,
                })}
              >
                Open
                <ArrowRight size={18} />
              </ButtonLink>
            </div>
          </Card>
        </div>
      </section>
    </main>
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
      <Card
        className={`h-full p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-md)] ${className}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-[var(--primary-dark)]">
            <Icon size={21} />
          </div>

          <p className="text-3xl font-black tracking-[-0.05em]">{value}</p>
        </div>

        <h3 className="mt-5 text-xl font-black tracking-[-0.03em]">{title}</h3>

        <p className="mt-2 text-sm font-bold leading-6 text-muted">{text}</p>

        <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]">
          Open bookings
          <ArrowRight size={16} />
        </div>
      </Card>
    </Link>
  );
}

function SlotChip({
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
    <Link
      href="/expert/availability"
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/64 px-3 py-2 text-sm font-black text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[var(--shadow-sm)]"
      title={`${formatDateTime(slot.startTime)} — ${formatTime(slot.endTime)}`}
    >
      <Clock3 size={14} />

      <span>
        {formatShortDate(slot.startTime)} · {formatTime(slot.startTime)}–
        {formatTime(slot.endTime)}
      </span>

      <span className="rounded-full bg-[var(--primary-soft)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--primary-dark)]">
        {freeMinutes} min free
      </span>
    </Link>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Video;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card soft className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
          <Icon size={20} />
        </div>

        <ArrowRight size={16} className="text-muted" />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{value}</p>

      <p className="mt-1 text-sm font-semibold text-muted">{hint}</p>
    </Card>
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
    <Link
      href={item.href}
      className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/64 p-3 transition hover:bg-white hover:shadow-[var(--shadow-sm)]"
    >
      <div
        className={
          item.done
            ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]"
            : "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"
        }
      >
        {item.done ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
      </div>

      <div className="min-w-0">
        <p className="font-black tracking-[-0.02em]">{item.title}</p>

        <p className="mt-1 line-clamp-1 text-xs font-semibold text-muted">
          {item.text}
        </p>
      </div>
    </Link>
  );
}

function MiniCheck({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <div
        className={
          done
            ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--success-soft)] text-[var(--success)]"
            : "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"
        }
      >
        {done ? <BadgeCheck size={15} /> : <ShieldCheck size={15} />}
      </div>

      <p className="text-sm font-bold text-muted">{text}</p>
    </div>
  );
}

function TinyStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-xl font-black tracking-[-0.04em]">{value}</p>

      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
    </div>
  );
}

function MoneyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="font-black">{value}</p>
    </div>
  );
}

function SmallInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="text-right text-sm font-black">{value}</p>
    </div>
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

function calculateProfileScore({
  hasHeadline,
  hasBio,
  hasSkills,
  hasLanguages,
  hasServices,
  hasAvailability,
  hasStripePayouts,
  isVerified,
}: {
  hasHeadline: boolean;
  hasBio: boolean;
  hasSkills: boolean;
  hasLanguages: boolean;
  hasServices: boolean;
  hasAvailability: boolean;
  hasStripePayouts: boolean;
  isVerified: boolean;
}) {
  const checks = [
    hasHeadline,
    hasBio,
    hasSkills,
    hasLanguages,
    hasServices,
    hasAvailability,
    hasStripePayouts,
    isVerified,
  ];

  const completed = checks.filter(Boolean).length;

  return Math.round((completed / checks.length) * 100);
}

function calculateVerificationProgress({
  totalSessions,
  rating,
  isVerified,
}: {
  totalSessions: number;
  rating: number;
  isVerified: boolean;
}) {
  if (isVerified) {
    return 100;
  }

  const callProgress = Math.min(totalSessions / 3, 1) * 60;
  const ratingProgress = rating >= 3.8 ? 40 : rating > 0 ? 20 : 0;

  return Math.round(callProgress + ratingProgress);
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
    .reduce(
      (sum, booking) =>
        sum + getDurationMinutes(booking.startTime, booking.endTime),
      0,
    );

  return Math.max(totalMinutes - bookedMinutes, 0);
}

function getDurationMinutes(startTime: Date, endTime: Date) {
  return Math.max(
    Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60),
    0,
  );
}

function getSmartTip({
  hasServices,
  hasAvailability,
  hasReviews,
  hasStrongBio,
  hasStripePayouts,
  hasPendingPayment,
  hasDisputes,
}: {
  hasServices: boolean;
  hasAvailability: boolean;
  hasReviews: boolean;
  hasStrongBio: boolean;
  hasStripePayouts: boolean;
  hasPendingPayment: boolean;
  hasDisputes: boolean;
}) {
  if (hasDisputes) {
    return "You have disputed bookings under admin review. Open bookings and check the affected sessions.";
  }

  if (hasPendingPayment) {
    return "Some clients reserved time but have not paid yet. Keep your availability fresh and wait for payment confirmation.";
  }

  if (!hasStrongBio) {
    return "Strengthen your biography so clients understand who you help, why they can trust you, and what they will get from a call.";
  }

  if (!hasServices) {
    return "Create your first clear offer with price and duration. Clients book faster when the result is easy to understand.";
  }

  if (!hasAvailability) {
    return "Add open availability for the next 7 days. A profile without availability is harder for clients to book.";
  }

  if (!hasStripePayouts) {
    return "Connect Stripe payouts before enabling real paid bookings. Clients should only pay when your payout setup is ready.";
  }

  if (!hasReviews) {
    return "Complete your first calls and ask clients to leave a review. Reviews are one of the strongest trust signals.";
  }

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
}: {
  hasServices: boolean;
  hasAvailability: boolean;
  hasReviews: boolean;
  hasStrongBio: boolean;
  hasStripePayouts: boolean;
  hasPendingPayment: boolean;
  hasDisputes: boolean;
}) {
  if (hasDisputes || hasPendingPayment) {
    return "/expert/bookings";
  }

  if (!hasStrongBio) {
    return "/expert/profile";
  }

  if (!hasServices) {
    return "/expert/services";
  }

  if (!hasAvailability) {
    return "/expert/availability";
  }

  if (!hasStripePayouts) {
    return "/expert/earnings";
  }

  if (!hasReviews) {
    return "/expert/bookings";
  }

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
  if (status === BookingStatus.PENDING) {
    return "Pending payment";
  }

  if (status === BookingStatus.PAID) {
    return "Paid";
  }

  if (status === BookingStatus.CONFIRMED) {
    return "Confirmed";
  }

  if (status === BookingStatus.COMPLETED) {
    return "Completed";
  }

  if (status === BookingStatus.CANCELLED) {
    return "Cancelled";
  }

  if (status === BookingStatus.REFUNDED) {
    return "Refunded";
  }

  if (status === BookingStatus.DISPUTED) {
    return "Disputed";
  }

  return status.toLowerCase();
}