"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BookingStatus, HelpRequestStatus, Prisma } from "@prisma/client";

import {
  cancelBooking,
  closeCallRoom,
  completeBooking,
  expireBooking,
} from "@/server/services/booking.service";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { trackProductEvent } from "@/lib/product-analytics";
import {
  assertRateLimit,
  getClientIp,
  rateLimitPresets,
} from "@/lib/rate-limit";
import { sendNotification } from "@/server/services/notification.service";
import { sendBookingCreatedEmails } from "@/lib/booking-emails";
import { calculatePricingBreakdown } from "@/config/pricing";
import {
  formatDateTime,
  getDurationMinutes,
  getUserTimezone,
} from "@/lib/date-time";

type BookingStatusValue = BookingStatus;

const PENDING_BOOKING_EXPIRES_MINUTES = 15;
const MAX_BOOKING_NOTE_LENGTH = 500;
const BOOKING_STEP_MINUTES = 15;
const MAX_BOOKING_DAYS_AHEAD = 90;

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.PAID,
  BookingStatus.CONFIRMED,
  BookingStatus.DISPUTED,
];

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function cleanBookingNote(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseBookingStartTime(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function isAlignedToBookingStep(date: Date) {
  return (
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0 &&
    date.getMinutes() % BOOKING_STEP_MINUTES === 0
  );
}

function rangesOverlap({
  startA,
  endA,
  startB,
  endB,
}: {
  startA: Date;
  endA: Date;
  startB: Date;
  endB: Date;
}) {
  return startA < endB && endA > startB;
}

function getDisplayName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email.split("@")[0] || "Buyer";
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
    include: {
      buyerSettings: true,
    },
  });

  if (!currentUser) {
    redirect("/sign-in");
  }

  return currentUser;
}

function canCancelBookingDirectly(status: string) {
  return status === BookingStatus.PENDING;
}

function canCompleteBooking(status: string) {
  return status === BookingStatus.CONFIRMED;
}

function isClosedStatus(status: string) {
  return (
    status === BookingStatus.COMPLETED ||
    status === BookingStatus.CANCELLED ||
    status === BookingStatus.REFUNDED ||
    status === BookingStatus.DISPUTED ||
    status === BookingStatus.EXPIRED
  );
}

function isValidBookingStatus(value: string): value is BookingStatusValue {
  return Object.values(BookingStatus).includes(value as BookingStatus);
}

