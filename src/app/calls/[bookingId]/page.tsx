import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  MessageCircle,
  ShieldCheck,
  UserRound,
  Video,
} from "lucide-react";
import { BookingStatus, CallRoomStatus } from "@prisma/client";

import { markCallCompletedAction } from "@/server/actions/call.actions";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatDateTime,
  getDurationMinutes,
  getUserTimezone,
} from "@/lib/date-time";

type CallAccessPageProps = {
  params: Promise<{
    bookingId: string;
  }>;
};

const JOIN_BEFORE_MINUTES = 10;
const JOIN_AFTER_END_MINUTES = 15;

export default async function CallAccessPage({ params }: CallAccessPageProps) {
  const { bookingId } = await params;
  const session = await getCurrentUser();

  const email = session.user?.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      buyerSettings: true,
    },
  });

  if (!currentUser) {
    redirect("/sign-in");
  }

  const userTimezone = getUserTimezone(
    currentUser.buyerSettings?.preferredTimezone,
  );

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      buyer: true,
      expert: {
        include: {
          user: true,
        },
      },
      service: true,
      callRoom: true,
    },
  });

  if (!booking) {
    redirect(getBookingsHref(currentUser.role));
  }

  const isBuyer = booking.buyerId === currentUser.id;
  const isExpert = booking.expert.userId === currentUser.id;
  const isAdmin = currentUser.role === "ADMIN";

  if (!isBuyer && !isExpert && !isAdmin) {
    redirect("/");
  }

  const backHref = getBookingsHref(currentUser.role);
  const bookingNote = booking.note?.trim() || "";
  const now = new Date();

  if (booking.status !== BookingStatus.CONFIRMED) {
    return (
      <CallBlockedPage
        title="This call is not open yet."
        text={getBlockedStatusText(booking.status)}
        backHref={backHref}
        timeLabel="Booking status"
        timeValue={formatStatus(booking.status)}
      />
    );
  }

  if (!booking.callRoom?.roomUrl) {
    return (
      <CallBlockedPage
        title="Video room is not ready yet."
        text="The booking is confirmed, but the video room has not been created yet. Please try again later or contact SkillDrop support."
        backHref={backHref}
      />
    );
  }

  const joinOpensAt = new Date(
    booking.startTime.getTime() - JOIN_BEFORE_MINUTES * 60 * 1000,
  );

  const joinClosesAt = new Date(
    booking.endTime.getTime() + JOIN_AFTER_END_MINUTES * 60 * 1000,
  );

  if (now < joinOpensAt && !isAdmin) {
    return (
      <CallBlockedPage
        title="Your call is not open yet."
        text={`You can join ${JOIN_BEFORE_MINUTES} minutes before the scheduled start time. This keeps the room protected and avoids early access confusion.`}
        backHref={backHref}
        timeLabel="Call starts"
        timeValue={formatDateTime(booking.startTime, userTimezone)}
        secondaryLabel="Join opens"
        secondaryValue={formatDateTime(joinOpensAt, userTimezone)}
      />
    );
  }

  if (now > joinClosesAt && !isAdmin) {
    if (booking.callRoom.status !== "ENDED") {
      await prisma.callRoom.updateMany({
        where: {
          bookingId: booking.id,
          status: {
            not: "ENDED",
          },
        },
        data: {
          status: CallRoomStatus.ENDED,
          endsAt: joinClosesAt,
        },
      });
    }

    return (
      <CallBlockedPage
        title="This call room is closed."
        text="The video room is no longer available for this booking. Go back to your bookings to review the session or manage your next call."
        backHref={backHref}
        timeLabel="Call ended"
        timeValue={formatDateTime(booking.endTime, userTimezone)}
        secondaryLabel="Room closed"
        secondaryValue={formatDateTime(joinClosesAt, userTimezone)}
      />
    );
  }

  if (booking.callRoom.status !== CallRoomStatus.LIVE) {
    await prisma.callRoom.updateMany({
      where: {
        bookingId: booking.id,
        status: {
          not: CallRoomStatus.LIVE,
        },
      },
      data: {
        status: CallRoomStatus.LIVE,
      },
    });
  }

  const canMarkCompleted =
    (isExpert || isAdmin) &&
    booking.status === BookingStatus.CONFIRMED &&
    now >= booking.endTime;

  const currentUserRoleLabel = isBuyer ? "Buyer" : isExpert ? "Helper" : "Admin";
  const buyerName = booking.buyer.name ?? booking.buyer.email;
  const helperName = booking.expert.user.name ?? booking.expert.user.email;

  return (
    <main className="container-page py-8 md:py-10 lg:py-12">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]"
      >
        <ArrowLeft size={16} />
        Back to bookings
      </Link>

      <div className="mx-auto mt-8 max-w-5xl">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-start">
          <Card className="p-6 md:p-8">
            <Badge variant="success">
              <Video size={14} />
              Call room ready
            </Badge>

            <h1 className="heading-lg mt-5 max-w-3xl text-balance">
              Join your SkillDrop call.
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
              Your booking is confirmed. Check the time, participants and call
              context below, then open the protected video room.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <InfoBox
                icon={Video}
                label="Offer"
                value={booking.service?.title ?? "Booked call"}
              />

              <InfoBox
                icon={Clock3}
                label="Time"
                value={formatDateTime(booking.startTime, userTimezone)}
              />

              <InfoBox icon={UserRound} label="Buyer" value={buyerName} />

              <InfoBox
                icon={ShieldCheck}
                label="Helper"
                value={helperName}
              />
            </div>

            <div className="mt-8 rounded-[26px] border border-[var(--border)] bg-[var(--card-soft)] p-5">
              <Badge variant="primary">
                <MessageCircle size={14} />
                Call context
              </Badge>

              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
                What this call is about
              </h2>

              {bookingNote ? (
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background-soft)] p-4">
                  <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-[var(--muted-foreground)]">
                    {bookingNote}
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--background-soft)] p-4">
                  <p className="text-sm font-medium leading-7 text-[var(--muted-foreground)]">
                    No note was added for this booking. Start the call by
                    clarifying the main question, expected result and useful
                    context.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 rounded-[26px] border border-[var(--border)] bg-[var(--card-soft)] p-5">
              <Badge variant="success">
                <CheckCircle2 size={14} />
                Pre-call checklist
              </Badge>

              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
                Prepare for a useful call
              </h2>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {isBuyer ? (
                  <>
                    <SafetyRule text="Open the file, screenshot or document you want to discuss before joining." />
                    <SafetyRule text="Write the one result you want by the end of the call." />
                    <SafetyRule text="Check your microphone, camera and network connection." />
                    <SafetyRule text="Be ready to ask for clear next steps after the discussion." />
                  </>
                ) : (
                  <>
                    <SafetyRule text="Read the buyer note and identify the expected result before joining." />
                    <SafetyRule text="Prepare useful links, examples or steps you can share after the call." />
                    <SafetyRule text="Check your microphone, camera and network connection." />
                    <SafetyRule text="After the call, create an outcome so the buyer leaves with an action plan." />
                  </>
                )}
              </div>
            </div>

            <div className="mt-8 rounded-[26px] border border-[var(--border)] bg-[var(--card-soft)] p-5">
              <Badge variant="primary">
                <Globe2 size={14} />
                Timezone note
              </Badge>

              <p className="mt-4 text-sm font-medium leading-7 text-[var(--muted-foreground)]">
                Times are shown using your SkillDrop timezone settings when
                available. If something looks wrong, check your account settings
                before the call.
              </p>
            </div>

            <div className="mt-8 rounded-[26px] border border-[var(--border)] bg-[var(--card-soft)] p-5">
              <Badge variant="primary">
                <ShieldCheck size={14} />
                Safety reminders
              </Badge>

              <div className="mt-5 grid gap-3">
                <SafetyRule text="Do not share passwords, bank codes, private account access or sensitive documents inside the call." />
                <SafetyRule text="Keep the conversation respectful, practical and focused on the booked offer." />
                <SafetyRule text="If something feels unsafe, leave the call and contact SkillDrop support." />
              </div>
            </div>
          </Card>

          <Card soft className="p-6 md:p-7 xl:sticky xl:top-[100px]">
            <Badge variant="accent">
              <CalendarDays size={14} />
              Ready
            </Badge>

            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
              Enter video room
            </h2>

            <p className="mt-3 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
              This button opens the secure video room for this booking.
            </p>

            <div className="mt-6 grid gap-3">
              <Link
                href={booking.callRoom.roomUrl}
                className="btn btn-primary w-full"
                target="_blank"
                rel="noopener noreferrer"
              >
                Join video room
                <ExternalLink size={18} />
              </Link>

              <Link href={backHref} className="btn btn-secondary w-full">
                Back to bookings
              </Link>

              {canMarkCompleted ? (
                <form action={markCallCompletedAction}>
                  <input type="hidden" name="bookingId" value={booking.id} />

                  <button type="submit" className="btn btn-secondary w-full">
                    <CheckCircle2 size={17} />
                    Mark call completed
                  </button>
                </form>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3">
              <SideFact label="Your role" value={currentUserRoleLabel} />

              <SideFact label="Status" value={formatStatus(booking.status)} />

              <SideFact
                label="Room status"
                value={formatRoomStatus(booking.callRoom.status)}
              />

              <SideFact
                label="Duration"
                value={`${getDurationMinutes(
                  booking.startTime,
                  booking.endTime,
                )} minutes`}
              />

              <SideFact
                label="Join window"
                value={`${JOIN_BEFORE_MINUTES} min before`}
              />

              <SideFact
                label="Room closes"
                value={`${JOIN_AFTER_END_MINUTES} min after end`}
              />
            </div>

            {bookingNote ? (
              <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
                <div className="flex gap-3">
                  <MessageCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-[var(--primary-dark)]"
                  />

                  <div>
                    <p className="text-sm font-bold text-[var(--foreground)]">
                      Buyer note
                    </p>

                    <p className="mt-1 line-clamp-5 text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                      {bookingNote}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {isBuyer ? (
              <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
                <p className="text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                  After the call, you can leave a review from your bookings page.
                </p>
              </div>
            ) : null}

            {isExpert ? (
              <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
                <p className="text-sm font-medium leading-6 text-[var(--muted-foreground)]">
                  After the session, mark the call as completed so the buyer can
                  review it and your earnings can be counted correctly.
                </p>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </main>
  );
}

function CallBlockedPage({
  title,
  text,
  backHref,
  timeLabel,
  timeValue,
  secondaryLabel,
  secondaryValue,
}: {
  title: string;
  text: string;
  backHref: string;
  timeLabel?: string;
  timeValue?: string;
  secondaryLabel?: string;
  secondaryValue?: string;
}) {
  return (
    <main className="container-page py-8 md:py-10 lg:py-12">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary-dark)]"
      >
        <ArrowLeft size={16} />
        Back to bookings
      </Link>

      <div className="mx-auto mt-10 max-w-2xl">
        <Card className="p-6 text-center md:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
            <ShieldCheck size={28} />
          </div>

          <Badge variant="primary" className="mt-6">
            <Video size={14} />
            Protected call room
          </Badge>

          <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] text-[var(--foreground)]">
            {title}
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm font-medium leading-6 text-[var(--muted-foreground)]">
            {text}
          </p>

          {timeLabel && timeValue ? (
            <div className="mx-auto mt-6 grid max-w-sm gap-3">
              <SideFact label={timeLabel} value={timeValue} />

              {secondaryLabel && secondaryValue ? (
                <SideFact label={secondaryLabel} value={secondaryValue} />
              ) : null}
            </div>
          ) : null}

          <div className="mt-7">
            <Link href={backHref} className="btn btn-primary">
              Back to bookings
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}

