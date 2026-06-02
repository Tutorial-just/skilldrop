import {
  BookingStatus,
  CallRoomStatus,
  Prisma,
} from "@prisma/client";
import { createDailyRoom } from "@/lib/daily";
import { prisma } from "@/lib/prisma";

const JOIN_BEFORE_MINUTES = 10;
const JOIN_AFTER_END_MINUTES = 15;

export function createSafeRoomName(bookingId: string) {
  return `skilldrop-${bookingId}`
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase();
}

export async function createCallRoomData(booking: {
  id: string;
  startTime: Date;
  endTime: Date;
}) {
  const roomName = createSafeRoomName(booking.id);
  const provider = process.env.VIDEO_PROVIDER || "daily";

  if (provider === "daily") {
    const dailyRoom = await createDailyRoom({
      roomName,
      startsAt: booking.startTime,
      endsAt: booking.endTime,
    });

    return {
      provider: "DAILY",
      roomName,
      roomUrl: dailyRoom.url,
    };
  }

  const baseUrl = process.env.JITSI_BASE_URL || "https://meet.jit.si";

  return {
    provider: "JITSI",
    roomName,
    roomUrl: `${baseUrl}/${roomName}`,
  };
}
export async function createCallRoom(
  tx: Prisma.TransactionClient,
  booking: {
    id: string;
    startTime: Date;
    endTime: Date;
  },
) {
  const existingRoom = await tx.callRoom.findUnique({
    where: {
      bookingId: booking.id,
    },
  });

  if (existingRoom) {
    return existingRoom;
  }

  const room = await createCallRoomData(booking);

  return tx.callRoom.create({
    data: {
      bookingId: booking.id,
      provider: room.provider,
      roomName: room.roomName,
      roomUrl: room.roomUrl,
      status: CallRoomStatus.CREATED,
      startsAt: booking.startTime,
      endsAt: booking.endTime,
    },
  });
}

export async function openCallRoom(
  tx: Prisma.TransactionClient,
  bookingId: string,
) {
  await tx.callRoom.updateMany({
    where: {
      bookingId,
      status: {
        not: CallRoomStatus.LIVE,
      },
    },
    data: {
      status: CallRoomStatus.LIVE,
    },
  });
}

export async function closeCallRoom(
  tx: Prisma.TransactionClient,
  bookingId: string,
  endedAt = new Date(),
) {
  await tx.callRoom.updateMany({
    where: {
      bookingId,
      status: {
        not: CallRoomStatus.ENDED,
      },
    },
    data: {
      status: CallRoomStatus.ENDED,
      endsAt: endedAt,
    },
  });
}

export async function confirmBooking(
  tx: Prisma.TransactionClient,
  bookingId: string,
) {
  const booking = await tx.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      callRoom: true,
    },
  });

  if (!booking) {
    throw new Error("booking-not-found");
  }

  if (
    booking.status !== BookingStatus.PENDING &&
    booking.status !== BookingStatus.PAID
  ) {
    return booking;
  }

  const now = new Date();

  const updatedBooking = await tx.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      status: BookingStatus.CONFIRMED,
      paidAt: booking.paidAt ?? now,
      confirmedAt: booking.confirmedAt ?? now,
      expiresAt: null,
    },
  });

  if (!booking.callRoom) {
    await createCallRoom(tx, booking);
  }

  return updatedBooking;
}

export async function cancelBooking(
  tx: Prisma.TransactionClient,
  bookingId: string,
  reason: string,
) {
  const booking = await tx.booking.findUnique({
    where: {
      id: bookingId,
    },
  });

  if (!booking) {
    throw new Error("booking-not-found");
  }

  if (
    booking.status === BookingStatus.CANCELLED ||
    booking.status === BookingStatus.COMPLETED ||
    booking.status === BookingStatus.REFUNDED ||
    booking.status === BookingStatus.EXPIRED
  ) {
    return booking;
  }

  const updatedBooking = await tx.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: reason,
      expiresAt: null,
    },
  });

  await closeCallRoom(tx, booking.id);

  return updatedBooking;
}

export async function expireBooking(
  tx: Prisma.TransactionClient,
  bookingId: string,
) {
  const booking = await tx.booking.findUnique({
    where: {
      id: bookingId,
    },
  });

  if (!booking) {
    throw new Error("booking-not-found");
  }

  if (booking.status !== BookingStatus.PENDING) {
    return booking;
  }

  const updatedBooking = await tx.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      status: BookingStatus.EXPIRED,
      cancelledAt: new Date(),
      cancelReason: "PAYMENT_EXPIRED",
      expiresAt: null,
    },
  });

  await closeCallRoom(tx, booking.id);

  return updatedBooking;
}

export async function completeBooking(
  tx: Prisma.TransactionClient,
  bookingId: string,
) {
  const booking = await tx.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      expert: true,
    },
  });

  if (!booking) {
    throw new Error("booking-not-found");
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    return booking;
  }

  const now = new Date();

  const updatedBooking = await tx.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      status: BookingStatus.COMPLETED,
      completedAt: now,
    },
  });

  const updatedExpert = await tx.expertProfile.update({
    where: {
      id: booking.expertId,
    },
    data: {
      totalSessions: {
        increment: 1,
      },
    },
  });

  if (
    updatedExpert.totalSessions >= 3 &&
    updatedExpert.rating >= 3.8 &&
    !updatedExpert.isVerified
  ) {
    await tx.expertProfile.update({
      where: {
        id: updatedExpert.id,
      },
      data: {
        isVerified: true,
        verifiedAt: now,
        verificationNote:
          "Automatically verified after 3 completed sessions and 3.8+ rating.",
      },
    });
  }

  await closeCallRoom(tx, booking.id, now);

  return updatedBooking;
}

export function canJoinCall(
  startTime: Date,
  endTime: Date,
  now = new Date(),
) {
  const joinOpensAt = new Date(
    startTime.getTime() - JOIN_BEFORE_MINUTES * 60 * 1000,
  );

  const joinClosesAt = new Date(
    endTime.getTime() + JOIN_AFTER_END_MINUTES * 60 * 1000,
  );

  return {
    allowed:
      now >= joinOpensAt &&
      now <= joinClosesAt,

    joinOpensAt,
    joinClosesAt,
  };
}