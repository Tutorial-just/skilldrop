import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type CallPageProps = {
  params: Promise<{
    bookingId: string;
  }>;
};

export default async function BookingCallPage({ params }: CallPageProps) {
  const { bookingId } = await params;

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

  if (!booking || !booking.callRoom) {
    notFound();
  }

  return (
    <main className="container-page py-10">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Link
            href={`/dashboard/bookings/${booking.id}`}
            className="inline-flex rounded-full border border-[#e8e1d8] bg-white px-4 py-2 text-sm font-bold text-[#6f6a63] transition hover:text-[#151515]"
          >
            ← Back to booking
          </Link>

          <p className="mt-6 text-sm font-black text-[#2563eb]">
            SkillDrop video room
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
            {booking.service.title}
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-[#6f6a63]">
            Session with {booking.expert.user.name}. Allow camera and microphone
            permissions when the room opens.
          </p>
        </div>

        <a
          href={booking.callRoom.roomUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-[#151515] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#2563eb]"
        >
          Open in new tab
        </a>
      </div>

      <section className="card overflow-hidden rounded-[2.4rem] p-3">
        <div className="flex flex-col justify-between gap-3 border-b border-[#e8e1d8] px-4 py-3 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black">Video session</p>
            <p className="text-xs text-[#6f6a63]">
              Camera · Microphone · Screen sharing
            </p>
          </div>

          <span className="w-fit rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-black text-[#2563eb]">
            Video room
          </span>
        </div>

        <iframe
          src={booking.callRoom.roomUrl}
          allow="camera; microphone; fullscreen; speaker; display-capture"
          className="h-[72vh] w-full rounded-[1.8rem] border-0"
        />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <InfoCard title="Expert" value={booking.expert.user.name ?? "Expert"} />
        <InfoCard title="Buyer" value={booking.buyer.email} />
        <InfoCard title="Status" value={booking.status} />
      </section>
    </main>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="card rounded-[1.75rem] p-5">
      <p className="text-sm font-bold text-[#6f6a63]">{title}</p>
      <p className="mt-2 font-black">{value}</p>
    </div>
  );
}