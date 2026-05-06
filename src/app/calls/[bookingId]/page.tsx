import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ShieldCheck,
  UserRound,
  Video,
} from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
  });

  if (!currentUser) {
    redirect("/sign-in");
  }

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

  if (booking.status !== "CONFIRMED") {
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
        text="Please try again later or contact SkillDrop support."
        backHref={backHref}
      />
    );
  }

  const now = new Date();

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
        text={`You can join ${JOIN_BEFORE_MINUTES} minutes before the scheduled start time.`}
        backHref={backHref}
        timeLabel="Call starts"
        timeValue={formatDateTime(booking.startTime)}
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
        status: "ENDED",
        endsAt: booking.endTime,
      },
    });
  }

  return (
    <CallBlockedPage
      title="This call room is closed."
      text="The video room is no longer available for this booking."
      backHref={backHref}
      timeLabel="Call ended"
      timeValue={formatDateTime(booking.endTime)}
    />
   );
 }


  if (booking.callRoom.status !== "LIVE") {
    await prisma.callRoom.updateMany({
      where: {
        bookingId: booking.id,
        status: {
          not: "LIVE",
        },
      },
      data: {
        status: "LIVE",
      },
    });
  }

  return (
    <main className="p-6 md:p-8 lg:p-10">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
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

            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
              Your booking is confirmed. Check the details below, then open the
              protected video room.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <InfoBox
                icon={Video}
                label="Service"
                value={booking.service?.title ?? "Booked call"}
              />

              <InfoBox
                icon={Clock3}
                label="Time"
                value={formatDateTime(booking.startTime)}
              />

              <InfoBox
                icon={UserRound}
                label="Client"
                value={booking.buyer.name ?? booking.buyer.email}
              />

              <InfoBox
                icon={ShieldCheck}
                label="Provider"
                value={booking.expert.user.name ?? booking.expert.user.email}
              />
            </div>

            <div className="mt-8 rounded-[26px] border border-[var(--border)] bg-white/64 p-5">
              <Badge variant="primary">
                <ShieldCheck size={14} />
                Safety reminders
              </Badge>

              <div className="mt-5 grid gap-3">
                <SafetyRule text="Do not share passwords, bank codes or private account access." />
                <SafetyRule text="Keep the conversation respectful and focused on the booked service." />
                <SafetyRule text="If something feels unsafe, leave the call and contact SkillDrop support." />
              </div>
            </div>
          </Card>

          <Card soft className="p-6 md:p-7 xl:sticky xl:top-[100px]">
            <Badge variant="accent">
              <CalendarDays size={14} />
              Ready
            </Badge>

            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
              Enter video room
            </h2>

            <p className="mt-3 text-sm font-semibold leading-6 text-muted">
              This button opens the external video room for this booking.
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
            </div>

            <div className="mt-6 grid gap-3">
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
            </div>
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
}: {
  title: string;
  text: string;
  backHref: string;
  timeLabel?: string;
  timeValue?: string;
}) {
  return (
    <main className="p-6 md:p-8 lg:p-10">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary-dark)]"
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

          <h1 className="mt-5 text-4xl font-black tracking-[-0.06em]">
            {title}
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm font-semibold leading-6 text-muted">
            {text}
          </p>

          {timeLabel && timeValue ? (
            <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-[var(--border)] bg-white/64 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="inline-flex items-center gap-2 text-sm font-bold text-muted">
                  <Clock3 size={14} />
                  {timeLabel}
                </p>

                <p className="text-right text-sm font-black">{timeValue}</p>
              </div>
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
    <div className="rounded-[24px] border border-[var(--border)] bg-white/64 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-dark)]">
        <Icon size={18} />
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black leading-6">{value}</p>
    </div>
  );
}

function SafetyRule({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-white/64 p-4">
      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--success)]" />
      <p className="text-sm font-bold leading-6 text-muted">{text}</p>
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

  return "This booking is not available for joining right now.";
}

function getDurationMinutes(startTime: Date, endTime: Date) {
  return Math.max(
    Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60),
    0,
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

function formatStatus(status: string) {
  if (status === "PENDING") {
    return "Pending payment";
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