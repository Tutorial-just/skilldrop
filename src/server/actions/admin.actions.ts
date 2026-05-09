"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BookingStatus, ExpertStatus, UserRole } from "@prisma/client";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendNotification } from "@/server/services/notification.service";
import { createAdminAuditLog } from "@/server/services/admin-audit.service";
import { calculatePricingBreakdown } from "@/config/pricing";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

async function getCurrentAdmin() {
  const { user } = await requireRole(["admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const admin = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!admin) {
    redirect("/sign-in");
  }

  return admin;
}

function getBookingDateUpdates({
  status,
  booking,
}: {
  status: BookingStatus;
  booking: {
    paidAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
    refundedAt: Date | null;
    disputedAt: Date | null;
  };
}) {
  const now = new Date();

  return {
    paidAt:
      (status === "PAID" || status === "CONFIRMED") && !booking.paidAt
        ? now
        : booking.paidAt,

    completedAt:
      status === "COMPLETED" && !booking.completedAt
        ? now
        : booking.completedAt,

    cancelledAt:
      status === "CANCELLED" && !booking.cancelledAt
        ? now
        : booking.cancelledAt,

    refundedAt:
      status === "REFUNDED" && !booking.refundedAt
        ? now
        : booking.refundedAt,

    disputedAt:
      status === "DISPUTED" && !booking.disputedAt
        ? now
        : booking.disputedAt,
  };
}

function revalidateAdminBookingPaths(expertId?: string, bookingId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/users");

  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath("/buyer/reviews");

  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/earnings");
  revalidatePath("/expert/stats");
  revalidatePath("/expert/availability");

  revalidatePath("/experts");
  revalidatePath("/notifications");

  if (bookingId) {
    revalidatePath(`/buyer/bookings/${bookingId}/checkout`);
    revalidatePath(`/calls/${bookingId}`);
  }

  if (expertId) {
    revalidatePath(`/experts/${expertId}`);
  }
}

function getBookingPricingMetadata(booking: {
  priceCents: number;
  platformFeeCents: number | null;
  providerNetCents: number | null;
  clientServiceFeeCents: number | null;
  clientTotalCents: number | null;
}) {
  const fallback = calculatePricingBreakdown(booking.priceCents);

  return {
    servicePriceCents: booking.priceCents,
    platformFeeCents:
      typeof booking.platformFeeCents === "number"
        ? booking.platformFeeCents
        : fallback.platformFeeCents,
    providerNetCents:
      typeof booking.providerNetCents === "number"
        ? booking.providerNetCents
        : fallback.providerNetCents,
    clientServiceFeeCents:
      typeof booking.clientServiceFeeCents === "number"
        ? booking.clientServiceFeeCents
        : fallback.clientServiceFeeCents,
    clientTotalCents:
      typeof booking.clientTotalCents === "number"
        ? booking.clientTotalCents
        : fallback.clientTotalCents,
  };
}

export async function updateExpertStatusAction(formData: FormData) {
  const currentAdmin = await getCurrentAdmin();

  const expertId = getStringValue(formData, "expertId");
  const status = getStringValue(formData, "status");

  const allowedStatuses: ExpertStatus[] = [
    "PENDING",
    "APPROVED",
    "REJECTED",
    "SUSPENDED",
  ];

  if (!expertId || !allowedStatuses.includes(status as ExpertStatus)) {
    redirect("/admin/experts?error=invalid-status");
  }

  const newStatus = status as ExpertStatus;

  const expert = await prisma.expertProfile.findUnique({
    where: {
      id: expertId,
    },
    include: {
      user: true,
    },
  });

  if (!expert) {
    redirect("/admin/experts?error=expert-not-found");
  }

  await prisma.expertProfile.update({
    where: {
      id: expert.id,
    },
    data: {
      status: newStatus,
    },
  });

  await createAdminAuditLog({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    action: "EXPERT_STATUS_UPDATED",
    entityType: "EXPERT",
    entityId: expert.id,
    message: `Expert status changed from ${expert.status} to ${newStatus}.`,
    metadata: {
      expertId: expert.id,
      expertEmail: expert.user.email,
      previousStatus: expert.status,
      newStatus,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/experts");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expert.id}`);

  redirect("/admin/experts?updated=1");
}

export async function toggleExpertVerificationAction(formData: FormData) {
  const currentAdmin = await getCurrentAdmin();

  const expertId = getStringValue(formData, "expertId");

  if (!expertId) {
    redirect("/admin/experts?error=missing-expert");
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
    redirect("/admin/experts?error=expert-not-found");
  }

  const updatedExpert = await prisma.expertProfile.update({
    where: {
      id: expert.id,
    },
    data: {
      isVerified: !expert.isVerified,
      verifiedAt: expert.isVerified ? null : new Date(),
    },
  });

  await createAdminAuditLog({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    action: "EXPERT_VERIFICATION_TOGGLED",
    entityType: "EXPERT",
    entityId: expert.id,
    message: updatedExpert.isVerified
      ? "Expert manually verified."
      : "Expert verification removed.",
    metadata: {
      expertId: expert.id,
      expertEmail: expert.user.email,
      previousVerified: expert.isVerified,
      newVerified: updatedExpert.isVerified,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/experts");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expert.id}`);

  redirect("/admin/experts?updated=1");
}

export async function updateBookingStatusByAdminAction(formData: FormData) {
  const currentAdmin = await getCurrentAdmin();

  const bookingId = getStringValue(formData, "bookingId");
  const status = getStringValue(formData, "status");

  const allowedStatuses: BookingStatus[] = [
    "PENDING",
    "PAID",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
    "REFUNDED",
    "DISPUTED",
  ];

  if (!bookingId || !allowedStatuses.includes(status as BookingStatus)) {
    redirect("/admin/bookings?error=invalid-status");
  }

  const newStatus = status as BookingStatus;

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
    redirect("/admin/bookings?error=booking-not-found");
  }

  const pricing = getBookingPricingMetadata(booking);

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status: newStatus,
        ...getBookingDateUpdates({
          status: newStatus,
          booking,
        }),
        ...(newStatus === "CANCELLED" || newStatus === "REFUNDED"
          ? {
              expiresAt: null,
            }
          : {}),
      },
    });

    if (
      (newStatus === "CANCELLED" || newStatus === "REFUNDED") &&
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

    if (
      booking.callRoom &&
      (newStatus === "CANCELLED" ||
        newStatus === "REFUNDED" ||
        newStatus === "COMPLETED")
    ) {
      await tx.callRoom.updateMany({
        where: {
          bookingId: booking.id,
        },
        data: {
          status: "ENDED",
          endsAt: new Date(),
        },
      });
    }

    if (newStatus === "COMPLETED" && !booking.completedAt) {
      await tx.expertProfile.update({
        where: {
          id: booking.expertId,
        },
        data: {
          totalSessions: {
            increment: 1,
          },
        },
      });
    }
  });

  await createAdminAuditLog({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    action: "BOOKING_STATUS_UPDATED",
    entityType: "BOOKING",
    entityId: booking.id,
    message: `Booking status changed from ${booking.status} to ${newStatus}.`,
    metadata: {
      bookingId: booking.id,
      buyerEmail: booking.buyer.email,
      expertEmail: booking.expert.user.email,
      serviceTitle: booking.service?.title ?? null,
      note: booking.note,
      previousStatus: booking.status,
      newStatus,
      ...pricing,
      stripeCheckoutSessionId: booking.stripeCheckoutSessionId,
      stripePaymentIntentId: booking.stripePaymentIntentId,
    },
  });

  revalidateAdminBookingPaths(booking.expertId, booking.id);

  redirect("/admin/bookings?updated=1");
}

export async function updateUserRoleByAdminAction(formData: FormData) {
  const currentAdmin = await getCurrentAdmin();

  const userId = getStringValue(formData, "userId");
  const role = getStringValue(formData, "role");

  const allowedRoles: UserRole[] = ["BUYER", "EXPERT", "ADMIN"];

  if (!userId || !allowedRoles.includes(role as UserRole)) {
    redirect("/admin/users?error=invalid-role");
  }

  const newRole = role as UserRole;

  const targetUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!targetUser) {
    redirect("/admin/users?error=user-not-found");
  }

  const isChangingSelf = currentAdmin.id === targetUser.id;

  if (isChangingSelf && newRole !== "ADMIN") {
    redirect("/admin/users?error=cannot-change-own-admin-role");
  }

  await prisma.user.update({
    where: {
      id: targetUser.id,
    },
    data: {
      role: newRole,
    },
  });

  await createAdminAuditLog({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    action: "USER_ROLE_UPDATED",
    entityType: "USER",
    entityId: targetUser.id,
    message: `User role changed from ${targetUser.role} to ${newRole}.`,
    metadata: {
      targetUserEmail: targetUser.email,
      previousRole: targetUser.role,
      newRole,
      changedSelf: isChangingSelf,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/experts");
  revalidatePath("/buyer");
  revalidatePath("/expert");
  revalidatePath("/become-expert");

  redirect("/admin/users?updated=1");
}

export async function refundBookingByAdminAction(formData: FormData) {
  const currentAdmin = await getCurrentAdmin();

  const bookingId = getStringValue(formData, "bookingId");

  if (!bookingId) {
    redirect("/admin/bookings?error=missing-booking");
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
    redirect("/admin/bookings?error=booking-not-found");
  }

  if (booking.status === "REFUNDED") {
    redirect("/admin/bookings?error=already-refunded");
  }

  if (!booking.stripeCheckoutSessionId) {
    redirect("/admin/bookings?error=no-stripe-session");
  }

  const session = await stripe.checkout.sessions.retrieve(
    booking.stripeCheckoutSessionId,
  );

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) {
    redirect("/admin/bookings?error=no-payment-intent");
  }

  try {
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: "requested_by_customer",
      reverse_transfer: true,
      refund_application_fee: true,
      metadata: {
        bookingId: booking.id,
        adminId: currentAdmin.id,
        adminEmail: currentAdmin.email,
      },
    });
  } catch (error) {
    await createAdminAuditLog({
      adminId: currentAdmin.id,
      adminEmail: currentAdmin.email,
      action: "BOOKING_REFUND_FAILED",
      entityType: "BOOKING",
      entityId: booking.id,
      message: "Stripe refund failed.",
      metadata: {
        bookingId: booking.id,
        buyerEmail: booking.buyer.email,
        expertEmail: booking.expert.user.email,
        stripeCheckoutSessionId: booking.stripeCheckoutSessionId,
        paymentIntentId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    redirect("/admin/bookings?error=refund-failed");
  }

  const pricing = getBookingPricingMetadata(booking);

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status: "REFUNDED",
        refundedAt: new Date(),
        expiresAt: null,
        stripePaymentIntentId: booking.stripePaymentIntentId ?? paymentIntentId,
      },
    });

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
          endsAt: new Date(),
        },
      });
    }
  });

  await sendNotification({
    to: booking.buyer.email,
    type: "BOOKING_REFUNDED",
    subject: "Your SkillDrop booking was refunded",
    message: `Your booking "${
      booking.service?.title ?? "Booked call"
    }" was refunded.`,
    metadata: {
      bookingId: booking.id,
      expertId: booking.expertId,
      paymentIntentId,
      ...pricing,
    },
  });

  await sendNotification({
    to: booking.expert.user.email,
    type: "BOOKING_REFUNDED",
    subject: "A booking was refunded",
    message: `The booking "${
      booking.service?.title ?? "Booked call"
    }" was refunded.`,
    metadata: {
      bookingId: booking.id,
      expertId: booking.expertId,
      paymentIntentId,
      ...pricing,
    },
  });

  await createAdminAuditLog({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    action: "BOOKING_REFUNDED",
    entityType: "BOOKING",
    entityId: booking.id,
    message: "Booking was refunded by admin.",
    metadata: {
      bookingId: booking.id,
      buyerEmail: booking.buyer.email,
      expertEmail: booking.expert.user.email,
      serviceTitle: booking.service?.title ?? null,
      note: booking.note,
      previousStatus: booking.status,
      newStatus: "REFUNDED",
      stripeCheckoutSessionId: booking.stripeCheckoutSessionId,
      paymentIntentId,
      ...pricing,
    },
  });

  revalidateAdminBookingPaths(booking.expertId, booking.id);

  redirect("/admin/bookings?status=refunded&updated=1");
}

