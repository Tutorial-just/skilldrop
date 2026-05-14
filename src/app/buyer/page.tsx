import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Code2,
  Compass,
  Euro,
  FileText,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Languages,
  Lightbulb,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Video,
  WalletCards,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  calculatePricingBreakdown,
  formatMoneyFromCents,
} from "@/config/pricing";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UnreadNotificationsCard } from "@/components/notifications/unread-notifications-card";
import { truncate } from "node:fs/promises";

const problemCards = [
  {
    title: "Improve my CV",
    text: "Find someone who can review your CV, resume or LinkedIn.",
    href: "/experts?q=CV resume LinkedIn job career",
    icon: WalletCards,
  },
  {
    title: "Understand a document",
    text: "Get help with forms, letters, admin papers or applications.",
    href: "/experts?q=documents forms admin letter application",
    icon: FileText,
  },
  {
    title: "Practice a language",
    text: "Translate, correct a message or practice speaking.",
    href: "/experts?q=translation language speaking practice message",
    icon: Languages,
  },
  {
    title: "Moving abroad",
    text: "Ask about relocation, first steps, housing and local life.",
    href: "/experts?q=moving abroad relocation housing local guidance",
    icon: Globe2,
  },
  {
    title: "Tech help",
    text: "Find help with coding, websites, IT issues or digital tools.",
    href: "/experts?q=tech coding website IT support",
    icon: Code2,
  },
  {
    title: "Study application",
    text: "Get help with motivation letters, school choices and study plans.",
    href: "/experts?q=study application university motivation letter",
    icon: GraduationCap,
  },
];

