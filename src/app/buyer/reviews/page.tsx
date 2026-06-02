import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsUp,
  Video,
} from "lucide-react";

import { createReviewAction } from "@/server/actions/review.actions";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type BuyerReviewsPageProps = {
  searchParams?: Promise<{
    bookingId?: string;
    reviewed?: string;
    error?: string;
  }>;
};

export default async function BuyerReviewsPage({
  searchParams,
}: BuyerReviewsPageProps) {
  const { user } = await requireRole(["buyer", "admin"]);
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const buyer = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!buyer) {
    redirect("/sign-in");
  }

  const selectedBookingId = resolvedSearchParams.bookingId ?? "";
  const reviewedBookingId = resolvedSearchParams.reviewed ?? "";
  const activeBookingId = selectedBookingId || reviewedBookingId;

  const completedBookings = await prisma.booking.findMany({
    where: {
      buyerId: buyer.id,
      status: "COMPLETED",
    },
    include: {
      expert: {
        include: {
          user: true,
        },
      },
      service: true,
      review: true,
    },
    orderBy: {
      startTime: "desc",
    },
  });

  const waitingForReview = completedBookings
    .filter((booking) => !booking.review)
    .sort((a, b) => {
      if (a.id === activeBookingId) {
        return -1;
      }

      if (b.id === activeBookingId) {
        return 1;
      }

      return b.startTime.getTime() - a.startTime.getTime();
    });

  const reviewedBookings = completedBookings
    .filter((booking) => booking.review)
    .sort((a, b) => {
      if (a.id === activeBookingId) {
        return -1;
      }

      if (b.id === activeBookingId) {
        return 1;
      }

      return b.startTime.getTime() - a.startTime.getTime();
    });

  const selectedBooking = completedBookings.find(
    (booking) => booking.id === selectedBookingId,
  );

  const reviewedBooking = completedBookings.find(
    (booking) => booking.id === reviewedBookingId,
  );

  const averageRating =
    reviewedBookings.length > 0
      ? reviewedBookings.reduce(
          (sum, booking) => sum + (booking.review?.rating ?? 0),
          0,
        ) / reviewedBookings.length
      : null;

  const recommendedCount = reviewedBookings.filter(
    (booking) => booking.review?.wouldRecommend === true,
  ).length;

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="container-page relative py-8 md:py-10 lg:py-12">
          <Link
            href="/buyer"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>

          {reviewedBookingId ? (
            <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-bold text-[var(--success)]">
              {reviewedBooking?.review
                ? `Review saved for “${
                    reviewedBooking.service?.title ?? "Booked call"
                  }”.`
                : "Thank you. Your review was saved."}
            </div>
          ) : null}

          {resolvedSearchParams.error ? (
            <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
              {formatReviewError(resolvedSearchParams.error)}
            </div>
          ) : null}

          {selectedBookingId && !selectedBooking ? (
            <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]">
              This booking is not available for review.
            </div>
          ) : null}

          <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <Badge variant="primary">
                <Star size={14} />
                Reviews
              </Badge>

              <h1 className="heading-lg mt-5 max-w-4xl text-balance">
                Review your completed calls.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                Your feedback helps strong helpers grow and helps other buyers
                choose with confidence.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
              <ButtonLink href="/experts">
                <Search size={18} />
                Find helpers
              </ButtonLink>

              <ButtonLink href="/buyer/bookings" variant="secondary">
                My bookings
              </ButtonLink>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              icon={CheckCircle2}
              label="Completed"
              value={String(completedBookings.length)}
              hint="Finished sessions"
            />

            <MetricCard
              icon={MessageCircle}
              label="To review"
              value={String(waitingForReview.length)}
              hint="Need feedback"
            />

            <MetricCard
              icon={Star}
              label="Reviewed"
              value={String(reviewedBookings.length)}
              hint="Already rated"
            />

            <MetricCard
              icon={Sparkles}
              label="Average"
              value={averageRating ? averageRating.toFixed(1) : "—"}
              hint="Your review average"
            />

            <MetricCard
              icon={ThumbsUp}
              label="Recommended"
              value={String(recommendedCount)}
              hint="Positive recommendations"
            />
          </div>
        </div>
      </section>

      <section className="container-page py-8 md:py-10 lg:py-12">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
          <div className="grid gap-6">
            {selectedBooking?.review ? (
              <Card className="border-[var(--success)]/20 bg-[var(--success-soft)] p-5 md:p-6">
                <Badge variant="success">
                  <CheckCircle2 size={14} />
                  Already reviewed
                </Badge>

                <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                  You already reviewed this call.
                </h2>

                <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                  You can see your submitted feedback in the review history.
                </p>
              </Card>
            ) : null}

            <Card className="p-5 md:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <Badge variant="accent">
                    <MessageCircle size={14} />
                    Waiting for review
                  </Badge>

                  <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
                    Calls to review
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                    Rate completed calls and share what was helpful.
                  </p>
                </div>

                <Badge>{waitingForReview.length} waiting</Badge>
              </div>

              <div className="mt-6 grid gap-4">
                {waitingForReview.length > 0 ? (
                  waitingForReview.map((booking) => (
                    <ReviewFormCard
                      key={booking.id}
                      booking={booking}
                      highlighted={booking.id === selectedBookingId}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon={CheckCircle2}
                    title="Nothing to review yet"
                    text="Completed calls that need feedback will appear here."
                  />
                )}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:sticky xl:top-[96px]">
            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <ShieldCheck size={14} />
                Why reviews matter
              </Badge>

              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
                Build trust on SkillDrop.
              </h2>

              <div className="mt-5 grid gap-3">
                <Tip text="Reviews help buyers choose helpers faster." />
                <Tip text="Detailed feedback helps helpers improve their offers." />
                <Tip text="Good reviews help verified helpers grow safely." />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <Badge variant="success">
                    <Star size={14} />
                    Your past reviews
                  </Badge>

                  <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
                    Review history
                  </h2>
                </div>

                <Badge>{reviewedBookings.length} total</Badge>
              </div>

              <div className="mt-5 grid gap-4">
                {reviewedBookings.length > 0 ? (
                  reviewedBookings.map((booking) => (
                    <ReviewedCard
                      key={booking.id}
                      booking={booking}
                      highlighted={booking.id === activeBookingId}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon={Star}
                    title="No reviews yet"
                    text="Your submitted reviews will appear here."
                  />
                )}
              </div>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

function ReviewFormCard({
  booking,
  highlighted,
}: {
  booking: {
    id: string;
    startTime: Date;
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
  highlighted: boolean;
}) {
  const helperName = booking.expert.user.name ?? booking.expert.user.email;
  const serviceTitle = booking.service?.title ?? "Booked call";

  return (
    <div
      className={
        highlighted
          ? "rounded-[26px] border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-4"
          : "rounded-[26px] border border-[var(--border)] bg-[var(--card-soft)] p-4"
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_430px] lg:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary">
              <Video size={14} />
              Completed call
            </Badge>

            {highlighted ? <Badge variant="accent">Selected</Badge> : null}
          </div>

          <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
            {serviceTitle}
          </h3>

          <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            With{" "}
            <span className="font-bold text-[var(--foreground)]">
              {helperName}
            </span>
          </p>

          <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted-foreground)]">
            <Clock3 size={14} />
            {formatDateTime(booking.startTime)}
          </p>

          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--background-soft)] p-4">
            <p className="text-sm font-medium leading-6 text-[var(--muted-foreground)]">
              Be honest and practical. Mention what was useful, what could be
              better, and whether you would recommend this helper.
            </p>
          </div>
        </div>

        <form action={createReviewAction} className="grid min-w-0 gap-3">
          <input type="hidden" name="bookingId" value={booking.id} />

          <ReviewSelect name="rating" label="Overall rating" required />

          <div className="grid gap-3 sm:grid-cols-3">
            <ReviewScoreSelect name="helpfulness" label="Helpfulness" />
            <ReviewScoreSelect name="clarity" label="Clarity" />
            <ReviewScoreSelect
              name="professionalism"
              label="Professionalism"
            />
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background-soft)] p-4">
            <p className="text-sm font-bold text-[var(--foreground)]">
              Was your problem solved?
            </p>

            <p className="mt-1 text-xs font-medium leading-5 text-[var(--muted-foreground)]">
              This helps SkillDrop understand whether the session really helped.
            </p>

            <div className="mt-3 grid gap-2">
              <RadioOption
                name="problemSolved"
                value="YES"
                label="Yes, my problem was solved"
              />

              <RadioOption
                name="problemSolved"
                value="PARTIALLY"
                label="Partially solved"
              />

              <RadioOption
                name="problemSolved"
                value="NO"
                label="No, my problem was not solved"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-[var(--foreground)]">
              Would you recommend?
            </label>

            <select
              name="wouldRecommend"
              className="input mt-2"
              defaultValue=""
              required
            >
              <option value="" disabled>
                Choose
              </option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-[var(--foreground)]">
              Comment
            </label>

            <textarea
              name="comment"
              rows={4}
              maxLength={1500}
              className="mt-2 w-full rounded-[22px] border border-[var(--border)] bg-[var(--background-soft)] p-4 text-sm font-medium leading-6 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]/50 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.11)]"
              placeholder="What was helpful? What should other buyers know?"
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Submit review
            <Send size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}

