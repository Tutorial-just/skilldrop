"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  assertRateLimit,
  getClientIp,
  rateLimitPresets,
} from "@/lib/rate-limit";
import { sendNotification } from "@/server/services/notification.service";
import { calculatePricingBreakdown } from "@/config/pricing";

type BookingStatusValue =
  | "PENDING"
  | "PAID"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED"
  | "DISPUTED"
  | "EXPIRED";

const PENDING_BOOKING_EXPIRES_MINUTES = 15;
const MAX_BOOKING_NOTE_LENGTH = 500;

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function cleanBookingNote(value: string) {
  return value.replace(/\s+/g, " ").trim();
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

function getDisplayName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email.split("@")[0] || "Client";
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

function revalidateBookingPaths(expertId?: string, bookingId?: string) {
  revalidatePath("/");
  revalidatePath("/experts");

  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath("/buyer/reviews");

  if (bookingId) {
    revalidatePath(`/buyer/bookings/${bookingId}/checkout`);
    revalidatePath(`/calls/${bookingId}`);
  }

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

async function safeSendNotification(
  input: Parameters<typeof sendNotification>[0],
) {
  try {
    await sendNotification(input);
  } catch (error) {
    console.error("Notification error:", error);
  }
}

async function getCurrentUserRecord(
  allowedRoles: ("buyer" | "expert" | "admin")[],
) {
  const { user } = await requireRole(allowedRoles);

  const currentUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
  });

  if (!currentUser) {
    redirect("/sign-in");
  }

  return currentUser;
}

function canCancelBookingDirectly(status: string) {
  return status === "PENDING";
}

function canCompleteBooking(status: string) {
  return status === "CONFIRMED";
}

function isClosedStatus(status: string) {
  return (
    status === "COMPLETED" ||
    status === "CANCELLED" ||
    status === "REFUNDED" ||
    status === "DISPUTED" ||
    status === "EXPIRED"
  );
}

function getAvailabilityDurationMinutes(startTime: Date, endTime: Date) {
  return Math.round((endTime.getTime() - startTime.getTime()) / 60000);
}