export default async function BuyerDashboardPage() {
  const { user } = await requireRole(["buyer", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const now = new Date();

  const buyer = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      savedExperts: {
        include: {
          expert: {
            include: {
              user: true,
              services: {
                where: {
                  isActive: true,
                },
                orderBy: {
                  priceCents: "asc",
                },
                take: 1,
              },
              availability: {
                where: {
                  startTime: {
                    gte: now,
                  },
                  isBooked: true,
                },
                orderBy: {
                  startTime: "asc",
                },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      },
    },
  });

  if (!buyer) {
    redirect("/sign-in");
  }

  const bookings = await prisma.booking.findMany({
    where: {
      buyerId: buyer.id,
    },
    include: {
      expert: {
        include: {
          user: true,
        },
      },
      service: true,
      callRoom: true,
      review: true,
    },
    orderBy: {
      startTime: "asc",
    },
    take: 30,
  });

  const upcomingBookings = bookings.filter(
    (booking) =>
      booking.startTime >= now &&
      booking.status !== "CANCELLED" &&
      booking.status !== "REFUNDED" &&
      booking.status !== "COMPLETED" &&
      booking.status !== "DISPUTED",
  );

  const pendingPaymentBookings = bookings.filter(
    (booking) => booking.status === "PENDING" && booking.startTime >= now,
  );

  const paidWaitingConfirmationBookings = bookings.filter(
    (booking) => booking.status === "PAID",
  );

  const confirmedUpcomingBookings = upcomingBookings.filter(
    (booking) => booking.status === "CONFIRMED",
  );

  const completedBookings = bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const waitingReviewBookings = bookings.filter(
    (booking) => booking.status === "COMPLETED" && !booking.review,
  );

  const joinableBooking = upcomingBookings.find((booking) =>
    canJoinBooking(booking),
  );

  const nextActionBooking =
    pendingPaymentBookings[0] ??
    joinableBooking ??
    waitingReviewBookings[0] ??
    confirmedUpcomingBookings[0] ??
    paidWaitingConfirmationBookings[0] ??
    upcomingBookings[0] ??
    null;

  const nextThreeBookings = upcomingBookings.slice(0, 3);

  const recentBookings = [...bookings]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 4);

  const totalBookedCents = bookings
    .filter(
      (booking) =>
        booking.status === "PAID" ||
        booking.status === "CONFIRMED" ||
        booking.status === "COMPLETED",
    )
    .reduce(
      (sum, booking) => sum + getBookingPricing(booking).clientTotalCents,
      0,
    );

  const recommendedExperts = await prisma.expertProfile.findMany({
    where: {
      status: "APPROVED",
      stripeAccountId: {
        not: null,
      },
      services: {
        some: {
          isActive: true,
        },
      },
      availability: {
        some: {
          startTime: {
            gte: now,
          },
          isBooked: true,
        },
      },
    },
    include: {
      user: true,
      services: {
        where: {
          isActive: true,
        },
        orderBy: {
          priceCents: "asc",
        },
        take: 1,
      },
      availability: {
        where: {
          startTime: {
            gte: now,
          },
          isBooked: true,
        },
        orderBy: {
          startTime: "asc",
        },
        take: 3,
      },
    },
    orderBy: [
      {
        isVerified: "desc",
      },
      {
        rating: "desc",
      },
      {
        totalSessions: "desc",
      },
    ],
    take: 4,
  });

  const buyerReadiness = calculateBuyerReadiness({
    hasUpcoming: upcomingBookings.length > 0,
    hasCompleted: completedBookings.length > 0,
    hasSavedExperts: buyer.savedExperts.length > 0,
    hasExpertsAvailable: recommendedExperts.length > 0,
    hasNoPendingPayment: pendingPaymentBookings.length === 0,
  });

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />
        <div className="absolute left-[-160px] top-[-180px] h-[420px] w-[420px] rounded-full bg-[var(--primary)]/10 blur-3xl" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[420px] w-[420px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Badge variant="primary">
                <Sparkles size={14} />
                Help workspace
              </Badge>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                What do you need help with today, {buyer.name ?? "friend"}?
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Search for a problem, find the right helper, book a short 1:1
                call and keep your bookings, saved helpers and reviews in one
                place.
              </p>

              <form action="/experts" className="mt-7 max-w-3xl">
                <div className="rounded-[28px] border border-[var(--border)] bg-white/78 p-3 shadow-[var(--shadow-sm)] backdrop-blur">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <div className="relative flex-1">
                      <Search
                        size={18}
                        className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted"
                      />

                      <input
                        name="q"
                        type="search"
                        placeholder="Try “CV review”, “visa documents”, “coding help”, “language practice”..."
                        className="input min-h-[54px] border-transparent bg-white pl-12 shadow-none"
                      />
                    </div>

                    <button type="submit" className="btn btn-primary min-h-[54px]">
                      Find help
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
              <ButtonLink href="/experts">
                <Search size={18} />
                Browse helpers
              </ButtonLink>

              <ButtonLink href="/buyer/bookings" variant="secondary">
                My bookings
                <ArrowRight size={18} />
              </ButtonLink>

              <ButtonLink href="/notifications" variant="secondary">
                <Bell size={18} />
                Notifications
              </ButtonLink>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              icon={Video}
              label="Upcoming"
              value={String(upcomingBookings.length)}
              hint="Reserved or scheduled calls"
            />

            <MetricCard
              icon={Clock3}
              label="To pay"
              value={String(pendingPaymentBookings.length)}
              hint="Waiting for checkout"
            />

            <MetricCard
              icon={CheckCircle2}
              label="Confirmed"
              value={String(confirmedUpcomingBookings.length)}
              hint="Ready for call window"
            />

            <MetricCard
              icon={Star}
              label="Reviews"
              value={String(waitingReviewBookings.length)}
              hint="Waiting feedback"
            />

            <MetricCard
              icon={Euro}
              label="Total paid"
              value={formatMoney(totalBookedCents)}
              hint="Confirmed spend"
            />
          </div>

          <div className="mt-5">
            <UnreadNotificationsCard userId={buyer.id} email={buyer.email} />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6">
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <Card className="p-5 md:p-6">
              {nextActionBooking ? (
                <MainActionPanel booking={nextActionBooking} />
              ) : (
                <StartPanel />
              )}
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <ShieldCheck size={14} />
                Workspace readiness
              </Badge>

              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-5xl font-black tracking-[-0.06em]">
                    {buyerReadiness}%
                  </p>

                  <p className="mt-2 text-sm font-semibold text-muted">
                    Ready to use
                  </p>
                </div>

                <p className="text-sm font-black text-[var(--primary-dark)]">
                  {buyerReadiness >= 70 ? "Good" : "Getting started"}
                </p>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[#8b5cf6]"
                  style={{ width: `${buyerReadiness}%` }}
                />
              </div>

              <div className="mt-5 grid gap-2">
                <MiniCheck
                  done={pendingPaymentBookings.length === 0}
                  text="No payment waiting"
                />

                <MiniCheck
                  done={upcomingBookings.length > 0}
                  text="Upcoming call scheduled"
                />

                <MiniCheck
                  done={buyer.savedExperts.length > 0}
                  text="Helper saved for later"
                />

                <MiniCheck
                  done={completedBookings.length > 0}
                  text="Completed first session"
                />

                <MiniCheck
                  done={recommendedExperts.length > 0}
                  text="Helpers available now"
                />
              </div>

              {waitingReviewBookings.length > 0 ? (
                <div className="mt-5 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-4">
                  <div className="flex gap-3">
                    <Star
                      size={18}
                      className="mt-0.5 shrink-0 text-[var(--accent)]"
                    />
                    <p className="text-sm font-bold leading-6 text-muted">
                      You have completed calls waiting for review. Leaving a
                      review helps keep the marketplace trustworthy.
                    </p>
                  </div>
                </div>
              ) : null}
            </Card>
          </div>

          <Card className="p-5 md:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <Badge variant="accent">
                  <Compass size={14} />
                  Browse by problem
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  Start with what you need.
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted">
                  Choose a common problem or search with your own words. SkillDrop
                  will match you with helpers by title, description, skills,
                  tags, languages and services.
                </p>
              </div>

              <ButtonLink href="/experts" variant="secondary">
                See marketplace
                <ArrowRight size={18} />
              </ButtonLink>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {problemCards.map((category) => {
                const Icon = category.icon;

                return (
                  <Link key={category.title} href={category.href} className="group">
                    <div className="h-full rounded-[22px] border border-[var(--border)] bg-white/64 p-4 transition group-hover:-translate-y-0.5 group-hover:bg-white group-hover:shadow-[var(--shadow-sm)]">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
                        <Icon size={18} />
                      </div>

                      <h3 className="mt-4 font-black tracking-[-0.02em]">
                        {category.title}
                      </h3>

                      <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                        {category.text}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
            <div className="grid gap-6">
              {pendingPaymentBookings.length > 0 ? (
                <Card className="border-[var(--warning)]/20 bg-[var(--warning-soft)] p-5 md:p-6">
                  <Badge variant="accent">
                    <Clock3 size={14} />
                    Payment waiting
                  </Badge>

                  <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                    Confirm your reserved slots.
                  </h2>

                  <p className="mt-2 text-sm font-bold leading-6 text-muted">
                    These calls are not confirmed yet. Complete payment before
                    the reservation expires.
                  </p>

                  <div className="mt-6 grid gap-4">
                    {pendingPaymentBookings.slice(0, 3).map((booking) => (
                      <SmallBookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                </Card>
              ) : null}

              {waitingReviewBookings.length > 0 ? (
                <Card className="border-[var(--accent)]/20 bg-[var(--accent-soft)] p-5 md:p-6">
                  <Badge variant="accent">
                    <Star size={14} />
                    Review waiting
                  </Badge>

                  <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                    Share feedback after your calls.
                  </h2>

                  <p className="mt-2 text-sm font-bold leading-6 text-muted">
                    Your feedback helps good helpers grow and helps other users
                    choose safely.
                  </p>

                  <div className="mt-6 grid gap-4">
                    {waitingReviewBookings.slice(0, 3).map((booking) => (
                      <SmallBookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                </Card>
              ) : null}

              <Card className="p-5 md:p-6">
                <Badge variant="primary">
                  <CalendarDays size={14} />
                  Upcoming bookings
                </Badge>

                <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <h2 className="text-3xl font-black tracking-[-0.05em]">
                      Your schedule
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-muted">
                      Your next calls and reservations appear here.
                    </p>
                  </div>

                  <ButtonLink href="/buyer/bookings" variant="secondary">
                    View all
                  </ButtonLink>
                </div>

                <div className="mt-6 grid gap-4">
                  {nextThreeBookings.length > 0 ? (
                    nextThreeBookings.map((booking) => (
                      <SmallBookingCard key={booking.id} booking={booking} />
                    ))
                  ) : (
                    <EmptyState
                      title="No calls scheduled"
                      text="Book a call with a helper and it will appear here."
                    />
                  )}
                </div>
              </Card>

              <Card className="p-5 md:p-6">
                <Badge variant="accent">
                  <Bookmark size={14} />
                  Saved helpers
                </Badge>

                <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <h2 className="text-3xl font-black tracking-[-0.05em]">
                      Come back later
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-muted">
                      Helpers you saved for future calls.
                    </p>
                  </div>

                  <ButtonLink href="/buyer/saved" variant="secondary">
                    View saved
                  </ButtonLink>
                </div>

                <div className="mt-6 grid gap-4">
                  {buyer.savedExperts.length > 0 ? (
                    buyer.savedExperts.map((saved) => (
                      <SavedExpertPreview key={saved.id} saved={saved} />
                    ))
                  ) : (
                    <EmptyState
                      title="No saved helpers yet"
                      text="Save useful helpers so you can book them later."
                    />
                  )}
                </div>
              </Card>

              <Card soft className="p-5 md:p-6">
                <Badge variant="accent">
                  <Lightbulb size={14} />
                  Smart tip
                </Badge>

                <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                  {getSmartTipTitle({
                    hasPendingPayment: pendingPaymentBookings.length > 0,
                    hasUpcoming: upcomingBookings.length > 0,
                    hasSaved: buyer.savedExperts.length > 0,
                    hasCompleted: completedBookings.length > 0,
                    hasWaitingReview: waitingReviewBookings.length > 0,
                  })}
                </h2>

                <p className="mt-3 text-sm font-bold leading-6 text-muted">
                  {getSmartTipText({
                    hasPendingPayment: pendingPaymentBookings.length > 0,
                    hasUpcoming: upcomingBookings.length > 0,
                    hasSaved: buyer.savedExperts.length > 0,
                    hasCompleted: completedBookings.length > 0,
                    hasWaitingReview: waitingReviewBookings.length > 0,
                  })}
                </p>
              </Card>
            </div>

            <div className="grid gap-6">
              <Card className="p-5 md:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <Badge variant="primary">
                      <Compass size={14} />
                      Recommended helpers
                    </Badge>

                    <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                      Available now
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                      Helpers with active offers, open time slots and payout
                      setup ready.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {recommendedExperts.length > 0 ? (
                    recommendedExperts.map((expert) => (
                      <ExpertCard key={expert.id} expert={expert} />
                    ))
                  ) : (
                    <EmptyState
                      title="No helpers available yet"
                      text="New helpers will appear here after they add offers, availability and payouts."
                    />
                  )}
                </div>
              </Card>

              <Card className="p-5 md:p-6">
                <Badge variant="primary">
                  <Clock3 size={14} />
                  Recent activity
                </Badge>

                <div className="mt-5 grid gap-3">
                  {recentBookings.length > 0 ? (
                    recentBookings.map((booking) => (
                      <ActivityRow key={booking.id} booking={booking} />
                    ))
                  ) : (
                    <EmptyState
                      title="No activity yet"
                      text="Your bookings and reviews will appear here."
                    />
                  )}
                </div>
              </Card>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-6">
            <QuickAction
              icon={Search}
              title="Find help"
              text="Browse people who can help with practical questions."
              href="/experts"
            />

            <QuickAction
              icon={Video}
              title="Manage calls"
              text="See upcoming, completed and cancelled bookings."
              href="/buyer/bookings"
            />

            <QuickAction
              icon={Bell}
              title="Notifications"
              text="See booking updates, payment confirmations and review reminders."
              href="/notifications"
            />

            <QuickAction
              icon={Star}
              title="Leave reviews"
              text="Help strong helpers build trust after completed calls."
              href="/buyer/reviews"
            />

            <QuickAction
              icon={UserRound}
              title="Profile"
              text="Update your preferences, languages and interests."
              href="/buyer/profile"
            />

            <QuickAction
              icon={Settings}
              title="Settings"
              text="Manage privacy, account tools and workspace options."
              href="/buyer/settings"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

type DashboardBooking = {
  id: string;
  expertId: string;
  startTime: Date;
  endTime: Date;
  priceCents: number;
  status: string;
  note: string | null;
  clientServiceFeeCents?: number | null;
  clientTotalCents?: number | null;
  platformFeeCents?: number | null;
  providerNetCents?: number | null;
  updatedAt: Date;
  expert: {
    user: {
      name: string | null;
      email: string;
    };
  };
  service: {
    title: string;
    durationMinutes: number;
  } | null;
  callRoom: {
    roomUrl: string;
  } | null;
  review: {
    id: string;
    rating: number;
  } | null;
};

function MainActionPanel({ booking }: { booking: DashboardBooking }) {
  const canJoin = canJoinBooking(booking);
  const pricing = getBookingPricing(booking);
  const helperName = booking.expert.user.name ?? booking.expert.user.email;
  const bookingNote = booking.note?.trim() ?? "";
  const canReview = booking.status === "COMPLETED" && !booking.review;

  const title =
    booking.status === "PENDING"
      ? "Complete payment to confirm your call."
      : canJoin
        ? "Your call room is open."
        : canReview
          ? "Leave a review for your completed call."
          : booking.status === "CONFIRMED"
            ? "Your next session is confirmed."
            : booking.status === "PAID"
              ? "Payment received. Confirmation is pending."
              : "Your next session is ready.";

  const description =
    booking.status === "PENDING"
      ? "This reservation is not confirmed yet. Finish checkout to keep the selected time."
      : canJoin
        ? "Join now and make sure your microphone and camera are ready."
        : canReview
          ? "Your feedback helps other buyers choose and helps good helpers grow."
          : booking.status === "CONFIRMED"
            ? "Prepare one clear question before the call starts."
            : booking.status === "PAID"
              ? "The system is finishing confirmation. Check again shortly."
              : "Open your bookings page to manage this call.";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
      <div>
        <Badge
          variant={
            booking.status === "PENDING"
              ? "accent"
              : canJoin || canReview
                ? "success"
                : "primary"
          }
        >
          {booking.status === "PENDING" ? (
            <>
              <Clock3 size={14} />
              Payment waiting
            </>
          ) : canJoin ? (
            <>
              <Video size={14} />
              Join now
            </>
          ) : canReview ? (
            <>
              <Star size={14} />
              Review waiting
            </>
          ) : (
            <>
              <Video size={14} />
              Next call
            </>
          )}
        </Badge>

        <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
          {title}
        </h2>

        <p className="mt-3 leading-7 text-muted">{description}</p>

        {bookingNote ? (
          <BookingNote note={bookingNote} className="mt-5" />
        ) : booking.status === "CONFIRMED" ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] bg-white/55 p-4">
            <div className="flex gap-3">
              <MessageCircle
                size={18}
                className="mt-0.5 shrink-0 text-[var(--primary-dark)]"
              />
              <p className="text-sm font-bold leading-6 text-muted">
                No note was added for this booking. Prepare one clear question
                before joining.
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {booking.status === "PENDING" ? (
            <Link
              href={`/buyer/bookings/${booking.id}/checkout`}
              className="btn btn-primary"
            >
              Complete payment
            </Link>
          ) : null}

          {canJoin ? (
            <Link href={`/calls/${booking.id}`} className="btn btn-primary">
              Join call
              <Video size={18} />
            </Link>
          ) : null}

          {canReview ? (
            <Link
              href={`/buyer/reviews?bookingId=${booking.id}`}
              className="btn btn-primary"
            >
              Leave review
              <Star size={18} />
            </Link>
          ) : null}

          <ButtonLink href="/buyer/bookings" variant="secondary">
            View bookings
          </ButtonLink>
        </div>
      </div>

      <div className="rounded-[26px] border border-[var(--border)] bg-white/64 p-5">
        <Badge variant="accent">
          <Clock3 size={14} />
          {formatStatus(booking.status)}
        </Badge>

        <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
          {booking.service?.title ?? "Booked call"}
        </h3>

        <p className="mt-2 text-sm font-semibold leading-6 text-muted">
          With{" "}
          <span className="font-black text-[var(--foreground)]">
            {helperName}
          </span>
        </p>

        <div className="mt-5 grid gap-3">
          <InfoRow label="Date" value={formatDateTime(booking.startTime)} />

          <InfoRow
            label="Duration"
            value={`${getDurationMinutes(
              booking.startTime,
              booking.endTime,
            )} minutes`}
          />

          <InfoRow
            label="Total"
            value={formatMoney(pricing.clientTotalCents)}
          />
        </div>
      </div>
    </div>
  );
}

function StartPanel() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr] lg:items-center">
      <div>
        <Badge variant="accent">
          <CalendarDays size={14} />
          Start here
        </Badge>

        <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
          Find someone who can help.
        </h2>

        <p className="mt-3 max-w-xl leading-7 text-muted">
          Search with your own words, compare helpers and book a short call when
          you find the right person.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/experts">
            Find help
            <Search size={18} />
          </ButtonLink>

          <ButtonLink href="/buyer/saved" variant="secondary">
            Saved helpers
            <Bookmark size={18} />
          </ButtonLink>
        </div>
      </div>

      <div className="rounded-[26px] border border-[var(--border)] bg-white/55 p-5">
        <Badge variant="primary">
          <Sparkles size={14} />
          How to begin
        </Badge>

        <div className="mt-5 grid gap-3">
          <OnboardingStep
            number="1"
            title="Describe your problem"
            text="Search by topic, language, country, skill or keyword."
          />

          <OnboardingStep
            number="2"
            title="Choose a helper"
            text="Compare profiles, services, price, reviews and availability."
          />

          <OnboardingStep
            number="3"
            title="Book a short call"
            text="Ask one clear question and leave with next steps."
          />
        </div>
      </div>
    </div>
  );
}

function SmallBookingCard({ booking }: { booking: DashboardBooking }) {
  const pricing = getBookingPricing(booking);
  const canJoin = canJoinBooking(booking);
  const canReview = booking.status === "COMPLETED" && !booking.review;
  const bookingNote = booking.note?.trim() ?? "";

  return (
    <div className="rounded-[26px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={booking.status} />

            {bookingNote ? (
              <Badge variant="primary">
                <MessageCircle size={14} />
                Note
              </Badge>
            ) : null}

            {canJoin ? (
              <Badge variant="success">
                <Video size={14} />
                Join now
              </Badge>
            ) : null}

            {canReview ? (
              <Badge variant="accent">
                <Star size={14} />
                Review waiting
              </Badge>
            ) : null}
          </div>

          <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
            {booking.service?.title ?? "Booked call"}
          </h3>

          <p className="mt-2 text-sm font-semibold leading-6 text-muted">
            With{" "}
            <span className="font-black text-[var(--foreground)]">
              {booking.expert.user.name ?? booking.expert.user.email}
            </span>
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <SmallPill icon={Clock3} text={formatDateTime(booking.startTime)} />

            <SmallPill
              icon={Video}
              text={`${getDurationMinutes(
                booking.startTime,
                booking.endTime,
              )} min`}
            />

            <SmallPill icon={Euro} text={formatMoney(pricing.clientTotalCents)} />
          </div>

          {bookingNote ? (
            <BookingNote note={bookingNote} className="mt-4" compact />
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 md:min-w-[150px]">
          {booking.status === "PENDING" ? (
            <Link
              href={`/buyer/bookings/${booking.id}/checkout`}
              className="btn btn-primary"
            >
              Pay
            </Link>
          ) : null}

          {canJoin ? (
            <Link href={`/calls/${booking.id}`} className="btn btn-primary">
              Join
              <Video size={17} />
            </Link>
          ) : null}

          {canReview ? (
            <Link
              href={`/buyer/reviews?bookingId=${booking.id}`}
              className="btn btn-primary"
            >
              Review
              <Star size={17} />
            </Link>
          ) : null}

          <Link href={`/experts/${booking.expertId}`} className="btn btn-secondary">
            Helper
          </Link>
        </div>
      </div>
    </div>
  );
}

function BookingNote({
  note,
  className = "",
  compact = false,
}: {
  note: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-white/64 p-4 ${className}`}
    >
      <div className="flex gap-3">
        <MessageCircle
          size={18}
          className="mt-0.5 shrink-0 text-[var(--primary-dark)]"
        />

        <div>
          <p className="text-sm font-black">Your note</p>
          <p
            className={
              compact
                ? "mt-1 line-clamp-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-muted"
                : "mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-muted"
            }
          >
            {note}
          </p>
        </div>
      </div>
    </div>
  );
}

function SavedExpertPreview({
  saved,
}: {
  saved: {
    id: string;
    expert: {
      id: string;
      headline: string;
      rating: number;
      isVerified: boolean;
      skills: string[];
      user: {
        name: string | null;
        email: string;
      };
      services: {
        priceCents: number;
        title: string;
      }[];
      availability: {
        id: string;
        startTime: Date;
      }[];
    };
  };
}) {
  const expert = saved.expert;
  const startingPrice = expert.services[0]?.priceCents ?? null;
  const nextSlot = expert.availability[0] ?? null;
  const startingTotal = startingPrice
    ? calculatePricingBreakdown(startingPrice).clientTotalCents
    : null;

  return (
    <Link href={`/experts/${expert.id}`} className="group">
      <div className="rounded-[24px] border border-[var(--border)] bg-white/64 p-4 transition group-hover:-translate-y-0.5 group-hover:bg-white group-hover:shadow-[var(--shadow-sm)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-lg font-black text-white">
            {expert.user.name?.charAt(0).toUpperCase() ?? "H"}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              {expert.isVerified ? (
                <Badge variant="success">
                  <BadgeCheck size={14} />
                  Verified
                </Badge>
              ) : (
                <Badge variant="accent">New</Badge>
              )}

              {startingTotal ? (
                <Badge variant="primary">
                  From {formatMoney(startingTotal)}
                </Badge>
              ) : null}
            </div>

            <h3 className="mt-3 font-black tracking-[-0.02em]">
              {expert.user.name ?? expert.user.email}
            </h3>

            <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-muted">
              {expert.headline}
            </p>

            {nextSlot ? (
              <p className="mt-3 text-xs font-black text-[var(--primary-dark)]">
                Next slot: {formatDateTime(nextSlot.startTime)}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ExpertCard({
  expert,
}: {
  expert: {
    id: string;
    headline: string;
    country: string | null;
    rating: number;
    isVerified: boolean;
    skills: string[];
    user: {
      name: string | null;
      email: string;
    };
    services: {
      priceCents: number;
      title: string;
    }[];
    availability: {
      id: string;
      startTime: Date;
    }[];
  };
}) {
  const startingPrice = expert.services[0]?.priceCents ?? null;
  const nextSlot = expert.availability[0] ?? null;
  const startingTotal = startingPrice
    ? calculatePricingBreakdown(startingPrice).clientTotalCents
    : null;

  return (
    <Link href={`/experts/${expert.id}`} className="group">
      <div className="h-full rounded-[26px] border border-[var(--border)] bg-white/64 p-4 transition group-hover:-translate-y-0.5 group-hover:bg-white group-hover:shadow-[var(--shadow-sm)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-xl font-black text-white">
            {expert.user.name?.charAt(0).toUpperCase() ?? "H"}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              {expert.isVerified ? (
                <Badge variant="success">
                  <BadgeCheck size={14} />
                  Verified
                </Badge>
              ) : (
                <Badge variant="accent">New</Badge>
              )}

              {startingTotal ? (
                <Badge variant="primary">
                  From {formatMoney(startingTotal)}
                </Badge>
              ) : null}
            </div>

            <h3 className="mt-3 font-black tracking-[-0.02em]">
              {expert.user.name ?? expert.user.email}
            </h3>

            <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-muted">
              {expert.headline}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {expert.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-[var(--border)] bg-white/64 px-3 py-1 text-xs font-black text-[var(--muted-foreground)]"
            >
              #{skill}
            </span>
          ))}
        </div>

        {nextSlot ? (
          <p className="mt-4 text-xs font-black text-[var(--primary-dark)]">
            Next slot: {formatDateTime(nextSlot.startTime)}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function ActivityRow({ booking }: { booking: DashboardBooking }) {
  const bookingNote = booking.note?.trim() ?? "";

  return (
    <Link href="/buyer/bookings" className="group">
      <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-4 transition group-hover:bg-white group-hover:shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={booking.status} />

            {bookingNote ? (
              <Badge variant="primary">
                <MessageCircle size={14} />
                Note
              </Badge>
            ) : null}
          </div>

          <p className="text-xs font-bold text-muted">
            {formatDateTime(booking.startTime)}
          </p>
        </div>

        <p className="mt-3 font-black tracking-[-0.02em]">
          {booking.service?.title ?? "Booked call"}
        </p>

        <p className="mt-1 text-sm font-semibold text-muted">
          With {booking.expert.user.name ?? booking.expert.user.email}
        </p>

        {bookingNote ? (
          <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-muted">
            {bookingNote}
          </p>
        ) : null}
      </div>
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
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={20} />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{value}</p>

      <p className="mt-1 text-sm font-semibold text-muted">{hint}</p>
    </Card>
  );
}

function QuickAction({
  icon: Icon,
  title,
  text,
  href,
}: {
  icon: typeof Search;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-md)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
          <Icon size={21} />
        </div>

        <h3 className="mt-5 text-xl font-black tracking-[-0.03em]">{title}</h3>

        <p className="mt-2 text-sm font-semibold leading-6 text-muted">{text}</p>

        <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]">
          Open
          <ArrowRight size={16} />
        </div>
      </Card>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PENDING") {
    return <Badge variant="accent">Pending payment</Badge>;
  }

  if (status === "PAID") {
    return <Badge variant="primary">Paid</Badge>;
  }

  if (status === "CONFIRMED") {
    return <Badge variant="success">Confirmed</Badge>;
  }

  if (status === "COMPLETED") {
    return <Badge variant="success">Completed</Badge>;
  }

  if (status === "CANCELLED") {
    return <Badge variant="danger">Cancelled</Badge>;
  }

  if (status === "REFUNDED") {
    return <Badge variant="danger">Refunded</Badge>;
  }

  if (status === "DISPUTED") {
    return <Badge variant="danger">Disputed</Badge>;
  }

  return <Badge variant="accent">{status.toLowerCase()}</Badge>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/64 p-3">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="text-right text-sm font-black">{value}</p>
    </div>
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
        {done ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
      </div>

      <p className="text-sm font-bold text-muted">{text}</p>
    </div>
  );
}

function SmallPill({
  icon: Icon,
  text,
}: {
  icon: typeof Clock3;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/64 px-3 py-1.5 text-xs font-black text-[var(--muted-foreground)]">
      <Icon size={13} />
      {text}
    </span>
  );
}

function OnboardingStep({
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

function calculateBuyerReadiness({
  hasUpcoming,
  hasCompleted,
  hasSavedExperts,
  hasExpertsAvailable,
  hasNoPendingPayment,
}: {
  hasUpcoming: boolean;
  hasCompleted: boolean;
  hasSavedExperts: boolean;
  hasExpertsAvailable: boolean;
  hasNoPendingPayment: boolean;
}) {
  const checks = [
    hasNoPendingPayment,
    hasUpcoming,
    hasCompleted,
    hasSavedExperts,
    hasExpertsAvailable,
  ];

  const completed = checks.filter(Boolean).length;

  return Math.round((completed / checks.length) * 100);
}

function getSmartTipTitle({
  hasPendingPayment,
  hasUpcoming,
  hasSaved,
  hasCompleted,
  hasWaitingReview,
}: {
  hasPendingPayment: boolean;
  hasUpcoming: boolean;
  hasSaved: boolean;
  hasCompleted: boolean;
  hasWaitingReview: boolean;
}) {
  if (hasPendingPayment) {
    return "Complete your payment.";
  }

  if (hasWaitingReview) {
    return "Leave a review.";
  }

  if (hasUpcoming) {
    return "Prepare for your next call.";
  }

  if (hasSaved) {
    return "Book a saved helper.";
  }

  if (hasCompleted) {
    return "Book your next helpful session.";
  }

  return "Start with one clear question.";
}

function getSmartTipText({
  hasPendingPayment,
  hasUpcoming,
  hasSaved,
  hasCompleted,
  hasWaitingReview,
}: {
  hasPendingPayment: boolean;
  hasUpcoming: boolean;
  hasSaved: boolean;
  hasCompleted: boolean;
  hasWaitingReview: boolean;
}) {
  if (hasPendingPayment) {
    return "You have a reserved slot waiting for payment. Complete checkout before the reservation expires.";
  }

  if (hasWaitingReview) {
    return "You have completed calls waiting for feedback. Reviews help strong helpers grow and help other buyers choose safely.";
  }

  if (hasUpcoming) {
    return "Write down what you want to solve before the call starts. Short calls work best when the question is clear.";
  }

  if (hasSaved) {
    return "You already saved a helper. Open saved helpers and book a time when you are ready.";
  }

  if (hasCompleted) {
    return "You already completed a call. Find another helper when you need support with a new topic.";
  }

  return "Choose a simple problem, pick a helper and book a short call. You do not need a perfect plan to start.";
}

function canJoinBooking(booking: {
  startTime: Date;
  endTime: Date;
  status: string;
  callRoom: {
    roomUrl: string;
  } | null;
}) {
  const now = new Date();
  const joinWindowStart = new Date(booking.startTime.getTime() - 10 * 60 * 1000);
  const joinWindowEnd = new Date(booking.endTime.getTime() + 15 * 60 * 1000);

  return (
    booking.status === "CONFIRMED" &&
    Boolean(booking.callRoom?.roomUrl) &&
    now >= joinWindowStart &&
    now <= joinWindowEnd
  );
}

function getBookingPricing(booking: {
  priceCents: number;
  clientServiceFeeCents?: number | null;
  clientTotalCents?: number | null;
}) {
  const fallback = calculatePricingBreakdown(booking.priceCents);

  return {
    servicePriceCents: booking.priceCents,
    clientServiceFeeCents:
      typeof booking.clientServiceFeeCents === "number"
        ? booking.clientServiceFeeCents
        : fallback.clientServiceFeeCents,
    clientTotalCents:
      typeof booking.clientTotalCents === "number"
        ? booking.clientTotalCents
        : fallback.clientTotalCents,
  };
}

function getDurationMinutes(startTime: Date, endTime: Date) {
  return Math.max(
    Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60),
    0,
  );
}

function formatMoney(cents: number) {
  return formatMoneyFromCents(cents);
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

function formatStatus(status: string) {
  if (status === "PENDING") {
    return "Pending payment";
  }

  if (status === "PAID") {
    return "Paid";
  }

  if (status === "CONFIRMED") {
    return "Confirmed";
  }

  if (status === "COMPLETED") {
    return "Completed";
  }

  if (status === "CANCELLED") {
    return "Cancelled";
  }

  if (status === "REFUNDED") {
    return "Refunded";
  }

  if (status === "DISPUTED") {
    return "Disputed";
  }

  return status.toLowerCase();
}