function InfoBox({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Video;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={18} />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-bold leading-6 text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function SafetyRule({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
      <CheckCircle2
        size={17}
        className="mt-0.5 shrink-0 text-[var(--success)]"
      />
      <p className="text-sm font-medium leading-6 text-[var(--muted-foreground)]">
        {text}
      </p>
    </div>
  );
}

function SideFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3 text-left">
      <p className="text-sm font-medium text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="text-right text-sm font-bold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function getBookingsHref(role: string) {
  if (role === "ADMIN") {
    return "/admin/bookings";
  }

  if (role === "EXPERT") {
    return "/expert/bookings";
  }

  return "/buyer/bookings";
}

function getBlockedStatusText(status: string) {
  if (status === "PENDING") {
    return "The video room opens only after payment is confirmed.";
  }

  if (status === "PAID") {
    return "Payment was received, but final confirmation is still processing.";
  }

  if (status === "COMPLETED") {
    return "This call has already been marked as completed.";
  }

  if (status === "CANCELLED") {
    return "This booking was cancelled, so the video room is closed.";
  }

  if (status === "REFUNDED") {
    return "This booking was refunded, so the video room is closed.";
  }

  if (status === "DISPUTED") {
    return "This booking is under review. The video room is temporarily closed.";
  }

  if (status === "EXPIRED") {
    return "This booking expired because payment was not completed in time.";
  }

  return "This booking is not available for joining right now.";
}

function formatStatus(status: string) {
  if (status === "PENDING") {
    return "Pending payment";
  }

  if (status === "PAID") {
    return "Confirming";
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

  if (status === "EXPIRED") {
    return "Expired";
  }

  return status.toLowerCase();
}

function formatRoomStatus(status: string) {
  if (status === "CREATED") {
    return "Created";
  }

  if (status === "LIVE") {
    return "Live";
  }

  if (status === "ENDED") {
    return "Ended";
  }

  return status.toLowerCase();
}