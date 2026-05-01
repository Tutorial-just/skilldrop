"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function createSafeRoomName(bookingId: string) {
  return `skilldrop-${bookingId}`.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
}

export async function createOrOpenCallRoomAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");

  if (!bookingId) {
    throw new Error("Booking ID is required.");
  }

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      callRoom: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (booking.callRoom) {
    redirect(`/dashboard/bookings/${booking.id}/call`);
  }

  const roomName = createSafeRoomName(booking.id);
  const jitsiBaseUrl = process.env.JITSI_BASE_URL ?? "https://meet.jit.si";
  const roomUrl = `${jitsiBaseUrl}/${roomName}`;

  await prisma.callRoom.create({
    data: {
      bookingId: booking.id,
      provider: "JITSI",
      roomName,
      roomUrl,
      startsAt: booking.startTime,
      endsAt: booking.endTime,
    },
  });

  redirect(`/dashboard/bookings/${booking.id}/call`);
}