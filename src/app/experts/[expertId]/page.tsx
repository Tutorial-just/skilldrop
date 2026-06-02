import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Euro,
  FileText,
  Globe2,
  Languages,
  MessageCircle,
  Paperclip,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Video,
  WalletCards,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createBookingAction } from "@/server/actions/booking.actions";
import {
  saveExpertAction,
  unsaveExpertAction,
} from "@/server/actions/saved-expert.actions";
import {
  calculatePricingBreakdown,
  formatMoneyFromCents,
} from "@/config/pricing";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ExpertPublicPageProps = {
  params: Promise<{
    expertId: string;
  }>;
  searchParams?: Promise<{
    service?: string;
    error?: string;
    saved?: string;
  }>;
};

type GeneratedBookableTime = {
  id: string;
  availabilityId: string;
  startTime: Date;
  endTime: Date;
  windowStartTime: Date;
  windowEndTime: Date;
};

const MAX_VISIBLE_WINDOWS = 24;
const MAX_VISIBLE_TIMES = 80;
const MAX_BOOKING_NOTE_LENGTH = 500;
const BOOKING_STEP_MINUTES = 15;

const activeBookingStatuses: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.PAID,
  BookingStatus.CONFIRMED,
];

export default async function ExpertPublicPage({
  params,
  searchParams,
}: ExpertPublicPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const session = await getCurrentUser();

  const now = new Date();

  const expert = await prisma.expertProfile.findUnique({
    where: {
      id: resolvedParams.expertId,
    },
    include: {
      user: true,
      services: {
        where: {
          isActive: true,
        },
        include: {
          category: true,
        },
        orderBy: {
          priceCents: "asc",
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
        take: MAX_VISIBLE_WINDOWS,
      },
      reviews: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          rating: true,
          helpfulness: true,
          clarity: true,
          professionalism: true,
          wouldRecommend: true,
          problemSolved: true,
          comment: true,
          createdAt: true,
        },
        take: 20,
      },
      documents: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!expert) {
    notFound();
  }

  const currentUser = session.user;
  const normalizedRole = session.role?.toUpperCase() ?? null;
  const isAdmin = normalizedRole === "ADMIN";
  const isBuyer = normalizedRole === "BUYER" || isAdmin;
  const isOwnProfile = currentUser?.id === expert.userId;

  if (expert.status !== "APPROVED" && !isOwnProfile && !isAdmin) {
    notFound();
  }

  const canAcceptPayments =
    Boolean(expert.stripeAccountId) &&
    expert.stripeChargesEnabled &&
    expert.stripePayoutsEnabled &&
    expert.stripeDetailsSubmitted;

  const isProviderApproved = expert.status === "APPROVED";

  const selectedService =
    expert.services.find(
      (service) => service.id === resolvedSearchParams.service,
    ) ??
    expert.services[0] ??
    null;

  const selectedPricing = selectedService
    ? calculatePricingBreakdown(selectedService.priceCents)
    : null;

  const bookableTimes = selectedService
    ? generateBookableTimes({
        windows: expert.availability,
        durationMinutes: selectedService.durationMinutes,
        now,
      }).slice(0, MAX_VISIBLE_TIMES)
    : [];

  const groupedTimes = groupTimesByDate(bookableTimes);

  const hasServices = expert.services.length > 0;
  const hasOpenTimes = bookableTimes.length > 0;

  const canBook =
    Boolean(currentUser) &&
    isBuyer &&
    !isOwnProfile &&
    isProviderApproved &&
    canAcceptPayments &&
    Boolean(selectedService) &&
    hasOpenTimes;

  const bookingBlockedReason = getBookingBlockedReason({
    hasUser: Boolean(currentUser),
    isBuyer,
    isOwnProfile,
    isProviderApproved,
    canAcceptPayments,
    hasServices,
    hasOpenTimes,
  });

  const currentProfileUrl = `/experts/${expert.id}${
    selectedService ? `?service=${selectedService.id}` : ""
  }`;

  const signInHref = `/sign-in?next=${encodeURIComponent(currentProfileUrl)}`;

  const savedExpert =
    currentUser && isBuyer && !isOwnProfile
      ? await prisma.savedExpert.findUnique({
          where: {
            buyerId_expertId: {
              buyerId: currentUser.id,
              expertId: expert.id,
            },
          },
        })
      : null;

  const startingPrice =
    expert.services.length > 0
      ? Math.min(...expert.services.map((service) => service.priceCents))
      : null;

  const startingPricing = startingPrice
    ? calculatePricingBreakdown(startingPrice)
    : null;

  const matchScore = calculateMatchScore({
    rating: expert.rating,
    totalReviews: expert.totalReviews,
    totalSessions: expert.totalSessions,
    isVerified: expert.isVerified,
    openTimes: bookableTimes.length,
    reviews: expert.reviews,
  });

  const recommendationReviews = expert.reviews.filter(
    (review) => review.wouldRecommend !== null,
  );

  const recommendationRate =
    recommendationReviews.length > 0
      ? Math.round(
          (recommendationReviews.filter((review) => review.wouldRecommend)
            .length /
            recommendationReviews.length) *
            100,
        )
      : null;

  const solvedReviews = expert.reviews.filter(
    (review) => review.problemSolved === "YES",
  ).length;

  const partiallySolvedReviews = expert.reviews.filter(
    (review) => review.problemSolved === "PARTIALLY",
  ).length;

  const notSolvedReviews = expert.reviews.filter(
    (review) => review.problemSolved === "NO",
  ).length;

  const problemOutcomeTotal =
    solvedReviews + partiallySolvedReviews + notSolvedReviews;

  const problemSolvedRate =
    problemOutcomeTotal > 0
      ? Math.round((solvedReviews / problemOutcomeTotal) * 100)
      : null;

  const displayName = expert.user.name || "Helper";
  const avatarLetter = (
    expert.user.name?.charAt(0) ||
    expert.user.email.charAt(0) ||
    "H"
  ).toUpperCase();

  const bioText =
    expert.bio || "This helper has not added a detailed description yet.";

  const searchableKeywords = Array.from(
    new Set(
      [
        ...expert.skills,
        ...expert.tags,
        ...expert.languages,
        ...(expert.country ? [expert.country] : []),
        ...expert.services.flatMap((service) => [
          service.title,
          service.category?.name ?? "",
        ]),
      ].filter(Boolean),
    ),
  ).slice(0, 24);

  const mainHelpAreas = expert.services.slice(0, 3);

  const cvDocuments = expert.documents.filter(
    (document) => document.type === "CV",
  );

  const portfolioDocuments = expert.documents.filter(
    (document) => document.type === "PORTFOLIO",
  );

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />
        <div className="absolute left-[-180px] top-[-200px] h-[440px] w-[440px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[420px] w-[420px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

        <div className="relative container-page py-8 md:py-10 lg:py-14">
          <Link
            href="/experts"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to helpers
          </Link>

          {resolvedSearchParams.saved ? (
            <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]">
              Helper saved. You can find this profile in your saved list.
            </div>
          ) : null}

          {resolvedSearchParams.error ? (
            <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
              {formatError(resolvedSearchParams.error)}
            </div>
          ) : null}

          <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_380px] xl:items-start">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={expert.isVerified ? "success" : "accent"}>
                  {expert.isVerified ? (
                    <>
                      <BadgeCheck size={14} />
                      Verified
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      New helper
                    </>
                  )}
                </Badge>

                <Badge variant="success">
                  <ShieldCheck size={14} />
                  Approved helper
                </Badge>

                {canAcceptPayments && hasOpenTimes ? (
                  <Badge variant="primary">
                    <WalletCards size={14} />
                    Ready to book
                  </Badge>
                ) : null}

                {hasOpenTimes ? (
                  <Badge variant="primary">
                    <CalendarDays size={14} />
                    Available now
                  </Badge>
                ) : (
                  <Badge variant="accent">
                    <Clock3 size={14} />
                    No open times
                  </Badge>
                )}

                {expert.country ? (
                  <Badge>
                    <Globe2 size={14} />
                    {expert.country}
                  </Badge>
                ) : null}

                {startingPricing ? (
                  <Badge variant="primary">
                    <Euro size={14} />
                    From {formatMoneyFromCents(startingPricing.clientTotalCents)}
                  </Badge>
                ) : null}

                <Badge variant={expert.isVerified ? "success" : "primary"}>
                  <Sparkles size={14} />
                  {getPublicTrustLabel({
                    isVerified: expert.isVerified,
                    totalSessions: expert.totalSessions,
                    totalReviews: expert.totalReviews,
                    matchScore,
                  })}
                </Badge>
              </div>

              <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-start">
                <AvatarPreview
                  avatarUrl={expert.user.avatarUrl}
                  name={displayName}
                  fallbackLetter={avatarLetter}
                />

                <div className="min-w-0">
                  <h1 className="heading-lg max-w-4xl text-balance">
                    {displayName}
                  </h1>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {expert.isVerified ? (
                      <Badge variant="success">✔ Verified helper</Badge>
                    ) : null}

                    <Badge>
                      ⭐ {expert.rating ? expert.rating.toFixed(1) : "New"}
                    </Badge>

                    {problemSolvedRate !== null ? (
                      <Badge
                        variant={problemSolvedRate >= 70 ? "success" : "accent"}
                      >
                        <Target size={14} />
                        {problemSolvedRate}% solved
                      </Badge>
                    ) : null}

                    <Badge>{expert.totalSessions} sessions</Badge>

                    {expert.languages.slice(0, 3).map((language) => (
                      <Badge key={language}>
                        <Languages size={14} />
                        {language}
                      </Badge>
                    ))}
                  </div>

                  <p className="mt-4 max-w-3xl text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
                    {expert.headline ||
                      "I can help with practical questions through short calls"}
                  </p>

                  <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--muted-foreground)]">
                    {bioText}
                  </p>

                  {mainHelpAreas.length > 0 ? (
                    <div className="mt-6 rounded-[26px] border border-[var(--border)] bg-[var(--card-soft)] p-5">
                      <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                        Can help with
                      </p>

                      <div className="mt-4 grid gap-3">
                        {mainHelpAreas.map((service) => (
                          <div
                            key={service.id}
                            className="rounded-2xl border border-[var(--border)] bg-[var(--background-soft)] p-4"
                          >
                            <div className="flex flex-wrap gap-2">
                              <Badge>{service.category?.name ?? "Help"}</Badge>
                              <Badge>
                                <Clock3 size={14} />
                                {service.durationMinutes} min
                              </Badge>
                            </div>

                            <p className="mt-3 font-black tracking-[-0.02em]">
                              {service.title}
                            </p>

                            <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-[var(--muted-foreground)]">
                              {service.description ||
                                "Short practical help through a 1:1 call."}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-6 rounded-[26px] border border-[var(--border)] bg-[var(--card-soft)] p-5">
                    <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                      Keywords people can use to find this helper
                    </p>

                    <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted-foreground)]">
                      These tags and words help buyers find the right person
                      when they search for a problem, topic, language or skill.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {searchableKeywords.map((tag) => (
                        <HashTag key={tag} text={tag} />
                      ))}

                      {searchableKeywords.length === 0 ? (
                        <span className="text-sm font-semibold text-[var(--muted-foreground)]">
                          No searchable keywords added yet.
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {bookableTimes.length > 0 ? (
                    <div className="mt-7 rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
                      <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                        Next available
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {bookableTimes.slice(0, 5).map((time) => (
                          <span
                            key={time.id}
                            className="rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-xs font-black text-[var(--muted-foreground)]"
                          >
                            {formatDateTime(time.startTime)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <Card className="p-5 md:p-6 xl:sticky xl:top-[96px]">
              <Badge variant="accent">
                <Sparkles size={14} />
                Booking
              </Badge>

              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                Book a 1:1 call
              </h2>

              <p className="mt-2 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                Choose what you need help with, add context and pick an
                available time. Your slot is reserved while you complete
                checkout.
              </p>

              <div className="mt-5 grid gap-3">
                <SummaryRow
                  label="Service"
                  value={selectedService?.title ?? "Choose service"}
                />

                <SummaryRow
                  label="Duration"
                  value={
                    selectedService
                      ? `${selectedService.durationMinutes} min`
                      : "—"
                  }
                />

                <SummaryRow
                  label="Service price"
                  value={
                    selectedPricing
                      ? formatMoneyFromCents(selectedPricing.servicePriceCents)
                      : "—"
                  }
                />

                <SummaryRow
                  label="SkillDrop fee"
                  value={
                    selectedPricing
                      ? formatMoneyFromCents(
                          selectedPricing.clientServiceFeeCents,
                        )
                      : "—"
                  }
                />

                <SummaryRow
                  label="You pay today"
                  value={
                    selectedPricing
                      ? formatMoneyFromCents(selectedPricing.clientTotalCents)
                      : "—"
                  }
                  strong
                />

                <SummaryRow
                  label="Open times"
                  value={String(bookableTimes.length)}
                />
              </div>

              {bookingBlockedReason ? (
                <div className="mt-6 rounded-2xl border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-4 text-sm font-black leading-6 text-[var(--warning)]">
                  {bookingBlockedReason}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-[var(--primary-soft)] p-4 text-sm font-bold leading-6 text-[var(--primary-dark)]">
                  Pick a time below to create your booking. Payment happens on
                  the next step.
                </div>
              )}

              <div className="mt-5 grid gap-3">
                <Step
                  number="1"
                  title="Choose help"
                  text="Pick the service that matches your problem."
                />
                <Step
                  number="2"
                  title="Explain your situation"
                  text="Tell the helper what you need before the call."
                />
                <Step
                  number="3"
                  title="Pick time"
                  text="Select one available time inside the helper’s schedule."
                />
              </div>

              <p className="mt-4 text-center text-xs font-bold leading-5 text-[var(--muted-foreground)]">
                Booking is protected by SkillDrop{" "}
                <Link href="/legal/safety" className="text-[var(--primary-dark)]">
                  Safety
                </Link>{" "}
                and{" "}
                <Link
                  href="/legal/refunds"
                  className="text-[var(--primary-dark)]"
                >
                  Refund Policy
                </Link>
                .
              </p>

              <div className="mt-5 grid gap-2">
                {!currentUser ? (
                  <Link href={signInHref} className="btn btn-primary">
                    Sign in to book
                  </Link>
                ) : isOwnProfile ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3 text-sm font-bold text-[var(--muted-foreground)]">
                    This is your own helper profile.
                  </div>
                ) : savedExpert ? (
                  <form action={unsaveExpertAction}>
                    <input type="hidden" name="expertId" value={expert.id} />
                    <input
                      type="hidden"
                      name="returnTo"
                      value={`/experts/${expert.id}`}
                    />

                    <button type="submit" className="btn btn-danger w-full">
                      <Trash2 size={17} />
                      Remove saved helper
                    </button>
                  </form>
                ) : (
                  <form action={saveExpertAction}>
                    <input type="hidden" name="expertId" value={expert.id} />

                    <button type="submit" className="btn btn-secondary w-full">
                      <Bookmark size={17} />
                      Save helper
                    </button>
                  </form>
                )}

                {savedExpert ? (
                  <Link href="/buyer/saved" className="btn btn-secondary">
                    <BookmarkCheck size={17} />
                    View saved helpers
                  </Link>
                ) : null}
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-start">
          <div className="grid gap-6">
            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <WalletCards size={14} />
                Services
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Choose a service
              </h2>

              <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                Choose the type of help you need. The total includes the helper
                price plus a small SkillDrop service fee. You will confirm and
                pay after choosing a time.
              </p>

              <div className="mt-6 grid gap-4">
                {expert.services.length > 0 ? (
                  expert.services.map((service) => {
                    const isSelected = selectedService?.id === service.id;
                    const pricing = calculatePricingBreakdown(service.priceCents);

                    return (
                      <Link
                        key={service.id}
                        href={`/experts/${expert.id}?service=${service.id}`}
                        className={
                          isSelected
                            ? "rounded-[26px] border border-[var(--primary)]/30 bg-[var(--primary-soft)] p-4 shadow-sm transition hover:-translate-y-0.5"
                            : "rounded-[26px] border border-[var(--border)] bg-[var(--card-soft)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--background-soft)] hover:shadow-[var(--shadow-sm)]"
                        }
                      >
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                          <div>
                            <div className="flex flex-wrap gap-2">
                              {isSelected ? (
                                <Badge variant="primary">
                                  <CheckCircle2 size={14} />
                                  Selected
                                </Badge>
                              ) : null}

                              <Badge>{service.category?.name ?? "Service"}</Badge>

                              <Badge>
                                <Clock3 size={14} />
                                {service.durationMinutes} min
                              </Badge>
                            </div>

                            <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                              {service.title}
                            </h3>

                            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--muted-foreground)]">
                              {service.description ||
                                "Short practical help through a 1:1 call."}
                            </p>
                          </div>

                          <div className="grid shrink-0 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background-soft)] p-4 md:min-w-[220px]">
                            <SummaryRow
                              label="Service"
                              value={formatMoneyFromCents(
                                pricing.servicePriceCents,
                              )}
                            />
                            <SummaryRow
                              label="Fee"
                              value={formatMoneyFromCents(
                                pricing.clientServiceFeeCents,
                              )}
                            />
                            <SummaryRow
                              label="Total"
                              value={formatMoneyFromCents(
                                pricing.clientTotalCents,
                              )}
                              strong
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <EmptyState
                    title="No services yet"
                    text="This helper has not added active services."
                  />
                )}
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <CalendarDays size={14} />
                Time
              </Badge>

              <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-3xl font-black tracking-[-0.05em]">
                    Choose a time
                  </h2>

                  <p className="mt-2 max-w-2xl leading-7 text-[var(--muted-foreground)]">
                    Add a short note, then pick one available time for your 1:1
                    call.
                  </p>
                </div>

                <Badge>{bookableTimes.length} open</Badge>
              </div>

              {bookingBlockedReason ? (
                <div className="mt-6 rounded-[24px] border border-[var(--warning)]/20 bg-[var(--warning-soft)] p-5 text-sm font-black leading-6 text-[var(--warning)]">
                  {bookingBlockedReason}
                </div>
              ) : null}

              <div className="mt-6 grid gap-4">
                {groupedTimes.length > 0 && selectedService && canBook ? (
                  <form action={createBookingAction} className="grid gap-4">
                    <input type="hidden" name="expertId" value={expert.id} />
                    <input
                      type="hidden"
                      name="serviceId"
                      value={selectedService.id}
                    />

                    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="booking-note"
                          className="text-sm font-black tracking-[-0.01em]"
                        >
                          Describe your problem and desired result
                        </label>

                        <p className="text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                          Help the helper prepare before the call. Explain what
                          problem you want to solve, what result you expect by
                          the end of the call, and what you already tried if it
                          is relevant.
                        </p>

                        <div className="mt-3 rounded-2xl border border-[var(--primary)]/15 bg-[var(--primary-soft)] p-4">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary-dark)]">
                            Good note example
                          </p>

                          <p className="mt-2 whitespace-pre-line text-sm font-bold leading-6 text-[var(--primary-dark)]">
                            {`Problem: I need help improving my CV for an alternance application.
Desired result: I want clear advice and corrections before I send it.
Already tried: I wrote a first version but I am not sure if it is professional enough.`}
                          </p>
                        </div>

                        <textarea
                          id="booking-note"
                          name="note"
                          maxLength={MAX_BOOKING_NOTE_LENGTH}
                          rows={7}
                          placeholder={`Problem:

Desired result:

Already tried:`}
                          className="mt-2 min-h-44 resize-y rounded-2xl border border-[var(--border)] bg-[var(--background-soft)] px-4 py-3 text-sm font-medium leading-6 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
                        />

                        <p className="text-xs font-bold text-[var(--muted-foreground)]">
                          Optional, but recommended. Max{" "}
                          {MAX_BOOKING_NOTE_LENGTH} characters.
                        </p>
                      </div>
                    </div>

                    {groupedTimes.map((group) => (
                      <div
                        key={group.label}
                        className="rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                              {group.label}
                            </p>

                            <p className="mt-1 text-xs font-bold text-[var(--muted-foreground)]">
                              {group.times.length} available
                            </p>
                          </div>

                          <Badge>{group.times.length}</Badge>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {group.times.map((time) => (
                            <button
                              key={time.id}
                              type="submit"
                              name="timeSlot"
                              value={`${time.availabilityId}|${time.startTime.toISOString()}`}
                              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background-soft)] px-3 py-2 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--primary-soft)] hover:text-[var(--primary-dark)] hover:shadow-[var(--shadow-sm)]"
                              title={`${formatDateTime(
                                time.startTime,
                              )} — ${formatTime(time.endTime)}`}
                            >
                              <Clock3 size={14} />
                              {formatTime(time.startTime)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </form>
                ) : null}

                {groupedTimes.length > 0 && selectedService && !canBook ? (
                  <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card-soft)] p-7 text-center">
                    <h3 className="text-2xl font-black tracking-[-0.04em]">
                      Booking is not available yet
                    </h3>

                    <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-[var(--muted-foreground)]">
                      {bookingBlockedReason ??
                        "This helper cannot be booked right now."}
                    </p>

                    {!currentUser ? (
                      <div className="mt-5">
                        <Link href={signInHref} className="btn btn-primary">
                          Sign in to book
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {groupedTimes.length === 0 ? (
                  <EmptyState
                    title="No open times"
                    text={
                      selectedService
                        ? "This helper has no available time for the selected service right now."
                        : "This helper has no available time right now."
                    }
                  />
                ) : null}

                {groupedTimes.length > 0 && !selectedService ? (
                  <EmptyState
                    title="Choose a service first"
                    text="Select a service before choosing a time."
                  />
                ) : null}
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="success">
                <ShieldCheck size={14} />
                What happens after payment
              </Badge>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Step
                  number="1"
                  title="Booking confirmed"
                  text="Your selected time is reserved and the helper sees the booking."
                />
                <Step
                  number="2"
                  title="Call room prepared"
                  text="You will get access to the call page when the session window opens."
                />
                <Step
                  number="3"
                  title="Leave a review"
                  text="After the call, you can rate the helper and share feedback."
                />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <MessageCircle size={14} />
                About
              </Badge>

              <div className="mt-6 grid gap-5 md:grid-cols-4">
                <InfoBox
                  icon={Languages}
                  label="Languages"
                  value={
                    expert.languages.length > 0
                      ? expert.languages.join(", ")
                      : "Not set"
                  }
                />

                <InfoBox
                  icon={Video}
                  label="Sessions"
                  value={`${expert.totalSessions} completed`}
                />

                <InfoBox
                  icon={Star}
                  label="Rating"
                  value={
                    expert.rating
                      ? `${expert.rating.toFixed(1)} / 5`
                      : "New helper"
                  }
                />

                <InfoBox
                  icon={Target}
                  label="Solved"
                  value={
                    problemSolvedRate !== null
                      ? `${problemSolvedRate}%`
                      : "No data yet"
                  }
                />
              </div>
            </Card>

            {expert.documents.length > 0 ? (
              <Card className="p-5 md:p-6">
                <Badge variant="primary">
                  <FileText size={14} />
                  CV & portfolio
                </Badge>

                <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <h2 className="text-3xl font-black tracking-[-0.05em]">
                      Documents shared by this helper
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                      Review CV, portfolio files, certificates or work examples
                      before booking a call.
                    </p>
                  </div>

                  <Badge>
                    {expert.documents.length} file
                    {expert.documents.length === 1 ? "" : "s"}
                  </Badge>
                </div>

                {cvDocuments.length > 0 ? (
                  <div className="mt-6">
                    <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                      CV
                    </p>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {cvDocuments.map((document) => (
                        <DocumentCard key={document.id} document={document} />
                      ))}
                    </div>
                  </div>
                ) : null}

                {portfolioDocuments.length > 0 ? (
                  <div className="mt-6">
                    <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                      Portfolio
                    </p>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {portfolioDocuments.map((document) => (
                        <DocumentCard key={document.id} document={document} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </Card>
            ) : null}

            <Card className="p-5 md:p-6">
              <Badge variant="success">
                <Target size={14} />
                Problem outcomes
              </Badge>

              <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-3xl font-black tracking-[-0.05em]">
                    {problemSolvedRate !== null
                      ? `${problemSolvedRate}% problems solved`
                      : "No outcome data yet"}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                    Buyers answer whether their problem was solved after the
                    call. This is one of the strongest trust signals on
                    SkillDrop.
                  </p>
                </div>

                <Badge variant={problemOutcomeTotal > 0 ? "primary" : "accent"}>
                  {problemOutcomeTotal} outcome
                  {problemOutcomeTotal === 1 ? "" : "s"}
                </Badge>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <OutcomeBox
                  icon={ThumbsUp}
                  label="Solved"
                  value={solvedReviews}
                  variant="success"
                />

                <OutcomeBox
                  icon={Target}
                  label="Partially"
                  value={partiallySolvedReviews}
                  variant="accent"
                />

                <OutcomeBox
                  icon={ThumbsDown}
                  label="Not solved"
                  value={notSolvedReviews}
                  variant="danger"
                />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <Star size={14} />
                Reviews
              </Badge>

              <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-3xl font-black tracking-[-0.05em]">
                    Buyer feedback
                  </h2>
                </div>

                <Badge>{expert.totalReviews} reviews</Badge>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {expert.reviews.length > 0 ? (
                  expert.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Badge variant="success">
                          <Star size={14} />
                          {review.rating}/5
                        </Badge>

                        {review.wouldRecommend ? (
                          <Badge variant="primary">Recommended</Badge>
                        ) : null}

                        <Badge
                          variant={getProblemSolvedBadgeVariant(
                            review.problemSolved,
                          )}
                        >
                          {formatProblemSolved(review.problemSolved)}
                        </Badge>

                        <p className="text-xs font-bold text-[var(--muted-foreground)]">
                          {formatShortDate(review.createdAt)}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-2">
                        <ReviewScore
                          label="Helpfulness"
                          value={review.helpfulness}
                        />
                        <ReviewScore label="Clarity" value={review.clarity} />
                        <ReviewScore
                          label="Professionalism"
                          value={review.professionalism}
                        />
                      </div>

                      {review.wouldRecommend !== null ? (
                        <p className="mt-3 text-xs font-black text-[var(--primary-dark)]">
                          Would recommend:{" "}
                          {review.wouldRecommend ? "Yes" : "No"}
                        </p>
                      ) : null}

                      <p className="mt-4 line-clamp-4 text-sm font-semibold leading-6 text-[var(--muted-foreground)]">
                        {review.comment || "No comment left."}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No reviews yet"
                    text="This helper is still collecting first reviews."
                  />
                )}
              </div>
            </Card>
          </div>

          <div className="grid content-start gap-5 xl:sticky xl:top-[96px]">
            <Card className="p-5">
              <Badge variant="success">
                <ShieldCheck size={14} />
                Trust overview
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                {expert.isVerified ? "Verified helper" : "Helper profile"}
              </h2>

              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--muted-foreground)]">
                Review the helper’s services, languages, availability and past
                feedback before booking a call.
              </p>

              <div className="mt-5 grid gap-3">
                <SideFact
                  label="Rating"
                  value={
                    expert.rating ? `${expert.rating.toFixed(1)} / 5` : "New"
                  }
                />

                <SideFact
                  label="Completed sessions"
                  value={`${expert.totalSessions}`}
                />

                <SideFact
                  label="Recommend rate"
                  value={recommendationRate !== null ? `${recommendationRate}%` : "—"}
                />

                <SideFact
                  label="Problem solved"
                  value={problemSolvedRate !== null ? `${problemSolvedRate}%` : "—"}
                />

                <SideFact label="Open times" value={`${bookableTimes.length}`} />
              </div>
            </Card>

            <Card className="p-5">
              <Badge variant="primary">
                <Globe2 size={14} />
                Quick facts
              </Badge>

              <div className="mt-5 grid gap-3">
                <SideFact label="Country" value={expert.country ?? "Global"} />

                <SideFact
                  label="Languages"
                  value={
                    expert.languages.length > 0
                      ? expert.languages.slice(0, 3).join(", ")
                      : "Not set"
                  }
                />

                <SideFact
                  label="Sessions"
                  value={`${expert.totalSessions} completed`}
                />

                <SideFact
                  label="Rating"
                  value={
                    expert.rating ? `${expert.rating.toFixed(1)} / 5` : "New"
                  }
                />
              </div>
            </Card>

            {expert.documents.length > 0 ? (
              <Card className="p-5">
                <Badge variant="primary">
                  <FileText size={14} />
                  Documents
                </Badge>

                <div className="mt-5 grid gap-3">
                  <SideFact label="CV" value={`${cvDocuments.length}`} />
                  <SideFact
                    label="Portfolio"
                    value={`${portfolioDocuments.length}`}
                  />
                  <SideFact
                    label="Total files"
                    value={`${expert.documents.length}`}
                  />
                </div>
              </Card>
            ) : null}

            <Card className="p-5">
              <Badge variant="success">
                <ShieldCheck size={14} />
                Safe booking
              </Badge>

              <div className="mt-5 grid gap-3">
                <Step
                  number="1"
                  title="Transparent price"
                  text="You see the service price, SkillDrop fee and total before paying."
                />
                <Step
                  number="2"
                  title="Protected workflow"
                  text="The booking is created first, then confirmed after payment."
                />
                <Step
                  number="3"
                  title="Review after call"
                  text="Feedback helps keep the marketplace trustworthy."
                />
              </div>
            </Card>

            <Card soft className="p-5">
              <Badge variant="accent">
                <Sparkles size={14} />
                Best before booking
              </Badge>

              <p className="mt-4 text-sm font-bold leading-6 text-[var(--muted-foreground)]">
                Prepare one clear question, share enough context, and choose the
                service that matches the result you want from the call.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

function DocumentCard({
  document,
}: {
  document: {
    id: string;
    type: "CV" | "PORTFOLIO";
    title: string;
    fileUrl: string;
    fileName: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
  };
}) {
  return (
    <a
      href={document.fileUrl}
      target="_blank"
      rel="noreferrer"
      className="group rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)] p-4 transition hover:-translate-y-0.5 hover:bg-[var(--background-soft)] hover:shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
          <FileText size={19} />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[var(--foreground)]">
            {document.title}
          </p>

          <p className="mt-1 text-xs font-bold text-[var(--muted-foreground)]">
            {document.type === "CV" ? "CV" : "Portfolio"}
            {document.fileName ? ` · ${document.fileName}` : ""}
          </p>

          <p className="mt-1 text-xs font-semibold text-[var(--muted-foreground)]">
            {formatFileSize(document.sizeBytes)}
          </p>
        </div>

        <Paperclip
          size={17}
          className="ml-auto shrink-0 text-[var(--muted-foreground)]"
        />
      </div>
    </a>
  );
}

function formatFileSize(sizeBytes: number | null) {
  if (!sizeBytes || sizeBytes <= 0) {
    return "Size unknown";
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function OutcomeBox({
  icon: Icon,
  label,
  value,
  variant,
}: {
  icon: typeof Target;
  label: string;
  value: number;
  variant: "success" | "accent" | "danger";
}) {
  const boxClassName =
    variant === "success"
      ? "rounded-[22px] border border-[var(--success)]/20 bg-[var(--success-soft)] p-4"
      : variant === "danger"
        ? "rounded-[22px] border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4"
        : "rounded-[22px] border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-4";

  const iconClassName =
    variant === "success"
      ? "flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--background-soft)] text-[var(--success)]"
      : variant === "danger"
        ? "flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--background-soft)] text-[var(--danger)]"
        : "flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--background-soft)] text-[var(--accent)]";

  return (
    <div className={boxClassName}>
      <div className={iconClassName}>
        <Icon size={18} />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

/* garde tout le reste de tes fonctions en bas du fichier:
AvatarPreview, HashTag, SummaryRow, InfoBox, SideFact, Step,
EmptyState, ReviewScore, generateBookableTimes, groupTimesByDate,
getBookingBlockedReason, calculateMatchScore, averageNullable, clamp,
addMinutes, roundUpToStep, rangesOverlap, formatDateTime, formatShortDate,
formatTime, formatError, formatProblemSolved, getProblemSolvedBadgeVariant,
getPublicTrustLabel.
*/
function AvatarPreview({
  avatarUrl,
  name,
  fallbackLetter,
}: {
  avatarUrl: string | null;
  name: string;
  fallbackLetter: string;
}) {
  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[32px] bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-4xl font-black text-white shadow-[var(--shadow-sm)]">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        fallbackLetter
      )}
    </div>
  );
}

function HashTag({ text }: { text: string }) {
  return (
    <span className="rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-sm font-bold text-[var(--muted-foreground)]">
      #{text}
    </span>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3">
      <p className="text-sm font-medium text-[var(--muted-foreground)]">
        {label}
      </p>

      <p
        className={
          strong
            ? "text-right text-sm font-bold text-[var(--primary-dark)]"
            : "text-right text-sm font-bold text-[var(--foreground)]"
        }
      >
        {value}
      </p>
    </div>
  );
}

function InfoBox({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Languages;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={18} />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold leading-6 text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function SideFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3">
      <p className="text-sm font-medium text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="text-right text-sm font-bold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function Step({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-sm font-bold text-[var(--primary-dark)]">
        {number}
      </div>

      <div>
        <p className="font-bold tracking-[-0.02em] text-[var(--foreground)]">
          {title}
        </p>

        <p className="mt-1 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
          {text}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card-soft)] p-7 text-center md:col-span-2">
      <h3 className="text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
        {title}
      </h3>

      <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[var(--muted-foreground)]">
        {text}
      </p>
    </div>
  );
}

function ReviewScore({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-2">
      <p className="text-xs font-bold text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="text-xs font-bold text-[var(--foreground)]">
        {value ? `${value}/5` : "—"}
      </p>
    </div>
  );
}

function generateBookableTimes({
  windows,
  durationMinutes,
  now,
}: {
  windows: {
    id: string;
    startTime: Date;
    endTime: Date;
    bookings: {
      id: string;
      startTime: Date;
      endTime: Date;
      status: BookingStatus;
    }[];
  }[];
  durationMinutes: number;
  now: Date;
}) {
  const times: GeneratedBookableTime[] = [];

  for (const window of windows) {
    const windowStart =
      window.startTime > now
        ? window.startTime
        : roundUpToStep(now, BOOKING_STEP_MINUTES);

    let cursor = roundUpToStep(windowStart, BOOKING_STEP_MINUTES);

    while (true) {
      const candidateEnd = addMinutes(cursor, durationMinutes);

      if (candidateEnd > window.endTime) {
        break;
      }

      const overlapsExistingBooking = window.bookings.some((booking) =>
        rangesOverlap({
          startA: cursor,
          endA: candidateEnd,
          startB: booking.startTime,
          endB: booking.endTime,
        }),
      );

      if (!overlapsExistingBooking) {
        times.push({
          id: `${window.id}-${cursor.toISOString()}`,
          availabilityId: window.id,
          startTime: cursor,
          endTime: candidateEnd,
          windowStartTime: window.startTime,
          windowEndTime: window.endTime,
        });
      }

      cursor = addMinutes(cursor, BOOKING_STEP_MINUTES);
    }
  }

  return times.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

function groupTimesByDate(times: GeneratedBookableTime[]) {
  const groups = new Map<
    string,
    {
      label: string;
      times: GeneratedBookableTime[];
    }
  >();

  times.forEach((time) => {
    const label = new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(time.startTime);

    const existing = groups.get(label);

    if (existing) {
      existing.times.push(time);
      return;
    }

    groups.set(label, {
      label,
      times: [time],
    });
  });

  return Array.from(groups.values());
}

function getBookingBlockedReason({
  hasUser,
  isBuyer,
  isOwnProfile,
  isProviderApproved,
  canAcceptPayments,
  hasServices,
  hasOpenTimes,
}: {
  hasUser: boolean;
  isBuyer: boolean;
  isOwnProfile: boolean;
  isProviderApproved: boolean;
  canAcceptPayments: boolean;
  hasServices: boolean;
  hasOpenTimes: boolean;
}) {
  if (!hasUser) {
    return "Sign in to book this helper.";
  }

  if (!isBuyer) {
    return "Only buyer accounts can book helper calls.";
  }

  if (isOwnProfile) {
    return "You cannot book your own helper profile.";
  }

  if (!isProviderApproved) {
    return "This helper is not approved for public bookings yet.";
  }

  if (!canAcceptPayments) {
    return "This helper is finishing payout setup. Booking is temporarily unavailable.";
  }

  if (!hasServices) {
    return "This helper has not added active services yet.";
  }

  if (!hasOpenTimes) {
    return "This helper has no available time for the selected service right now.";
  }

  return null;
}

function calculateMatchScore({
  rating,
  totalReviews,
  totalSessions,
  isVerified,
  openTimes,
  reviews,
}: {
  rating: number;
  totalReviews: number;
  totalSessions: number;
  isVerified: boolean;
  openTimes: number;
  reviews: {
    rating: number;
    helpfulness: number | null;
    clarity: number | null;
    professionalism: number | null;
    wouldRecommend: boolean | null;
    problemSolved?: string | null;
    createdAt: Date;
  }[];
}) {
  const ratingScore =
    totalReviews > 0 ? clamp((rating / 5) * 30, 0, 30) : 8;

  const helpfulnessAvg = averageNullable(
    reviews.map((review) => review.helpfulness),
  );

  const clarityAvg = averageNullable(reviews.map((review) => review.clarity));

  const professionalismAvg = averageNullable(
    reviews.map((review) => review.professionalism),
  );

  const detailedReviewScore =
    helpfulnessAvg || clarityAvg || professionalismAvg
      ? clamp(
          (((helpfulnessAvg ?? rating) +
            (clarityAvg ?? rating) +
            (professionalismAvg ?? rating)) /
            3 /
            5) *
            25,
          0,
          25,
        )
      : totalReviews > 0
        ? clamp((rating / 5) * 18, 0, 18)
        : 5;

  const recommendationReviews = reviews.filter(
    (review) => review.wouldRecommend !== null,
  );

  const recommendationRate =
    recommendationReviews.length > 0
      ? recommendationReviews.filter((review) => review.wouldRecommend).length /
        recommendationReviews.length
      : null;

  const recommendationScore =
    recommendationRate !== null ? clamp(recommendationRate * 15, 0, 15) : 6;

  const sessionsScore = clamp((Math.min(totalSessions, 20) / 20) * 15, 0, 15);
  const verifiedScore = isVerified ? 10 : 0;
  const availabilityScore = openTimes > 0 ? 5 : 0;

  return Math.round(
    ratingScore +
      detailedReviewScore +
      recommendationScore +
      sessionsScore +
      verifiedScore +
      availabilityScore,
  );
}

function averageNullable(values: (number | null)[]) {
  const cleanValues = values.filter(
    (value): value is number => typeof value === "number",
  );

  if (cleanValues.length === 0) {
    return null;
  }

  return cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function roundUpToStep(date: Date, stepMinutes: number) {
  const result = new Date(date);
  result.setSeconds(0, 0);

  const minutes = result.getMinutes();
  const remainder = minutes % stepMinutes;

  if (remainder !== 0) {
    result.setMinutes(minutes + (stepMinutes - remainder));
  }

  return result;
}

function rangesOverlap({
  startA,
  endA,
  startB,
  endB,
}: {
  startA: Date;
  endA: Date;
  startB: Date;
  endB: Date;
}) {
  return startA < endB && endA > startB;
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

function formatError(error: string) {
  if (error === "cannot-book-yourself") {
    return "You cannot book your own profile.";
  }

  if (error === "cannot-save-yourself") {
    return "You cannot save your own helper profile.";
  }

  if (error === "slot-not-available") {
    return "This time is no longer available.";
  }

  if (error === "slot-too-short") {
    return "This time is too short for the selected service.";
  }

  if (error === "invalid-time") {
    return "This selected time is invalid. Please choose another available time.";
  }

  if (error === "service-not-found") {
    return "This service is not available anymore.";
  }

  if (error === "invalid-service") {
    return "This service is not configured correctly.";
  }

  if (error === "missing-booking-data") {
    return "Please choose a service and a time.";
  }

  if (error === "provider-not-available") {
    return "This helper is not available for public bookings yet.";
  }

  if (error === "expert-payout-not-ready") {
    return "This helper is finishing payout setup. Booking is temporarily unavailable.";
  }

  if (error === "booking-note-too-long") {
    return "Your booking note is too long. Please keep it under 500 characters.";
  }

  if (error === "booking-failed") {
    return "Booking could not be created. Please try again.";
  }

  return "Something went wrong. Please try again.";
}

function formatProblemSolved(value: string | null) {
  if (value === "YES") {
    return "Solved";
  }

  if (value === "PARTIALLY") {
    return "Partially solved";
  }

  if (value === "NO") {
    return "Not solved";
  }

  return "Outcome unknown";
}

function getProblemSolvedBadgeVariant(
  value: string | null,
): "success" | "accent" | "danger" {
  if (value === "YES") {
    return "success";
  }

  if (value === "NO") {
    return "danger";
  }

  return "accent";
}

function getPublicTrustLabel({
  isVerified,
  totalSessions,
  totalReviews,
  matchScore,
}: {
  isVerified: boolean;
  totalSessions: number;
  totalReviews: number;
  matchScore: number;
}) {
  if (isVerified) {
    return "Verified helper";
  }

  if (totalSessions >= 10 || totalReviews >= 5 || matchScore >= 80) {
    return "Experienced helper";
  }

  return "Available helper";
}