export async function markBookingDisputedByAdminAction(formData: FormData) {
  const currentAdmin = await getCurrentAdmin();

  const bookingId = getStringValue(formData, "bookingId");
  const disputeReason = getStringValue(formData, "disputeReason");
  const disputeNote = getStringValue(formData, "disputeNote");

  if (!bookingId || !disputeReason) {
    redirect("/admin/bookings?error=missing-dispute-data");
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
    },
  });

  if (!booking) {
    redirect("/admin/bookings?error=booking-not-found");
  }

  const pricing = getBookingPricingMetadata(booking);

  await prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      status: "DISPUTED",
      disputeReason,
      disputeNote: disputeNote || null,
      disputedAt: new Date(),
      expiresAt: null,
    },
  });

  await sendNotification({
    to: booking.buyer.email,
    type: "BOOKING_DISPUTED",
    subject: "Your SkillDrop booking is under review",
    message: `Your booking "${
      booking.service?.title ?? "Booked call"
    }" was marked for review. SkillDrop will review the case.`,
    metadata: {
      bookingId: booking.id,
      expertId: booking.expertId,
      disputeReason,
      disputeNote: disputeNote || null,
    },
  });

  await sendNotification({
    to: booking.expert.user.email,
    type: "BOOKING_DISPUTED",
    subject: "A SkillDrop booking is under review",
    message: `The booking "${
      booking.service?.title ?? "Booked call"
    }" was marked for review. SkillDrop will review the case.`,
    metadata: {
      bookingId: booking.id,
      expertId: booking.expertId,
      disputeReason,
      disputeNote: disputeNote || null,
    },
  });

  await createAdminAuditLog({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    action: "BOOKING_DISPUTED",
    entityType: "BOOKING",
    entityId: booking.id,
    message: `Booking marked as disputed: ${disputeReason}.`,
    metadata: {
      bookingId: booking.id,
      buyerEmail: booking.buyer.email,
      expertEmail: booking.expert.user.email,
      serviceTitle: booking.service?.title ?? null,
      note: booking.note,
      previousStatus: booking.status,
      newStatus: "DISPUTED",
      disputeReason,
      disputeNote: disputeNote || null,
      ...pricing,
    },
  });

  revalidateAdminBookingPaths(booking.expertId, booking.id);

  redirect("/admin/bookings?status=disputed&updated=1");
}

