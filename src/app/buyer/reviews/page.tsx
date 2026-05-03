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
  Star,
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

  const waitingForReview = completedBookings.filter((booking) => !booking.review);
  const reviewedBookings = completedBookings.filter((booking) => booking.review);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="surface-grid absolute inset-0 opacity-40" />

        <div className="relative p-6 md:p-8 lg:p-10">
          <Link
            href="/buyer"
            className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>

          {resolvedSearchParams.reviewed ? (
            <div className="mt-6 rounded-2xl border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-sm font-black text-[var(--success)]">
              Thank you. Your review was saved.
            </div>
          ) : null}

          {resolvedSearchParams.error ? (
            <div className="mt-6 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm font-black text-[var(--danger)]">
              {formatReviewError(resolvedSearchParams.error)}
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

              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
                Your feedback helps good experts grow and helps other clients
                choose with confidence.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
              <ButtonLink href="/experts">
                <Search size={18} />
                Find experts
              </ButtonLink>

              <ButtonLink href="/buyer/bookings" variant="secondary">
                My bookings
              </ButtonLink>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <MetricCard
              icon={CheckCircle2}
              label="Completed calls"
              value={String(completedBookings.length)}
              hint="Finished sessions"
            />

            <MetricCard
              icon={MessageCircle}
              label="Waiting reviews"
              value={String(waitingForReview.length)}
              hint="Need your feedback"
            />

            <MetricCard
              icon={Star}
              label="Reviewed"
              value={String(reviewedBookings.length)}
              hint="Already rated"
            />
          </div>
        </div>
      </section>

      <section className="p-6 md:p-8 lg:p-10">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
          <div className="grid gap-6">
            <Card className="p-5 md:p-6">
              <Badge variant="accent">
                <MessageCircle size={14} />
                Waiting for review
              </Badge>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                Calls to review
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted">
                Leave a rating after a completed call.
              </p>

              <div className="mt-6 grid gap-4">
                {waitingForReview.length > 0 ? (
                  waitingForReview.map((booking) => (
                    <ReviewFormCard key={booking.id} booking={booking} />
                  ))
                ) : (
                  <EmptyState
                    title="Nothing to review yet"
                    text="Completed calls that need feedback will appear here."
                  />
                )}
              </div>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card className="p-5 md:p-6">
              <Badge variant="primary">
                <ShieldCheck size={14} />
                Why reviews matter
              </Badge>

              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                Build trust on SkillDrop.
              </h2>

              <div className="mt-5 grid gap-3">
                <Tip text="Reviews help clients choose experts faster." />
                <Tip text="Experts can become verified after successful calls and good ratings." />
                <Tip text="Clear feedback makes the marketplace safer and more useful." />
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <Badge variant="success">
                <Star size={14} />
                Your past reviews
              </Badge>

              <div className="mt-5 grid gap-4">
                {reviewedBookings.length > 0 ? (
                  reviewedBookings.map((booking) => (
                    <ReviewedCard key={booking.id} booking={booking} />
                  ))
                ) : (
                  <EmptyState
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
}: {
  booking: {
    id: string;
    startTime: Date;
    endTime: Date;
    service: {
      title: string;
    };
    expert: {
      user: {
        name: string | null;
        email: string;
      };
    };
  };
}) {
  return (
    <div className="rounded-[26px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <Badge variant="primary">
            <Video size={14} />
            Completed call
          </Badge>

          <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
            {booking.service.title}
          </h3>

          <p className="mt-2 text-sm font-semibold leading-6 text-muted">
            With{" "}
            <span className="font-black text-[var(--foreground)]">
              {booking.expert.user.name ?? booking.expert.user.email}
            </span>
          </p>

          <p className="mt-3 inline-flex items-center gap-2 text-sm font-black text-muted">
            <Clock3 size={14} />
            {formatDateTime(booking.startTime)}
          </p>
        </div>

        <form action={createReviewAction} className="grid min-w-0 gap-3 lg:w-[360px]">
          <input type="hidden" name="bookingId" value={booking.id} />

          <div>
            <label className="text-sm font-black">Rating</label>

            <select name="rating" required className="input mt-2">
              <option value="5">5 — Excellent</option>
              <option value="4">4 — Good</option>
              <option value="3">3 — Okay</option>
              <option value="2">2 — Not great</option>
              <option value="1">1 — Bad</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-black">Comment</label>

            <textarea
              name="comment"
              rows={4}
              className="mt-2 w-full rounded-[22px] border border-[var(--border)] bg-white/88 p-4 text-sm font-semibold leading-6 outline-none transition focus:border-[var(--primary)]/50 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.11)]"
              placeholder="What was helpful? What should other clients know?"
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

function ReviewedCard({
  booking,
}: {
  booking: {
    id: string;
    startTime: Date;
    service: {
      title: string;
    };
    expert: {
      user: {
        name: string | null;
        email: string;
      };
    };
    review: {
      rating: number;
      comment: string | null;
      createdAt: Date;
    } | null;
  };
}) {
  if (!booking.review) {
    return null;
  }

  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant="success">
          <Star size={14} />
          {booking.review.rating}/5
        </Badge>

        <p className="text-xs font-bold text-muted">
          {formatDateTime(booking.review.createdAt)}
        </p>
      </div>

      <h3 className="mt-4 font-black tracking-[-0.02em]">
        {booking.service.title}
      </h3>

      <p className="mt-1 text-sm font-semibold text-muted">
        Expert: {booking.expert.user.name ?? booking.expert.user.email}
      </p>

      <p className="mt-3 text-sm font-semibold leading-6 text-muted">
        {booking.review.comment || "No comment left."}
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

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{value}</p>

      <p className="mt-1 text-sm font-semibold text-muted">{hint}</p>
    </Card>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <Star size={17} className="mt-0.5 shrink-0 text-[var(--accent)]" />
      <p className="text-sm font-bold leading-6 text-muted">{text}</p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-white/55 p-7 text-center">
      <h3 className="text-2xl font-black tracking-[-0.04em]">{title}</h3>

      <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-muted">
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
    return "Please choose a rating before submitting your review.";
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

  return "Something went wrong. Please try again.";
}