export async function createBookingAction(formData: FormData) {
  await releaseExpiredPendingBookings();

  const buyer = await getCurrentUserRecord(["buyer", "admin"]);

  const userTimezone = getUserTimezone(
    buyer.buyerSettings?.preferredTimezone,
  );

  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);

  assertRateLimit(`booking:create:${buyer.id}:${ip}`, rateLimitPresets.booking);

  const expertId = getStringValue(formData, "expertId");
  const serviceId = getStringValue(formData, "serviceId");
  const timeSlot = getStringValue(formData, "timeSlot");
  const [availabilityId = "", startTimeValue = ""] = timeSlot.split("|");
  const rawNote = getStringValue(formData, "note");
  const note = cleanBookingNote(rawNote);
  const helpRequestId = getStringValue(formData, "helpRequestId");

  if (!expertId || !serviceId || !availabilityId || !startTimeValue) {
    redirect(`/experts/${expertId || ""}?error=missing-booking-data`);
  }

  if (note.length > MAX_BOOKING_NOTE_LENGTH) {
    redirect(
      `/experts/${expertId}?service=${serviceId}&error=booking-note-too-long`,
    );
  }

  const requestedStartTime = parseBookingStartTime(startTimeValue);

  if (!requestedStartTime || !isAlignedToBookingStep(requestedStartTime)) {
    redirect(`/experts/${expertId}?service=${serviceId}&error=invalid-time`);
  }

  const now = new Date();

  if (requestedStartTime <= now) {
    redirect(`/experts/${expertId}?service=${serviceId}&error=slot-not-available`);
  }

  const maxBookingDate = new Date(
    now.getTime() + MAX_BOOKING_DAYS_AHEAD * 24 * 60 * 60 * 1000,
  );

  if (requestedStartTime > maxBookingDate) {
    redirect(`/experts/${expertId}?service=${serviceId}&error=slot-not-available`);
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

  const requestedEndTime = addMinutes(
    requestedStartTime,
    service.durationMinutes,
  );

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
    booking = await prisma.$transaction(
      async (tx) => {
        const availability = await tx.availability.findFirst({
          where: {
            id: availabilityId,
            expertId,
            isActive: true,
            startTime: {
              lte: requestedStartTime,
            },
            endTime: {
              gte: requestedEndTime,
            },
          },
          include: {
            bookings: {
              where: {
                status: {
                  in: ACTIVE_BOOKING_STATUSES,
                },
              },
              select: {
                id: true,
                startTime: true,
                endTime: true,
                status: true,
              },
              orderBy: {
                startTime: "asc",
              },
            },
          },
        });

        if (!availability) {
          throw new Error("slot-not-available");
        }

        if (requestedStartTime < new Date()) {
          throw new Error("slot-not-available");
        }

        const availableWindowDuration = getDurationMinutes(
          availability.startTime,
          availability.endTime,
        );

        if (availableWindowDuration < service.durationMinutes) {
          throw new Error("slot-too-short");
        }

        const hasOverlap = availability.bookings.some((existingBooking) =>
          rangesOverlap({
            startA: requestedStartTime,
            endA: requestedEndTime,
            startB: existingBooking.startTime,
            endB: existingBooking.endTime,
          }),
        );

        if (hasOverlap) {
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
            startTime: requestedStartTime,
            endTime: requestedEndTime,
            priceCents: pricing.servicePriceCents,
            currency: service.currency || "EUR",
            platformFeeCents: pricing.platformFeeCents,
            providerNetCents: pricing.providerNetCents,
            clientServiceFeeCents: pricing.clientServiceFeeCents,
            clientTotalCents: pricing.clientTotalCents,
            status: BookingStatus.PENDING,
            expiresAt,
            note: note || null,
          },
        });

        if (helpRequestId) {
          await tx.helpRequest.updateMany({
            where: {
              id: helpRequestId,
              buyerId: buyer.id,
              status: {
                in: [HelpRequestStatus.OPEN, HelpRequestStatus.MATCHED],
              },
            },
            data: {
              status: HelpRequestStatus.BOOKED,
              selectedExpertId: expertId,
              selectedServiceId: serviceId,
              bookingId: createdBooking.id,
            },
          });
        }

        return {
          id: createdBooking.id,
          expertId: createdBooking.expertId,
          serviceId: createdBooking.serviceId,
          startTime: createdBooking.startTime,
          endTime: createdBooking.endTime,
          note: createdBooking.note,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      redirect(
        `/experts/${expertId}?service=${serviceId}&error=slot-not-available`,
      );
    }

    if (error instanceof Error) {
      if (error.message === "slot-not-available") {
        redirect(
          `/experts/${expertId}?service=${serviceId}&error=slot-not-available`,
        );
      }

      if (error.message === "slot-too-short") {
        redirect(`/experts/${expertId}?service=${serviceId}&error=slot-too-short`);
      }
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
    message: `Your time is reserved for ${PENDING_BOOKING_EXPIRES_MINUTES} minutes. Complete payment to confirm your call.`,
    metadata: {
      bookingId: booking.id,
      expertId,
      serviceId,
      expiresInMinutes: PENDING_BOOKING_EXPIRES_MINUTES,
      servicePriceCents: pricing.servicePriceCents,
      clientServiceFeeCents: pricing.clientServiceFeeCents,
      clientTotalCents: pricing.clientTotalCents,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      note: booking.note,
      helpRequestId: helpRequestId || null,
    },
  });

  const buyerName = getDisplayName(buyer);

  await safeSendNotification({
    to: expert.user.email,
    type: "BOOKING_CREATED",
    subject: "A buyer reserved your time",
    message: `${buyerName} reserved "${service.title}" for ${formatDateTime(
      booking.startTime,
      userTimezone,
    )}. The booking will be confirmed after payment.${
      booking.note ? ` Buyer note: ${booking.note}` : ""
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
      helpRequestId: helpRequestId || null,
    },
  });

  await trackProductEvent({
    event: "BOOKING_STARTED",
    userId: buyer.id,
    email: buyer.email,
    entityType: "Booking",
    entityId: booking.id,
    metadata: {
      expertId,
      serviceId,
      helpRequestId: helpRequestId || null,
      clientTotalCents: pricing.clientTotalCents,
      startTime: booking.startTime.toISOString(),
    },
  });

  await sendBookingCreatedEmails({
    buyerEmail: buyer.email,
    buyerName: buyer.name,
    expertEmail: expert.user.email,
    expertName: expert.user.name,
    serviceTitle: service.title,
    bookingId: booking.id,
    startTime: booking.startTime,
    endTime: booking.endTime,
    priceText: `€${(pricing.clientTotalCents / 100).toFixed(2)}`,
  });

  revalidatePath("/buyer");
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

  

  await prisma.$transaction(async (tx) => {
    await cancelBooking(
      tx,
      booking.id,
      isAdmin
        ? "CANCELLED_BY_ADMIN"
        : isExpert
          ? "CANCELLED_BY_EXPERT"
          : "CANCELLED_BY_BUYER",
    );

    await tx.helpRequest.updateMany({
      where: {
        bookingId: booking.id,
        status: HelpRequestStatus.BOOKED,
      },
      data: {
        status: HelpRequestStatus.OPEN,
        bookingId: null,
      },
    });
  });

  const cancelledBy = isAdmin
    ? "SkillDrop admin"
    : isExpert
      ? "the helper"
      : "the buyer";

  await trackProductEvent({
    event: "BOOKING_CANCELLED",
    userId: currentUser.id,
    email: currentUser.email,
    entityType: "Booking",
    entityId: booking.id,
    metadata: { cancelledBy },
  });

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
  const rawStatus = getStringValue(formData, "status");

  if (!bookingId || !rawStatus) {
    redirect(getBookingsRedirectHref(currentUser.role));
  }

  if (!isValidBookingStatus(rawStatus)) {
    redirect(`${getBookingsRedirectHref(currentUser.role)}?error=invalid-status`);
  }

  const status = rawStatus;

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

  const allowedStatuses: BookingStatus[] = isAdmin
    ? [
        BookingStatus.PENDING,
        BookingStatus.PAID,
        BookingStatus.CONFIRMED,
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
        BookingStatus.DISPUTED,
        BookingStatus.EXPIRED,
      ]
    : [BookingStatus.COMPLETED];

  if (!allowedStatuses.includes(status)) {
    redirect(`${getBookingsRedirectHref(currentUser.role)}?error=invalid-status`);
  }

  if (!canTransitionBookingStatus(booking.status, status, isAdmin)) {
    redirect(`${getBookingsRedirectHref(currentUser.role)}?error=invalid-transition`);
  }

  if (status === BookingStatus.REFUNDED) {
    redirect(
      `${getBookingsRedirectHref(currentUser.role)}?error=refund-must-use-stripe`,
    );
  }

  if (isClosedStatus(booking.status)) {
    redirect(`${getBookingsRedirectHref(currentUser.role)}?error=booking-closed`);
  }

  const now = new Date();

  if (status === BookingStatus.COMPLETED) {
    if (!canCompleteBooking(booking.status)) {
      redirect(
        `${getBookingsRedirectHref(currentUser.role)}?error=cannot-complete`,
      );
    }

    if (booking.endTime > now && !isAdmin) {
      redirect(`${getBookingsRedirectHref(currentUser.role)}?error=call-not-ended`);
    }
  }

  if (
    status === BookingStatus.CANCELLED &&
    !canCancelBookingDirectly(booking.status)
  ) {
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

        ...(status === BookingStatus.PAID
          ? {
              paidAt: booking.paidAt ?? now,
              expiresAt: null,
            }
          : {}),

        ...(status === BookingStatus.CONFIRMED
          ? {
              paidAt: booking.paidAt ?? now,
              confirmedAt: booking.confirmedAt ?? now,
              expiresAt: null,
            }
          : {}),

        ...(status === BookingStatus.COMPLETED
          ? {
              completedAt: now,
              expiresAt: null,
            }
          : {}),

        ...(status === BookingStatus.CANCELLED
          ? {
              cancelledAt: now,
              cancelReason: isAdmin
                ? "CANCELLED_BY_ADMIN"
                : "CANCELLED_BY_EXPERT",
              expiresAt: null,
            }
          : {}),

        ...(status === BookingStatus.DISPUTED
          ? {
              disputedAt: now,
              disputeReason: "MANUAL_REVIEW",
              disputeNote: "Marked as disputed from booking admin action.",
              expiresAt: null,
            }
          : {}),

        ...(status === BookingStatus.EXPIRED
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

    if (status === BookingStatus.COMPLETED && booking.status !== "COMPLETED") {
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
      (status === BookingStatus.COMPLETED ||
        status === BookingStatus.CANCELLED ||
        status === BookingStatus.DISPUTED ||
        status === BookingStatus.EXPIRED)
    ) {
      await closeCallRoom(tx, booking.id, now);
    }
  });

  if (status === BookingStatus.COMPLETED) {
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
      }" is complete. Please leave a review to help other buyers choose with confidence.`,
      metadata: {
        bookingId: booking.id,
        expertId: booking.expertId,
        serviceId: booking.serviceId,
      },
    });
  }

  if (status === BookingStatus.CANCELLED || status === BookingStatus.EXPIRED) {
    const isExpired = status === BookingStatus.EXPIRED;

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

  if (status === BookingStatus.DISPUTED) {
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

  const result = await prisma.booking.updateMany({
    where: {
      status: BookingStatus.PENDING,
      expiresAt: {
        lte: now,
      },
    },
    data: {
      status: BookingStatus.EXPIRED,
      cancelledAt: now,
    },
  });

  return {
    expiredCount: result.count,
  };
}

/**
 * Compatibility wrappers.
 * These prevent old imports from breaking while the app is being migrated
 * to updateBookingStatusAction.
 */
export async function completeBookingAction(formData: FormData) {
  formData.set("status", BookingStatus.COMPLETED);
  await updateBookingStatusAction(formData);
}

export async function confirmBookingAction(formData: FormData) {
  formData.set("status", BookingStatus.CONFIRMED);
  await updateBookingStatusAction(formData);
}

function canTransitionBookingStatus(
  currentStatus: BookingStatus,
  nextStatus: BookingStatus,
  isAdmin: boolean,
) {
  if (currentStatus === nextStatus) {
    return false;
  }

  if (isClosedStatus(currentStatus)) {
    return false;
  }

  if (nextStatus === BookingStatus.PAID) {
    return isAdmin && currentStatus === BookingStatus.PENDING;
  }

  if (nextStatus === BookingStatus.CONFIRMED) {
    const statusesThatCanBeConfirmed: BookingStatus[] = [
      BookingStatus.PENDING,
      BookingStatus.PAID,
    ];

    return isAdmin && statusesThatCanBeConfirmed.includes(currentStatus);
  }

  if (nextStatus === BookingStatus.COMPLETED) {
    return currentStatus === BookingStatus.CONFIRMED;
  }

  if (nextStatus === BookingStatus.CANCELLED) {
    return currentStatus === BookingStatus.PENDING;
  }

  if (nextStatus === BookingStatus.EXPIRED) {
    return currentStatus === BookingStatus.PENDING;
  }

  if (nextStatus === BookingStatus.DISPUTED) {
    const statusesThatCanBeDisputed: BookingStatus[] = [
      BookingStatus.PAID,
      BookingStatus.CONFIRMED,
    ];

    return isAdmin && statusesThatCanBeDisputed.includes(currentStatus);
  }

  return false;
}