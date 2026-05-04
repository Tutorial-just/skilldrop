import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Compass,
  Euro,
  Bell,
  HeartHandshake,
  Lightbulb,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Video,
  WalletCards,
  XCircle,
} from "lucide-react";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const helpCategories = [
  {
    title: "Life advice",
    text: "Talk with someone who can help you think clearly.",
    href: "/experts?q=life advice",
    icon: HeartHandshake,
  },
  {
    title: "Moving abroad",
    text: "Ask about documents, first steps and local life.",
    href: "/experts?q=moving abroad",
    icon: Compass,
  },
  {
    title: "Languages",
    text: "Find people who can translate, explain or practice.",
    href: "/experts?q=translation language",
    icon: Sparkles,
  },
  {
    title: "Career",
    text: "Get advice about work, choices and next steps.",
    href: "/experts?q=career",
    icon: WalletCards,
  },
];

export default async function BuyerDashboardPage() {
  const { user } = await requireRole(["buyer", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

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
                    gte: new Date(),
                  },
                  isBooked: false,
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

  const now = new Date();

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
      booking.status !== "COMPLETED",
  );

  const completedBookings = bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const cancelledBookings = bookings.filter(
    (booking) => booking.status === "CANCELLED" || booking.status === "REFUNDED",
  );

  const waitingReviewBookings = bookings.filter(
    (booking) => booking.status === "COMPLETED" && !booking.review,
  );

  const nextBooking = upcomingBookings[0] ?? null;
  const nextThreeBookings = upcomingBookings.slice(0, 3);
  const recentBookings = [...bookings]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 4);

  const totalBookedCents = bookings
    .filter(
      (booking) =>
        booking.status !== "CANCELLED" && booking.status !== "REFUNDED",
    )
    .reduce((sum, booking) => sum + booking.priceCents, 0);

  const recommendedExperts = await prisma.expertProfile.findMany({
    where: {
      status: "APPROVED",
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
          isBooked: false,
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
          isBooked: false,
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
    hasReviewWaiting: waitingReviewBookings.length > 0,
    hasExpertsAvailable: recommendedExperts.length > 0,
  });

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Badge variant="primary">
                <Sparkles size={14} />
                Client workspace
              </Badge>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Welcome back, {buyer.name ?? "friend"}.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Manage your calls, saved experts, reviews and next helpful
                session from one place.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
              <ButtonLink href="/experts">
                <Search size={18} />
                Find help
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

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Video}
              label="Upcoming"
              value={String(upcomingBookings.length)}
              hint="Scheduled calls"
            />

            <MetricCard
              icon={Bookmark}
              label="Saved"
              value={String(buyer.savedExperts.length)}
              hint="Experts saved"
            />

            <MetricCard
              icon={Star}
              label="Reviews"
              value={String(waitingReviewBookings.length)}
              hint="Waiting feedback"
            />

            <MetricCard
              icon={Euro}
              label="Total booked"
              value={formatMoney(totalBookedCents)}
              hint="Non-cancelled calls"
            />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6">
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <Card className="p-5 md:p-6">
              {nextBooking ? (
                <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
                  <div>
                    <Badge variant="success">
                      <Video size={14} />
                      Next call
                    </Badge>

                    <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                      Your next session is ready.
                    </h2>

                    <p className="mt-3 leading-7 text-muted">
                      Join on time, prepare one clear question and get the most
                      out of your call.
                    </p>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      {nextBooking.callRoom?.roomUrl ? (
                        <Link
                          href={nextBooking.callRoom.roomUrl}
                          className="btn btn-primary"
                        >
                          Join call
                          <Video size={18} />
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
                      Upcoming
                    </Badge>

                    <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                      {nextBooking.service?.title ?? "Booked call"}
                    </h3>

                    <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                      With{" "}
                      <span className="font-black text-[var(--foreground)]">
                        {nextBooking.expert.user.name ??
                          nextBooking.expert.user.email}
                      </span>
                    </p>

                    <div className="mt-5 grid gap-3">
                      <InfoRow
                        label="Date"
                        value={formatDateTime(nextBooking.startTime)}
                      />

                      <InfoRow
                        label="Duration"
                        value={`${getDurationMinutes(
                          nextBooking.startTime,
                          nextBooking.endTime,
                        )} minutes`}
                      />

                      <InfoRow
                        label="Price"
                        value={formatMoney(nextBooking.priceCents)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
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
                      Browse experts, save useful profiles and book a short call
                      when you find the right person.
                    </p>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <ButtonLink href="/experts">
                        Find help
                        <Search size={18} />
                      </ButtonLink>

                      <ButtonLink href="/buyer/saved" variant="secondary">
                        Saved experts
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
                        title="Find an expert"
                        text="Search by topic, language or problem."
                      />

                      <OnboardingStep
                        number="2"
                        title="Save or book"
                        text="Save useful profiles or choose a time."
                      />

                      <OnboardingStep
                        number="3"
                        title="Join the call"
                        text="Ask one clear question and get help."
                      />
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <ShieldCheck size={14} />
                Client readiness
              </Badge>

              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-5xl font-black tracking-[-0.06em]">
                    {buyerReadiness}%
                  </p>

                  <p className="mt-2 text-sm font-semibold text-muted">
                    Workspace ready
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
                  done={upcomingBookings.length > 0}
                  text="Upcoming call scheduled"
                />

                <MiniCheck
                  done={buyer.savedExperts.length > 0}
                  text="Expert saved for later"
                />

                <MiniCheck
                  done={completedBookings.length > 0}
                  text="Completed first session"
                />

                <MiniCheck
                  done={waitingReviewBookings.length > 0}
                  text="Review waiting"
                />
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
            <div className="grid gap-6">
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
                      Your next calls appear here.
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
                      text="Book a call with an expert and it will appear here."
                    />
                  )}
                </div>
              </Card>

              <Card className="p-5 md:p-6">
                <Badge variant="accent">
                  <Bookmark size={14} />
                  Saved experts
                </Badge>

                <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <h2 className="text-3xl font-black tracking-[-0.05em]">
                      Come back later
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-muted">
                      Experts you saved for future calls.
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
                      title="No saved experts yet"
                      text="Save useful experts so you can book them later."
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
                    hasUpcoming: upcomingBookings.length > 0,
                    hasSaved: buyer.savedExperts.length > 0,
                    hasCompleted: completedBookings.length > 0,
                    hasWaitingReview: waitingReviewBookings.length > 0,
                  })}
                </h2>

                <p className="mt-3 text-sm font-bold leading-6 text-muted">
                  {getSmartTipText({
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
                      Recommended experts
                    </Badge>

                    <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                      Available helpers
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                      Experts with active services and open time slots.
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
                      title="No experts available yet"
                      text="New experts will appear here after they add services and availability."
                    />
                  )}
                </div>
              </Card>

              <Card className="p-5 md:p-6">
                <Badge variant="accent">
                  <Search size={14} />
                  Browse by need
                </Badge>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {helpCategories.map((category) => {
                    const Icon = category.icon;

                    return (
                      <Link
                        key={category.title}
                        href={category.href}
                        className="group"
                      >
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

          <div className="grid gap-6 xl:grid-cols-3">
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
              text="Help strong experts build trust after completed calls."
              href="/buyer/reviews"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function SmallBookingCard({
  booking,
}: {
  booking: {
    id: string;
    expertId: string;
    startTime: Date;
    endTime: Date;
    priceCents: number;
    status: string;
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
  };
}) {
  return (
    <div className="rounded-[26px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <Badge variant="primary">{booking.status}</Badge>

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

            <SmallPill icon={Euro} text={formatMoney(booking.priceCents)} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 md:min-w-[150px]">
          {booking.callRoom?.roomUrl ? (
            <Link href={booking.callRoom.roomUrl} className="btn btn-primary">
              Join
              <Video size={17} />
            </Link>
          ) : null}

          <Link href={`/experts/${booking.expertId}`} className="btn btn-secondary">
            Expert
          </Link>
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

  return (
    <Link href={`/experts/${expert.id}`} className="group">
      <div className="rounded-[24px] border border-[var(--border)] bg-white/64 p-4 transition group-hover:-translate-y-0.5 group-hover:bg-white group-hover:shadow-[var(--shadow-sm)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-lg font-black text-white">
            {expert.user.name?.charAt(0).toUpperCase() ?? "P"}
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

              {startingPrice ? (
                <Badge variant="primary">From {formatMoney(startingPrice)}</Badge>
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

  return (
    <Link href={`/experts/${expert.id}`} className="group">
      <div className="h-full rounded-[26px] border border-[var(--border)] bg-white/64 p-4 transition group-hover:-translate-y-0.5 group-hover:bg-white group-hover:shadow-[var(--shadow-sm)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-[var(--primary)] to-[#8b5cf6] text-xl font-black text-white">
            {expert.user.name?.charAt(0).toUpperCase() ?? "P"}
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

              {startingPrice ? (
                <Badge variant="primary">From {formatMoney(startingPrice)}</Badge>
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

function ActivityRow({
  booking,
}: {
  booking: {
    id: string;
    expertId: string;
    startTime: Date;
    status: string;
    service: {
      title: string;
    } | null;
    expert: {
      user: {
        name: string | null;
        email: string;
      };
    };
  };
}) {
  return (
    <Link href="/buyer/bookings" className="group">
      <div className="rounded-2xl border border-[var(--border)] bg-white/64 p-4 transition group-hover:bg-white group-hover:shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between gap-3">
          <Badge variant={booking.status === "COMPLETED" ? "success" : "primary"}>
            {booking.status.toLowerCase()}
          </Badge>

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
  hasReviewWaiting,
  hasExpertsAvailable,
}: {
  hasUpcoming: boolean;
  hasCompleted: boolean;
  hasSavedExperts: boolean;
  hasReviewWaiting: boolean;
  hasExpertsAvailable: boolean;
}) {
  const checks = [
    hasUpcoming,
    hasCompleted,
    hasSavedExperts,
    hasReviewWaiting,
    hasExpertsAvailable,
  ];

  const completed = checks.filter(Boolean).length;

  return Math.round((completed / checks.length) * 100);
}

function getSmartTipTitle({
  hasUpcoming,
  hasSaved,
  hasCompleted,
  hasWaitingReview,
}: {
  hasUpcoming: boolean;
  hasSaved: boolean;
  hasCompleted: boolean;
  hasWaitingReview: boolean;
}) {
  if (hasWaitingReview) {
    return "Leave a review.";
  }

  if (hasUpcoming) {
    return "Prepare for your next call.";
  }

  if (hasSaved) {
    return "Book a saved expert.";
  }

  if (hasCompleted) {
    return "Book your next helpful session.";
  }

  return "Start with one clear question.";
}

function getSmartTipText({
  hasUpcoming,
  hasSaved,
  hasCompleted,
  hasWaitingReview,
}: {
  hasUpcoming: boolean;
  hasSaved: boolean;
  hasCompleted: boolean;
  hasWaitingReview: boolean;
}) {
  if (hasWaitingReview) {
    return "You have completed calls waiting for feedback. Reviews help strong experts grow and help other clients choose safely.";
  }

  if (hasUpcoming) {
    return "Write down what you want to solve before the call starts. Short calls work best when the question is clear.";
  }

  if (hasSaved) {
    return "You already saved an expert. Open saved experts and book a time when you are ready.";
  }

  if (hasCompleted) {
    return "You already completed a call. Find another expert when you need support with a new topic.";
  }

  return "Choose a simple problem, pick an expert and book a short call. You do not need a perfect plan to start.";
}

function getDurationMinutes(startTime: Date, endTime: Date) {
  return Math.max(
    Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60),
    0,
  );
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