export async function createBookingAction(formData: FormData) {
  await releaseExpiredPendingBookings();

  const buyer = await getCurrentUserRecord(["buyer", "admin"]);

  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);

  assertRateLimit(`booking:create:${buyer.id}:${ip}`, rateLimitPresets.booking);

  const expertId = getStringValue(formData, "expertId");
  const serviceId = getStringValue(formData, "serviceId");
  const availabilityId = getStringValue(formData, "availabilityId");
  const rawNote = getStringValue(formData, "note");
  const note = cleanBookingNote(rawNote);

  if (!expertId || !serviceId || !availabilityId) {
    redirect(`/experts/${expertId || ""}?error=missing-booking-data`);
  }

  if (note.length > MAX_BOOKING_NOTE_LENGTH) {
    redirect(
      `/experts/${expertId}?service=${serviceId}&error=booking-note-too-long`,
    );
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
    redirect("/experts?error=provider-not-found");
  }

  if (expert.userId === buyer.id) {
    redirect(`/experts/${expertId}?error=cannot-book-yourself`);
  }

  if (expert.status !== "APPROVED") {
    redirect(`/experts/${expertId}?error=provider-not-available`);
  }

  const expertCanAcceptPayments =
    Boolean(expert.stripeAccountId) &&
    expert.stripeChargesEnabled &&
    expert.stripePayoutsEnabled &&
    expert.stripeDetailsSubmitted;

  if (!expertCanAcceptPayments) {
    redirect(
      `/experts/${expertId}?service=${serviceId}&error=expert-payout-not-ready`,
    );
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

  if (service.priceCents <= 0 || service.durationMinutes <= 0) {
    redirect(`/experts/${expertId}?service=${serviceId}&error=invalid-service`);
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
    redirect(
      `/experts/${expertId}?service=${serviceId}&error=slot-not-available`,
    );
  }

  const slotDurationMinutes = getAvailabilityDurationMinutes(
    availability.startTime,
    availability.endTime,
  );

  if (slotDurationMinutes < service.durationMinutes) {
    redirect(
      `/experts/${expertId}?service=${serviceId}&error=slot-too-short`,
    );
  }

  const pricing = calculatePricingBreakdown(service.priceCents);

  let booking:
    | {
        id: string;
        expertId: string;
        serviceId: string;
        startTime: Date;
        endTime: Date;
        note: string | null;
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
        throw new Error("slot-not-available");
      }

      const freshAvailability = await tx.availability.findUnique({
        where: {
          id: availabilityId,
        },
      });

      if (!freshAvailability) {
        throw new Error("slot-not-available");
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
          startTime: freshAvailability.startTime,
          endTime: freshAvailability.endTime,
          priceCents: pricing.servicePriceCents,
          currency: service.currency,
          platformFeeCents: pricing.platformFeeCents,
          providerNetCents: pricing.providerNetCents,
          clientServiceFeeCents: pricing.clientServiceFeeCents,
          clientTotalCents: pricing.clientTotalCents,
          status: "PENDING",
          expiresAt,
          note: note || null,
        },
      });

      return {
        id: createdBooking.id,
        expertId: createdBooking.expertId,
        serviceId: createdBooking.serviceId,
        startTime: createdBooking.startTime,
        endTime: createdBooking.endTime,
        note: createdBooking.note,
      };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "slot-not-available") {
      redirect(
        `/experts/${expertId}?service=${serviceId}&error=slot-not-available`,
      );
    }

    console.error("Create booking error:", error);

    redirect(`/experts/${expertId}?service=${serviceId}&error=booking-failed`);
  }

  if (!booking) {
    redirect(
      `/experts/${expertId}?service=${serviceId}&error=slot-not-available`,
    );
  }

  await safeSendNotification({
    to: buyer.email,
    type: "BOOKING_CREATED",
    subject: "Your booking is waiting for payment",
    message: `Your time slot is reserved for ${PENDING_BOOKING_EXPIRES_MINUTES} minutes. Complete payment to confirm your call.`,
    metadata: {
      bookingId: booking.id,
      expertId,
      serviceId,
      expiresInMinutes: PENDING_BOOKING_EXPIRES_MINUTES,
      servicePriceCents: pricing.servicePriceCents,
      clientServiceFeeCents: pricing.clientServiceFeeCents,
      clientTotalCents: pricing.clientTotalCents,
      note: booking.note,
    },
  });

  const buyerName = getDisplayName(buyer);

  await safeSendNotification({
    to: expert.user.email,
    type: "BOOKING_CREATED",
    subject: "A client reserved your time slot",
    message: `${buyerName} reserved "${service.title}" for ${formatDateTime(
      booking.startTime,
    )}. The booking will be confirmed after payment.${
      booking.note ? ` Note: ${booking.note}` : ""
    }`,
    metadata: {
      bookingId: booking.id,
      expertId,
      serviceId,
      buyerId: buyer.id,
      buyerName,
      serviceTitle: service.title,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      expiresInMinutes: PENDING_BOOKING_EXPIRES_MINUTES,
      servicePriceCents: pricing.servicePriceCents,
      platformFeeCents: pricing.platformFeeCents,
      providerNetCents: pricing.providerNetCents,
      note: booking.note,
    },
  });

  revalidateBookingPaths(expertId, booking.id);

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

  if (!canCancelBookingDirectly(booking.status)) {
    redirect(
      `${getBookingsRedirectHref(currentUser.role)}?error=confirmed-booking-needs-refund`,
    );
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.updateMany({
      where: {
        id: booking.id,
        status: "PENDING",
      },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelReason: isAdmin
          ? "CANCELLED_BY_ADMIN"
          : isExpert
            ? "CANCELLED_BY_EXPERT"
            : "CANCELLED_BY_BUYER",
        expiresAt: null,
      },
    });

    if (updatedBooking.count === 0) {
      return;
    }

    if (booking.availabilityId) {
      await tx.availability.updateMany({
        where: {
          id: booking.availabilityId,
        },
        data: {
          isBooked: false,
        },
      });
    }

    if (booking.callRoom) {
      await tx.callRoom.updateMany({
        where: {
          bookingId: booking.id,
        },
        data: {
          status: "ENDED",
          endsAt: now,
        },
      });
    }
  });

  const cancelledBy = isAdmin
    ? "SkillDrop admin"
    : isExpert
      ? "the provider"
      : "the client";

  await safeSendNotification({
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

  await safeSendNotification({
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

  revalidateBookingPaths(booking.expertId, booking.id);

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

  const allowedStatuses: BookingStatusValue[] = isAdmin
    ? [
        "PENDING",
        "PAID",
        "CONFIRMED",
        "COMPLETED",
        "CANCELLED",
        "DISPUTED",
        "EXPIRED",
      ]
    : ["COMPLETED"];

  if (!allowedStatuses.includes(status)) {
    redirect(`${getBookingsRedirectHref(currentUser.role)}?error=invalid-status`);
  }

  if (status === "REFUNDED") {
    redirect(
      `${getBookingsRedirectHref(currentUser.role)}?error=refund-must-use-stripe`,
    );
  }

  if (isClosedStatus(booking.status)) {
    redirect(`${getBookingsRedirectHref(currentUser.role)}?error=booking-closed`);
  }

  const now = new Date();

  if (status === "COMPLETED") {
    if (!canCompleteBooking(booking.status)) {
      redirect(
        `${getBookingsRedirectHref(currentUser.role)}?error=cannot-complete`,
      );
    }

    if (booking.endTime > now && !isAdmin) {
      redirect(`${getBookingsRedirectHref(currentUser.role)}?error=call-not-ended`);
    }
  }

  if (status === "CANCELLED" && !canCancelBookingDirectly(booking.status)) {
    redirect(
      `${getBookingsRedirectHref(currentUser.role)}?error=confirmed-booking-needs-refund`,
    );
  }

  await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.updateMany({
      where: {
        id: booking.id,
        status: booking.status,
      },
      data: {
        status,
        ...(status === "COMPLETED"
          ? {
              completedAt: now,
            }
          : {}),
        ...(status === "CANCELLED"
          ? {
              cancelledAt: now,
              cancelReason: isAdmin
                ? "CANCELLED_BY_ADMIN"
                : "CANCELLED_BY_EXPERT",
              expiresAt: null,
            }
          : {}),
        ...(status === "DISPUTED"
          ? {
              disputedAt: now,
              disputeReason: "MANUAL_REVIEW",
              disputeNote: "Marked as disputed from booking admin action.",
              expiresAt: null,
            }
          : {}),
        ...(status === "EXPIRED"
          ? {
              cancelledAt: now,
              cancelReason: "PAYMENT_EXPIRED",
              expiresAt: null,
            }
          : {}),
      },
    });

    if (updatedBooking.count === 0) {
      throw new Error("booking-status-changed");
    }

    if (
      (status === "CANCELLED" || status === "EXPIRED") &&
      booking.availabilityId
    ) {
      await tx.availability.updateMany({
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
            verifiedAt: now,
            verificationNote:
              "Automatically verified after 3 completed sessions and 3.8+ rating.",
          },
        });
      }
    }

    if (
      booking.callRoom &&
      (status === "COMPLETED" ||
        status === "CANCELLED" ||
        status === "DISPUTED" ||
        status === "EXPIRED")
    ) {
      await tx.callRoom.updateMany({
        where: {
          bookingId: booking.id,
        },
        data: {
          status: "ENDED",
          endsAt: now,
        },
      });
    }
  });

  if (status === "COMPLETED") {
    await safeSendNotification({
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

    await safeSendNotification({
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

  if (status === "CANCELLED" || status === "EXPIRED") {
    const isExpired = status === "EXPIRED";

    await safeSendNotification({
      to: booking.buyer.email,
      type: isExpired ? "BOOKING_EXPIRED" : "BOOKING_CANCELLED",
      subject: isExpired ? "Booking expired" : "Booking cancelled",
      message: isExpired
        ? `Your booking "${
            booking.service?.title ?? "Booked call"
          }" expired because payment was not completed in time.`
        : `Your booking "${booking.service?.title ?? "Booked call"}" was cancelled.`,
      metadata: {
        bookingId: booking.id,
        expertId: booking.expertId,
        previousStatus: booking.status,
        newStatus: status,
      },
    });

    await safeSendNotification({
      to: booking.expert.user.email,
      type: isExpired ? "BOOKING_EXPIRED" : "BOOKING_CANCELLED",
      subject: isExpired ? "Booking expired" : "Booking cancelled",
      message: isExpired
        ? `The booking "${
            booking.service?.title ?? "Booked call"
          }" expired because payment was not completed in time.`
        : `The booking "${booking.service?.title ?? "Booked call"}" was cancelled.`,
      metadata: {
        bookingId: booking.id,
        expertId: booking.expertId,
        previousStatus: booking.status,
        newStatus: status,
      },
    });
  }

  if (status === "DISPUTED") {
    await safeSendNotification({
      to: booking.buyer.email,
      type: "BOOKING_DISPUTED",
      subject: "Booking under review",
      message: `Your booking "${
        booking.service?.title ?? "Booked call"
      }" is under review by SkillDrop support.`,
      metadata: {
        bookingId: booking.id,
        expertId: booking.expertId,
        previousStatus: booking.status,
      },
    });

    await safeSendNotification({
      to: booking.expert.user.email,
      type: "BOOKING_DISPUTED",
      subject: "Booking under review",
      message: `The booking "${
        booking.service?.title ?? "Booked call"
      }" is under review by SkillDrop support.`,
      metadata: {
        bookingId: booking.id,
        expertId: booking.expertId,
        previousStatus: booking.status,
      },
    });
  }

  revalidateBookingPaths(booking.expertId, booking.id);

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

  const expiredBookingIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const booking of expiredBookings) {
      const updatedBooking = await tx.booking.updateMany({
        where: {
          id: booking.id,
          status: "PENDING",
        },
        data: {
          status: "EXPIRED",
          cancelledAt: now,
          cancelReason: "PAYMENT_EXPIRED",
          expiresAt: null,
        },
      });

      if (updatedBooking.count === 0) {
        continue;
      }

      expiredBookingIds.push(booking.id);

      if (booking.availabilityId) {
        await tx.availability.updateMany({
          where: {
            id: booking.availabilityId,
          },
          data: {
            isBooked: false,
          },
        });
      }

      if (booking.callRoom) {
        await tx.callRoom.updateMany({
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

  const actuallyExpiredBookings = expiredBookings.filter((booking) =>
    expiredBookingIds.includes(booking.id),
  );

  await Promise.all(
    actuallyExpiredBookings.map((booking) =>
      safeSendNotification({
        to: booking.buyer.email,
        type: "BOOKING_EXPIRED",
        subject: "Booking expired",
        message: `Your booking "${
          booking.service?.title ?? "Booked call"
        }" expired because payment was not completed in time.`,
        metadata: {
          bookingId: booking.id,
          expertId: booking.expertId,
          previousStatus: "PENDING",
          newStatus: "EXPIRED",
          reason: "payment-expired",
        },
      }),
    ),
  );

  const expertIds = Array.from(
    new Set(actuallyExpiredBookings.map((booking) => booking.expertId)),
  );

  revalidateBookingPaths();

  for (const expertId of expertIds) {
    revalidatePath(`/experts/${expertId}`);
  }
}

/**
 * Compatibility wrappers.
 * These prevent old imports from breaking while the app is being migrated
 * to updateBookingStatusAction.
 */
export async function completeBookingAction(formData: FormData) {
  formData.set("status", "COMPLETED");
  await updateBookingStatusAction(formData);
}

export async function confirmBookingAction(formData: FormData) {
  formData.set("status", "CONFIRMED");
  await updateBookingStatusAction(formData);
}