function RadioOption({
  name,
  value,
  label,
}: {
  name: string;
  value: string;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-2 text-sm font-medium text-[var(--foreground)]">
      <input type="radio" name={name} value={value} required />
      {label}
    </label>
  );
}

function ReviewSelect({
  name,
  label,
  required = false,
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-bold text-[var(--foreground)]">
        {label}
      </label>

      <select
        name={name}
        required={required}
        className="input mt-2"
        defaultValue=""
      >
        <option value="" disabled>
          Choose rating
        </option>
        <option value="5">5 — Excellent</option>
        <option value="4">4 — Good</option>
        <option value="3">3 — Okay</option>
        <option value="2">2 — Not great</option>
        <option value="1">1 — Bad</option>
      </select>
    </div>
  );
}

function ReviewScoreSelect({
  name,
  label,
}: {
  name: string;
  label: string;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-[var(--foreground)]">
        {label}
      </label>

      <select name={name} className="input mt-2" defaultValue="5" required>
        <option value="5">5</option>
        <option value="4">4</option>
        <option value="3">3</option>
        <option value="2">2</option>
        <option value="1">1</option>
      </select>
    </div>
  );
}

function ReviewedCard({
  booking,
  highlighted,
}: {
  booking: {
    id: string;
    startTime: Date;
    service: {
      title: string;
    } | null;
    expert: {
      user: {
        name: string | null;
        email: string;
      };
    };
    review: {
      rating: number;
      helpfulness: number | null;
      clarity: number | null;
      professionalism: number | null;
      wouldRecommend: boolean | null;
      problemSolved: string | null;
      comment: string | null;
      createdAt: Date;
    } | null;
  };
  highlighted: boolean;
}) {
  if (!booking.review) {
    return null;
  }

  const helperName = booking.expert.user.name ?? booking.expert.user.email;
  const serviceTitle = booking.service?.title ?? "Booked call";

  return (
    <div
      className={
        highlighted
          ? "rounded-[22px] border border-[var(--success)]/30 bg-[var(--success-soft)] p-4"
          : "rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)] p-4"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant="success">
          <Star size={14} />
          {booking.review.rating}/5
        </Badge>

        {booking.review.wouldRecommend === true ? (
          <Badge variant="primary">
            <ThumbsUp size={14} />
            Recommended
          </Badge>
        ) : null}

        {booking.review.wouldRecommend === false ? (
          <Badge variant="accent">Not recommended</Badge>
        ) : null}

        <Badge variant={getProblemSolvedBadgeVariant(booking.review.problemSolved)}>
          {formatProblemSolved(booking.review.problemSolved)}
        </Badge>

        <p className="text-xs font-medium text-[var(--muted-foreground)]">
          {formatDateTime(booking.review.createdAt)}
        </p>
      </div>

      <h3 className="mt-4 font-bold tracking-[-0.02em] text-[var(--foreground)]">
        {serviceTitle}
      </h3>

      <p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]">
        Helper: {helperName}
      </p>

      <p className="mt-1 inline-flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)]">
        <Clock3 size={13} />
        Call: {formatDateTime(booking.startTime)}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <ReviewMiniScore label="Helpfulness" value={booking.review.helpfulness} />
        <ReviewMiniScore label="Clarity" value={booking.review.clarity} />
        <ReviewMiniScore
          label="Professionalism"
          value={booking.review.professionalism}
        />
      </div>

      <p className="mt-4 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
        {booking.review.comment || "No comment left."}
      </p>
    </div>
  );
}

