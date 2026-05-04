"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/server/services/notification.service";

type BookingStatusValue =
  | "PENDING"
  | "PAID"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED"
  | "DISPUTED";

const PENDING_BOOKING_EXPIRES_MINUTES = 15;

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function createCallRoomData(bookingId: string) {
  const provider = process.env.VIDEO_PROVIDER || "JITSI";
  const baseUrl = process.env.JITSI_BASE_URL || "https://meet.jit.si";
  const roomName = `skilldrop-${bookingId}-${randomUUID()}`;
  const roomUrl = `${baseUrl}/${roomName}`;

  return {
    provider,
    roomName,
    roomUrl,
  };
}

async function getCurrentUserRecord(allowedRoles: ("buyer" | "expert" | "admin")[]) {
  const { user } = await requireRole(allowedRoles);

  const email = user.email?.toLowerCase();

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

  return currentUser;
}

function getBookingsRedirectHref(role: string) {
  if (role === "ADMIN") {
    return "/admin/bookings";
  }

  if (role === "EXPERT") {
    return "/expert/bookings";
  }

  return "/buyer/bookings";
}

function revalidateBookingPaths(expertId?: string) {
  revalidatePath("/");
  revalidatePath("/experts");
  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath("/buyer/reviews");
  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/availability");
  revalidatePath("/expert/earnings");
  revalidatePath("/expert/stats");
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/users");
  revalidatePath("/notifications");

  if (expertId) {
    revalidatePath(`/experts/${expertId}`);
  }
}

function canCancelBooking(status: string) {
  return status === "PENDING" || status === "CONFIRMED";
}

function canCompleteBooking(status: string) {
  return status === "CONFIRMED";
}

export async function createBookingAction(formData: FormData) {
  await releaseExpiredPendingBookings();

  const buyer = await getCurrentUserRecord(["buyer", "admin"]);

  const expertId = getStringValue(formData, "expertId");
  const serviceId = getStringValue(formData, "serviceId");
  const availabilityId = getStringValue(formData, "availabilityId");

  if (!expertId || !serviceId || !availabilityId) {
    redirect(`/experts/${expertId || ""}?error=missing-booking-data`);
  }

  const expert = await prisma.expertProfile.findUnique({
    where: {
      id: expertId,
    },
    include: {
      user: true,
    },
  });

  if (!expert) {
    redirect("/experts?error=expert-not-found");
  }

  if (expert.userId === buyer.id) {
    redirect(`/experts/${expertId}?error=cannot-book-yourself`);
  }

  if (expert.status !== "APPROVED") {
    redirect(`/experts/${expertId}?error=expert-not-available`);
  }

  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      expertId,
      isActive: true,
    },
  });

  if (!service) {
    redirect(`/experts/${expertId}?error=service-not-found`);
  }

  const availability = await prisma.availability.findFirst({
    where: {
      id: availabilityId,
      expertId,
      isBooked: false,
      startTime: {
        gte: new Date(),
      },
    },
  });

  if (!availability) {
    redirect(`/experts/${expertId}?service=${serviceId}&error=slot-not-available`);
  }

  let booking:
    | {
        id: string;
        expertId: string;
        serviceId: string;
        startTime: Date;
        endTime: Date;
      }
    | null = null;

  try {
    booking = await prisma.$transaction(async (tx) => {
      const updatedSlot = await tx.availability.updateMany({
        where: {
          id: availabilityId,
          expertId,
          isBooked: false,
          startTime: {
            gte: new Date(),
          },
        },
        data: {
          isBooked: true,
        },
      });

      if (updatedSlot.count === 0) {
        throw new Error("Slot is no longer available.");
      }

      const expiresAt = new Date(
        Date.now() + PENDING_BOOKING_EXPIRES_MINUTES * 60 * 1000,
      );

      const createdBooking = await tx.booking.create({
        data: {
          buyerId: buyer.id,
          expertId,
          serviceId,
          availabilityId,
          startTime: availability.startTime,
          endTime: availability.endTime,
          priceCents: service.priceCents,
          currency: service.currency,
          status: "PENDING",
          expiresAt,
        },
      });

      const room = createCallRoomData(createdBooking.id);

      await tx.callRoom.create({
        data: {
          bookingId: createdBooking.id,
          provider: room.provider,
          roomName: room.roomName,
          roomUrl: room.roomUrl,
          startsAt: createdBooking.startTime,
          endsAt: createdBooking.endTime,
        },
      });

      return {
        id: createdBooking.id,
        expertId: createdBooking.expertId,
        serviceId: createdBooking.serviceId,
        startTime: createdBooking.startTime,
        endTime: createdBooking.endTime,
      };
    });
  } catch {
    redirect(`/experts/${expertId}?service=${serviceId}&error=slot-not-available`);
  }

  if (!booking) {
    redirect(`/experts/${expertId}?service=${serviceId}&error=slot-not-available`);
  }

  await sendNotification({
    to: buyer.email,
    type: "BOOKING_CREATED",
    subject: "Your booking is waiting for payment",
    message: `Your time slot is reserved for ${PENDING_BOOKING_EXPIRES_MINUTES} minutes. Complete payment to confirm your call.`,
    metadata: {
      bookingId: booking.id,
      expertId,
      serviceId,
    },
  });

  revalidateBookingPaths(expertId);

  redirect(`/buyer/bookings/${booking.id}/checkout`);
}