export async function resolveDisputeByAdminAction(formData: FormData) {
  const currentAdmin = await getCurrentAdmin();

  const bookingId = getStringValue(formData, "bookingId");
  const resolution = getStringValue(formData, "resolution");

  const allowedResolutions: BookingStatus[] = ["COMPLETED", "CANCELLED"];

  if (!bookingId || !allowedResolutions.includes(resolution as BookingStatus)) {
    redirect("/admin/bookings?status=disputed&error=invalid-resolution");
  }

  const newStatus = resolution as "COMPLETED" | "CANCELLED";

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
    redirect("/admin/bookings?status=disputed&error=booking-not-found");
  }

  if (booking.status !== "DISPUTED") {
    redirect("/admin/bookings?status=disputed&error=not-disputed");
  }

  const now = new Date();
  const pricing = getBookingPricingMetadata(booking);

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status: newStatus,
        completedAt:
          newStatus === "COMPLETED" && !booking.completedAt
            ? now
            : booking.completedAt,
        cancelledAt:
          newStatus === "CANCELLED" && !booking.cancelledAt
            ? now
            : booking.cancelledAt,
        expiresAt: null,
        disputeNote: booking.disputeNote
          ? `${booking.disputeNote}\n\nResolved as ${newStatus}.`
          : `Resolved as ${newStatus}.`,
      },
    });

    if (newStatus === "CANCELLED" && booking.availabilityId) {
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

    if (newStatus === "COMPLETED" && !booking.completedAt) {
      await tx.expertProfile.update({
        where: {
          id: booking.expertId,
        },
        data: {
          totalSessions: {
            increment: 1,
          },
        },
      });
    }
  });

  await sendNotification({
    to: booking.buyer.email,
    type: "BOOKING_DISPUTED",
    subject: "Your SkillDrop dispute was resolved",
    message: `Your booking "${
      booking.service?.title ?? "Booked call"
    }" was resolved as ${newStatus.toLowerCase()}.`,
    metadata: {
      bookingId: booking.id,
      expertId: booking.expertId,
      resolution: newStatus,
    },
  });

  await sendNotification({
    to: booking.expert.user.email,
    type: "BOOKING_DISPUTED",
    subject: "A SkillDrop dispute was resolved",
    message: `The booking "${
      booking.service?.title ?? "Booked call"
    }" was resolved as ${newStatus.toLowerCase()}.`,
    metadata: {
      bookingId: booking.id,
      expertId: booking.expertId,
      resolution: newStatus,
    },
  });

  await createAdminAuditLog({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    action: "DISPUTE_RESOLVED",
    entityType: "BOOKING",
    entityId: booking.id,
    message: `Dispute resolved as ${newStatus}.`,
    metadata: {
      bookingId: booking.id,
      buyerEmail: booking.buyer.email,
      expertEmail: booking.expert.user.email,
      serviceTitle: booking.service?.title ?? null,
      note: booking.note,
      previousStatus: booking.status,
      newStatus,
      disputeReason: booking.disputeReason,
      previousDisputeNote: booking.disputeNote,
      resolution: newStatus,
      ...pricing,
    },
  });

  revalidateAdminBookingPaths(booking.expertId, booking.id);

  redirect(`/admin/bookings?status=${newStatus.toLowerCase()}&updated=1`);
}