function ReviewMiniScore({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background-soft)] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-[var(--foreground)]">
        {value ? `${value}/5` : "—"}
      </p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Star;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card soft className="p-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={20} />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
        {value}
      </p>

      <p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]">
        {hint}
      </p>
    </Card>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <Star size={17} className="mt-0.5 shrink-0 text-[var(--accent)]" />

      <p className="text-sm font-medium leading-6 text-[var(--muted-foreground)]">
        {text}
      </p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Star;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card-soft)] p-7 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={24} />
      </div>

      <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
        {title}
      </h3>

      <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[var(--muted-foreground)]">
        {text}
      </p>
    </div>
  );
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

function formatReviewError(error: string) {
  if (error === "invalid-review") {
    return "Please choose valid scores before submitting your review.";
  }

  if (error === "booking-not-found") {
    return "Booking was not found.";
  }

  if (error === "not-allowed") {
    return "You are not allowed to review this booking.";
  }

  if (error === "not-completed") {
    return "You can only review completed calls.";
  }

  if (error === "already-reviewed") {
    return "You already reviewed this call.";
  }

  if (error === "comment-too-long") {
    return "Your comment is too long. Please keep it under 1500 characters.";
  }

  return "Something went wrong. Please try again.";
}

function formatProblemSolved(value: string | null) {
  if (value === "YES") {
    return "Problem solved";
  }

  if (value === "PARTIALLY") {
    return "Partially solved";
  }

  if (value === "NO") {
    return "Not solved";
  }

  return "Problem status unknown";
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