export async function cancelBookingAction(formData: FormData) {
  const currentUser = await getCurrentUserRecord(["buyer", "expert", "admin"]);

  const bookingId = getStringValue(formData, "bookingId");

  if (!bookingId) {
    redirect(getBookingsRedirectHref(currentUser.role));
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
      callRoom: true,
      service: true,
    },
  });

  if (!booking) {
    redirect(getBookingsRedirectHref(currentUser.role));
  }

  const isBuyer = booking.buyerId === currentUser.id;
  const isExpert = booking.expert.userId === currentUser.id;
  const isAdmin = currentUser.role === "ADMIN";

  if (!isBuyer && !isExpert && !isAdmin) {
    redirect("/");
  }

  if (!canCancelBooking(booking.status)) {
    redirect(`${getBookingsRedirectHref(currentUser.role)}?error=cannot-cancel`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status: "CANCELLED",
      },
    });

    if (booking.availabilityId) {
      await tx.availability.update({
        where: {
          id: booking.availabilityId,
        },
        data: {
          isBooked: false,
        },
      });
    }

    if (booking.callRoom) {
      await tx.callRoom.update({
        where: {
          bookingId: booking.id,
        },
        data: {
          status: "ENDED",
          endsAt: new Date(),
        },
      });
    }
  });

  const cancelledBy = isAdmin
    ? "SkillDrop admin"
    : isExpert
      ? "the expert"
      : "the client";

  await sendNotification({
    to: booking.buyer.email,
    type: "BOOKING_CANCELLED",
    subject: "Booking cancelled",
    message: `Your booking "${
      booking.service?.title ?? "Booked call"
    }" was cancelled by ${cancelledBy}.`,
    metadata: {
      bookingId: booking.id,
      expertId: booking.expertId,
      cancelledBy,
      previousStatus: booking.status,
    },
  });

  await sendNotification({
    to: booking.expert.user.email,
    type: "BOOKING_CANCELLED",
    subject: "Booking cancelled",
    message: `The booking "${
      booking.service?.title ?? "Booked call"
    }" was cancelled by ${cancelledBy}.`,
    metadata: {
      bookingId: booking.id,
      expertId: booking.expertId,
      cancelledBy,
      previousStatus: booking.status,
    },
  });

  revalidateBookingPaths(booking.expertId);

  redirect(getBookingsRedirectHref(currentUser.role));
}

