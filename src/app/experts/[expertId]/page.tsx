import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Euro,
  Globe2,
  Languages,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
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

const MAX_VISIBLE_SLOTS = 24;

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
          startTime: {
            gte: now,
          },
          isBooked: false,
        },
        orderBy: {
          startTime: "asc",
        },
        take: MAX_VISIBLE_SLOTS,
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
          comment: true,
          createdAt: true,
        },
        take: 20,
      },
    },
  });

  if (!expert) {
    notFound();
  }

  const currentUser = session.user;
  const isBuyer = session.role === "buyer" || session.role === "admin";
  const isOwnProfile = currentUser?.id === expert.userId;
  const canAcceptPayments = Boolean(expert.stripeAccountId);

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

  const selectedService =
    expert.services.find(
      (service) => service.id === resolvedSearchParams.service,
    ) ??
    expert.services[0] ??
    null;

  const selectedPricing = selectedService
    ? calculatePricingBreakdown(selectedService.priceCents)
    : null;

  const groupedSlots = groupSlotsByDate(expert.availability);

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
    openSlots: expert.availability.length,
    reviews: expert.reviews,
  });

  const helpfulnessAvg = averageNullable(
    expert.reviews.map((review) => review.helpfulness),
  );

  const clarityAvg = averageNullable(
    expert.reviews.map((review) => review.clarity),
  );

  const professionalismAvg = averageNullable(
    expert.reviews.map((review) => review.professionalism),
  );

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

  const displayName = expert.user.name || "Provider";
  const avatarLetter = (
    expert.user.name?.charAt(0) ||
    expert.user.email.charAt(0) ||
    "P"
  ).toUpperCase();

  const bioText =
    expert.bio || "This provider has not added a detailed bio yet.";

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative container-page py-8 md:py-10 lg:py-14">
          <Link
            href="/experts"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to providers
          </Link>

          {resolvedSearchParams.saved ? (
            <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]">
              Provider saved. You can find this profile in your saved list.
            </div>
          ) : null}

          {resolvedSearchParams.error ? (
            <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
              {formatError(resolvedSearchParams.error)}
            </div>
          ) : null}

          <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_360px] xl:items-start">
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
                      New provider
                    </>
                  )}
                </Badge>

                {canAcceptPayments ? (
                  <Badge variant="success">
                    <WalletCards size={14} />
                    Payments ready
                  </Badge>
                ) : (
                  <Badge variant="danger">
                    <ShieldAlert size={14} />
                    Payments not ready
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

                <Badge variant={matchScore >= 80 ? "success" : "primary"}>
                  <Sparkles size={14} />
                  Match {matchScore}/100
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
                      <Badge variant="success">✔ Verified provider</Badge>
                    ) : null}

                    <Badge>
                      ⭐ {expert.rating ? expert.rating.toFixed(1) : "New"}
                    </Badge>

                    <Badge>{expert.totalSessions} sessions</Badge>

                    {expert.languages.slice(0, 3).map((language) => (
                      <Badge key={language}>
                        <Languages size={14} />
                        {language}
                      </Badge>
                    ))}
                  </div>

                  <p className="mt-4 max-w-3xl text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
                    {expert.headline || "Practical help through short calls"}
                  </p>

                  <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
                    {bioText}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {[...expert.skills, ...expert.tags].slice(0, 16).map((tag) => (
                      <HashTag key={tag} text={tag} />
                    ))}

                    {expert.skills.length === 0 && expert.tags.length === 0 ? (
                      <span className="text-sm font-semibold text-muted">
                        No tags added yet.
                      </span>
                    ) : null}
                  </div>

                  {expert.availability.length > 0 ? (
                    <div className="mt-7 rounded-[24px] border border-[var(--border)] bg-white/55 p-4">
                      <p className="text-sm font-black uppercase tracking-[0.14em] text-muted">
                        Next available
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {expert.availability.slice(0, 5).map((slot) => (
                          <span
                            key={slot.id}
                            className="rounded-full border border-[var(--border)] bg-white/64 px-3 py-1.5 text-xs font-black text-[var(--muted-foreground)]"
                          >
                            {formatDateTime(slot.startTime)}
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
                Ready to book?
              </h2>

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
                      ? formatMoneyFromCents(selectedPricing.clientServiceFeeCents)
                      : "—"
                  }
                />

                <SummaryRow
                  label="You pay"
                  value={
                    selectedPricing
                      ? formatMoneyFromCents(selectedPricing.clientTotalCents)
                      : "—"
                  }
                  strong
                />

                <SummaryRow
                  label="Open times"
                  value={String(expert.availability.length)}
                />
              </div>

              {!canAcceptPayments ? (
                <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-black leading-6 text-[var(--danger)]">
                  This provider is finishing payout setup. You can save this
                  profile, but booking is temporarily unavailable.
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-[var(--primary-soft)] p-4 text-sm font-bold leading-6 text-[var(--primary-dark)]">
                  Choose a service, then pick an available time below. Your slot
                  will be held while you complete payment.
                </div>
              )}

              <div className="mt-4 grid gap-2">
                {!currentUser ? (
                  <Link href="/sign-in" className="btn btn-secondary">
                    Sign in to save
                  </Link>
                ) : isOwnProfile ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-3 text-sm font-bold text-muted">
                    This is your own provider profile.
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
                      Remove saved
                    </button>
                  </form>
                ) : (
                  <form action={saveExpertAction}>
                    <input type="hidden" name="expertId" value={expert.id} />

                    <button type="submit" className="btn btn-secondary w-full">
                      <Bookmark size={17} />
                      Save provider
                    </button>
                  </form>
                )}

                {savedExpert ? (
                  <Link href="/buyer/saved" className="btn btn-secondary">
                    <BookmarkCheck size={17} />
                    View saved providers
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

              <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-muted">
                The total includes the provider price plus a small SkillDrop
                service fee.
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
                            : "rounded-[26px] border border-[var(--border)] bg-white/64 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[var(--shadow-sm)]"
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
                            </div>

                            <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                              {service.title}
                            </h3>

                            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted">
                              {service.description ||
                                "Short practical help through a 1:1 call."}
                            </p>
                          </div>

                          <div className="grid shrink-0 gap-2 rounded-2xl border border-[var(--border)] bg-white/64 p-4 md:min-w-[220px]">
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
                            <p className="text-right text-sm font-bold text-muted">
                              {service.durationMinutes} min
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <EmptyState
                    title="No services yet"
                    text="This provider has not added active services."
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

                  <p className="mt-2 max-w-2xl leading-7 text-muted">
                    Pick one available slot for your 1:1 call.
                  </p>
                </div>

                <Badge>{expert.availability.length} open</Badge>
              </div>

              {!canAcceptPayments ? (
                <div className="mt-6 rounded-[24px] border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-5 text-sm font-black leading-6 text-[var(--danger)]">
                  Booking is disabled until this provider completes Stripe payout
                  setup.
                </div>
              ) : null}

              <div className="mt-6 grid gap-4">
                {groupedSlots.length > 0 && selectedService && canAcceptPayments ? (
                  groupedSlots.map((group) => (
                    <div
                      key={group.label}
                      className="rounded-[24px] border border-[var(--border)] bg-white/45 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.14em] text-muted">
                            {group.label}
                          </p>

                          <p className="mt-1 text-xs font-bold text-muted">
                            {group.slots.length} available
                          </p>
                        </div>

                        <Badge>{group.slots.length}</Badge>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {group.slots.map((slot) => (
                          <form key={slot.id} action={createBookingAction}>
                            <input
                              type="hidden"
                              name="expertId"
                              value={expert.id}
                            />
                            <input
                              type="hidden"
                              name="serviceId"
                              value={selectedService.id}
                            />
                            <input
                              type="hidden"
                              name="availabilityId"
                              value={slot.id}
                            />

                            <button
                              type="submit"
                              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-2 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--primary-soft)] hover:text-[var(--primary-dark)] hover:shadow-[var(--shadow-sm)]"
                              title={`${formatDateTime(
                                slot.startTime,
                              )} — ${formatTime(slot.endTime)}`}
                            >
                              <Clock3 size={14} />
                              {formatTime(slot.startTime)}
                            </button>
                          </form>
                        ))}
                      </div>
                    </div>
                  ))
                ) : null}

                {groupedSlots.length === 0 ? (
                  <EmptyState
                    title="No open times"
                    text="This provider has no available time slots right now."
                  />
                ) : null}

                {groupedSlots.length > 0 && !selectedService ? (
                  <EmptyState
                    title="Choose a service first"
                    text="Select a service before choosing a time."
                  />
                ) : null}
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <MessageCircle size={14} />
                About
              </Badge>

              <div className="mt-6 grid gap-5 md:grid-cols-3">
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
                      : "New provider"
                  }
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
                    Client feedback
                  </h2>
                </div>

                <Badge>{expert.totalReviews} reviews</Badge>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {expert.reviews.length > 0 ? (
                  expert.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-[22px] border border-[var(--border)] bg-white/64 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Badge variant="success">
                          <Star size={14} />
                          {review.rating}/5
                        </Badge>

                        {review.wouldRecommend ? (
                          <Badge variant="primary">Recommended</Badge>
                        ) : null}

                        <p className="text-xs font-bold text-muted">
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
                          Would recommend: {review.wouldRecommend ? "Yes" : "No"}
                        </p>
                      ) : null}

                      <p className="mt-4 line-clamp-4 text-sm font-semibold leading-6 text-muted">
                        {review.comment || "No comment left."}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No reviews yet"
                    text="This provider is still collecting first reviews."
                  />
                )}
              </div>
            </Card>
          </div>

          <div className="grid content-start gap-5 xl:sticky xl:top-[96px]">
            <Card className="p-5">
              <Badge variant={matchScore >= 80 ? "success" : "primary"}>
                <Sparkles size={14} />
                Match score
              </Badge>

              <h2 className="mt-4 text-4xl font-black tracking-[-0.06em]">
                {matchScore}/100
              </h2>

              <p className="mt-3 text-sm font-semibold leading-6 text-muted">
                Based on reviews, detailed feedback, recommendations, completed
                sessions and availability.
              </p>

              <div className="mt-5 grid gap-3">
                <SideFact
                  label="Rating"
                  value={
                    expert.rating ? `${expert.rating.toFixed(1)} / 5` : "New"
                  }
                />

                <SideFact
                  label="Helpfulness"
                  value={
                    helpfulnessAvg ? `${helpfulnessAvg.toFixed(1)} / 5` : "—"
                  }
                />

                <SideFact
                  label="Clarity"
                  value={clarityAvg ? `${clarityAvg.toFixed(1)} / 5` : "—"}
                />

                <SideFact
                  label="Professionalism"
                  value={
                    professionalismAvg
                      ? `${professionalismAvg.toFixed(1)} / 5`
                      : "—"
                  }
                />

                <SideFact
                  label="Recommend rate"
                  value={
                    recommendationRate !== null ? `${recommendationRate}%` : "—"
                  }
                />
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

            <Card className="p-5">
              <Badge variant="success">
                <ShieldCheck size={14} />
                Safe booking
              </Badge>

              <div className="mt-5 grid gap-3">
                <Step
                  number="1"
                  title="Choose service"
                  text="Pick the help you need."
                />
                <Step number="2" title="Pick time" text="Select an open slot." />
                <Step
                  number="3"
                  title="Confirm booking"
                  text="Pay safely and join the call."
                />
              </div>
            </Card>

            <Card soft className="p-5">
              <Badge variant="accent">
                <Sparkles size={14} />
                Good to know
              </Badge>

              <p className="mt-4 text-sm font-bold leading-6 text-muted">
                Short calls work best when you prepare one clear question before
                booking.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

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
    <span className="rounded-full border border-[var(--border)] bg-white/64 px-3 py-1.5 text-sm font-black text-[var(--muted-foreground)]">
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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p
        className={
          strong
            ? "text-right text-sm font-black text-[var(--primary-dark)]"
            : "text-right text-sm font-black"
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
    <div className="rounded-[22px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={18} />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-sm font-black leading-6">{value}</p>
    </div>
  );
}

function SideFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="text-right text-sm font-black">{value}</p>
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
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-sm font-black text-[var(--primary-dark)]">
        {number}
      </div>

      <div>
        <p className="font-black tracking-[-0.02em]">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-muted">{text}</p>
      </div>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-white/55 p-7 text-center md:col-span-2">
      <h3 className="text-2xl font-black tracking-[-0.04em]">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-muted">
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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 px-3 py-2">
      <p className="text-xs font-black text-muted">{label}</p>
      <p className="text-xs font-black">{value ? `${value}/5` : "—"}</p>
    </div>
  );
}

function groupSlotsByDate(
  slots: {
    id: string;
    startTime: Date;
    endTime: Date;
    isBooked: boolean;
  }[],
) {
  const groups = new Map<
    string,
    {
      label: string;
      slots: {
        id: string;
        startTime: Date;
        endTime: Date;
        isBooked: boolean;
      }[];
    }
  >();

  slots.forEach((slot) => {
    const label = new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(slot.startTime);

    const existing = groups.get(label);

    if (existing) {
      existing.slots.push(slot);
      return;
    }

    groups.set(label, {
      label,
      slots: [slot],
    });
  });

  return Array.from(groups.values());
}

function calculateMatchScore({
  rating,
  totalReviews,
  totalSessions,
  isVerified,
  openSlots,
  reviews,
}: {
  rating: number;
  totalReviews: number;
  totalSessions: number;
  isVerified: boolean;
  openSlots: number;
  reviews: {
    rating: number;
    helpfulness: number | null;
    clarity: number | null;
    professionalism: number | null;
    wouldRecommend: boolean | null;
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
  const availabilityScore = openSlots > 0 ? 5 : 0;

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
    return "You cannot save your own provider profile.";
  }

  if (error === "slot-not-available") {
    return "This time slot is no longer available.";
  }

  if (error === "service-not-found") {
    return "This service is not available anymore.";
  }

  if (error === "missing-booking-data") {
    return "Please choose a service and a time slot.";
  }

  if (error === "expert-payout-not-ready") {
    return "This provider is finishing payout setup. Booking is temporarily unavailable.";
  }

  return "Something went wrong. Please try again.";
}