export async function updateBookingStatusAction(formData: FormData) {
  const currentUser = await getCurrentUserRecord(["expert", "admin"]);

  const bookingId = getStringValue(formData, "bookingId");
  const status = getStringValue(formData, "status") as BookingStatusValue;

  if (!bookingId || !status) {
    redirect(getBookingsRedirectHref(currentUser.role));
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
      callRoom: true,
      service: true,
      review: true,
    },
  });

  if (!booking) {
    redirect(getBookingsRedirectHref(currentUser.role));
  }

  const isOwnerExpert = booking.expert.userId === currentUser.id;
  const isAdmin = currentUser.role === "ADMIN";

  if (!isOwnerExpert && !isAdmin) {
    redirect(getBookingsRedirectHref(currentUser.role));
  }

  const allowedStatuses: BookingStatusValue[] = [
    "PENDING",
    "PAID",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
    "REFUNDED",
    "DISPUTED",
  ];

  if (!allowedStatuses.includes(status)) {
    redirect(`${getBookingsRedirectHref(currentUser.role)}?error=invalid-status`);
  }

  if (!isAdmin && status !== "COMPLETED" && status !== "CANCELLED") {
    redirect(`${getBookingsRedirectHref(currentUser.role)}?error=not-allowed`);
  }

  if (status === "COMPLETED") {
    const now = new Date();

    if (!canCompleteBooking(booking.status)) {
      redirect(`${getBookingsRedirectHref(currentUser.role)}?error=cannot-complete`);
    }

    if (booking.endTime > now && !isAdmin) {
      redirect(`${getBookingsRedirectHref(currentUser.role)}?error=call-not-ended`);
    }
  }

  if (status === "CANCELLED" && !canCancelBooking(booking.status)) {
    redirect(`${getBookingsRedirectHref(currentUser.role)}?error=cannot-cancel`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status,
      },
    });

    if (
      (status === "CANCELLED" || status === "REFUNDED") &&
      booking.availabilityId
    ) {
      await tx.availability.update({
        where: {
          id: booking.availabilityId,
        },
        data: {
          isBooked: false,
        },
      });
    }

    if (status === "COMPLETED" && booking.status !== "COMPLETED") {
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
            verifiedAt: new Date(),
          },
        });
      }
    }

    if (
      booking.callRoom &&
      (status === "COMPLETED" ||
        status === "CANCELLED" ||
        status === "REFUNDED")
    ) {
      await tx.callRoom.update({
        where: {
          bookingId: booking.id,
        },
        data: {
          status: "ENDED",
          endsAt: new Date(),
        },
      });
    }
  });

  if (status === "COMPLETED") {
    await sendNotification({
      to: booking.expert.user.email,
      type: "CALL_COMPLETED",
      subject: "Call marked as completed",
      message: `The call "${
        booking.service?.title ?? "Booked call"
      }" was marked as completed. The buyer can now leave a review.`,
      metadata: {
        bookingId: booking.id,
        expertId: booking.expertId,
        serviceId: booking.serviceId,
      },
    });

    await sendNotification({
      to: booking.buyer.email,
      type: "REVIEW_REQUESTED",
      subject: "How was your SkillDrop call?",
      message: `Your call "${
        booking.service?.title ?? "Booked call"
      }" is complete. Please leave a review to help other clients choose with confidence.`,
      metadata: {
        bookingId: booking.id,
        expertId: booking.expertId,
        serviceId: booking.serviceId,
      },
    });
  }

  if (status === "CANCELLED") {
    await sendNotification({
      to: booking.buyer.email,
      type: "BOOKING_CANCELLED",
      subject: "Booking cancelled",
      message: `Your booking "${
        booking.service?.title ?? "Booked call"
      }" was cancelled.`,
      metadata: {
        bookingId: booking.id,
        expertId: booking.expertId,
        previousStatus: booking.status,
      },
    });

    await sendNotification({
      to: booking.expert.user.email,
      type: "BOOKING_CANCELLED",
      subject: "Booking cancelled",
      message: `The booking "${
        booking.service?.title ?? "Booked call"
      }" was cancelled.`,
      metadata: {
        bookingId: booking.id,
        expertId: booking.expertId,
        previousStatus: booking.status,
      },
    });
  }

  revalidateBookingPaths(booking.expertId);

  redirect(getBookingsRedirectHref(currentUser.role));
}

export async function releaseExpiredPendingBookings() {
  const now = new Date();

  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: "PENDING",
      expiresAt: {
        lt: now,
      },
      availabilityId: {
        not: null,
      },
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
    take: 100,
  });

  if (expiredBookings.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const booking of expiredBookings) {
      await tx.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          status: "CANCELLED",
        },
      });

      if (booking.availabilityId) {
        await tx.availability.update({
          where: {
            id: booking.availabilityId,
          },
          data: {
            isBooked: false,
          },
        });
      }

      if (booking.callRoom) {
        await tx.callRoom.update({
          where: {
            bookingId: booking.id,
          },
          data: {
            status: "ENDED",
            endsAt: now,
          },
        });
      }
    }
  });

  await Promise.all(
    expiredBookings.map((booking) =>
      sendNotification({
        to: booking.buyer.email,
        type: "BOOKING_CANCELLED",
        subject: "Booking expired",
        message: `Your booking "${
          booking.service?.title ?? "Booked call"
        }" expired because payment was not completed in time.`,
        metadata: {
          bookingId: booking.id,
          expertId: booking.expertId,
          previousStatus: "PENDING",
          newStatus: "CANCELLED",
          reason: "payment-expired",
        },
      }),
    ),
  );

  const expertIds = Array.from(
    new Set(expiredBookings.map((booking) => booking.expertId)),
  );

  revalidateBookingPaths();

  for (const expertId of expertIds) {
    revalidatePath(`/experts/${expertId}`);
  }
}