"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BookingStatus, ExpertStatus, UserRole } from "@prisma/client";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  assertRateLimit,
  getClientIp,
  rateLimitPresets,
} from "@/lib/rate-limit";
import { sendNotification } from "@/server/services/notification.service";
import { createAdminAuditLog } from "@/server/services/admin-audit.service";
import { calculatePricingBreakdown } from "@/config/pricing";

const MAX_ADMIN_NOTE_LENGTH = 1500;

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function cleanAdminText(value: string, maxLength = MAX_ADMIN_NOTE_LENGTH) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
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

async function getCurrentAdmin() {
  const { user } = await requireRole(["admin"]);

  const admin = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
  });

  if (!admin) {
    redirect("/sign-in");
  }

  return admin;
}

async function assertAdminRateLimit(adminId: string, action: string) {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);

  assertRateLimit(
    `admin:${action}:${adminId}:${ip}`,
    rateLimitPresets.profileUpdate,
    "Too many admin actions. Please try again later.",
  );
}

function getBookingDateUpdates({
  status,
  booking,
}: {
  status: BookingStatus;
  booking: {
    paidAt: Date | null;
    confirmedAt?: Date | null;
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

    confirmedAt:
      status === "CONFIRMED" && !booking.confirmedAt
        ? now
        : booking.confirmedAt,

    completedAt:
      status === "COMPLETED" && !booking.completedAt
        ? now
        : booking.completedAt,

    cancelledAt:
      (status === "CANCELLED" || status === "EXPIRED") && !booking.cancelledAt
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

function revalidateAdminExpertPaths(expertId?: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/experts");
  revalidatePath("/admin/users");
  revalidatePath("/experts");

  revalidatePath("/expert");
  revalidatePath("/expert/profile");
  revalidatePath("/expert/settings");
  revalidatePath("/expert/stats");

  revalidatePath("/notifications");

  if (expertId) {
    revalidatePath(`/experts/${expertId}`);
  }
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

function canRefundBooking(status: BookingStatus) {
  return status === "PAID" || status === "CONFIRMED" || status === "COMPLETED";
}

export async function updateExpertStatusAction(formData: FormData) {
  const currentAdmin = await getCurrentAdmin();

  await assertAdminRateLimit(currentAdmin.id, "expert-status");

  const expertId = getStringValue(formData, "expertId");
  const status = getStringValue(formData, "status");
  const moderationNote = cleanAdminText(getStringValue(formData, "note"));

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

  const updatedExpert = await prisma.expertProfile.update({
    where: {
      id: expert.id,
    },
    data: {
      status: newStatus,
      ...(newStatus === "APPROVED"
        ? {
            rejectedReason: null,
            suspendedReason: null,
          }
        : {}),
      ...(newStatus === "REJECTED"
        ? {
            rejectedReason: moderationNote || "Rejected by SkillDrop admin.",
          }
        : {}),
      ...(newStatus === "SUSPENDED"
        ? {
            suspendedReason: moderationNote || "Suspended by SkillDrop admin.",
          }
        : {}),
    },
  });

  const notificationType =
    newStatus === "APPROVED"
      ? "EXPERT_APPROVED"
      : newStatus === "REJECTED"
        ? "EXPERT_REJECTED"
        : newStatus === "SUSPENDED"
          ? "EXPERT_SUSPENDED"
          : "SYSTEM";

  await safeSendNotification({
    to: expert.user.email,
    type: notificationType,
    subject:
      newStatus === "APPROVED"
        ? "Your SkillDrop expert profile was approved"
        : newStatus === "REJECTED"
          ? "Your SkillDrop expert profile was rejected"
          : newStatus === "SUSPENDED"
            ? "Your SkillDrop expert profile was suspended"
            : "Your SkillDrop expert profile status changed",
    message:
      newStatus === "APPROVED"
        ? "Your profile is approved. You can now receive public bookings after completing payout setup."
        : moderationNote ||
          `Your expert profile status changed to ${newStatus.toLowerCase()}.`,
    metadata: {
      expertId: expert.id,
      previousStatus: expert.status,
      newStatus,
      moderationNote: moderationNote || null,
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
      moderationNote: moderationNote || null,
      updatedStatus: updatedExpert.status,
    },
  });

  revalidateAdminExpertPaths(expert.id);

  redirect("/admin/experts?updated=1");
}

export async function toggleExpertVerificationAction(formData: FormData) {
  const currentAdmin = await getCurrentAdmin();

  await assertAdminRateLimit(currentAdmin.id, "expert-verification");

  const expertId = getStringValue(formData, "expertId");
  const verificationNote = cleanAdminText(getStringValue(formData, "note"));

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
      verificationNote: expert.isVerified
        ? null
        : verificationNote || "Manually verified by SkillDrop admin.",
    },
  });

  await safeSendNotification({
    to: expert.user.email,
    type: updatedExpert.isVerified ? "EXPERT_APPROVED" : "SYSTEM",
    subject: updatedExpert.isVerified
      ? "Your SkillDrop profile is now verified"
      : "Your SkillDrop profile verification was removed",
    message: updatedExpert.isVerified
      ? "Your expert profile is now verified."
      : "Your expert profile verification was removed by SkillDrop admin.",
    metadata: {
      expertId: expert.id,
      previousVerified: expert.isVerified,
      newVerified: updatedExpert.isVerified,
      verificationNote: updatedExpert.verificationNote,
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
      verificationNote: updatedExpert.verificationNote,
    },
  });

  revalidateAdminExpertPaths(expert.id);

  redirect("/admin/experts?updated=1");
}

export async function updateBookingStatusByAdminAction(formData: FormData) {
  const currentAdmin = await getCurrentAdmin();

  await assertAdminRateLimit(currentAdmin.id, "booking-status");

  const bookingId = getStringValue(formData, "bookingId");
  const status = getStringValue(formData, "status");

  const allowedStatuses: BookingStatus[] = [
    "PENDING",
    "PAID",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
    "DISPUTED",
    "EXPIRED",
  ];

  if (!bookingId || !allowedStatuses.includes(status as BookingStatus)) {
    redirect("/admin/bookings?error=invalid-status");
  }

  const newStatus = status as BookingStatus;

  if (newStatus === "REFUNDED") {
    redirect("/admin/bookings?error=refund-must-use-stripe");
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
    redirect("/admin/bookings?error=booking-already-refunded");
  }

  if (booking.status === "COMPLETED" && newStatus !== "DISPUTED") {
    redirect("/admin/bookings?error=completed-booking-can-only-be-disputed");
  }

  const pricing = getBookingPricingMetadata(booking);
  const now = new Date();

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
        ...(newStatus === "CANCELLED"
          ? {
              cancelReason: "CANCELLED_BY_ADMIN",
              expiresAt: null,
            }
          : {}),
        ...(newStatus === "EXPIRED"
          ? {
              cancelReason: "PAYMENT_EXPIRED",
              expiresAt: null,
            }
          : {}),
        ...(newStatus === "DISPUTED"
          ? {
              disputeReason: booking.disputeReason ?? "MANUAL_REVIEW",
              disputeNote:
                booking.disputeNote ??
                "Marked as disputed by SkillDrop admin.",
              expiresAt: null,
            }
          : {}),
      },
    });

    if (
      (newStatus === "CANCELLED" || newStatus === "EXPIRED") &&
      booking.availabilityId
    ) {
      await tx.availability.updateMany({
        where: {
          id: booking.availabilityId,
        },
        data: {
          isActive: true,
        },
      });
    }

    if (
      booking.callRoom &&
      (newStatus === "CANCELLED" ||
        newStatus === "DISPUTED" ||
        newStatus === "EXPIRED" ||
        newStatus === "COMPLETED")
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

  await assertAdminRateLimit(currentAdmin.id, "user-role");

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
    include: {
      expertProfile: true,
    },
  });

  if (!targetUser) {
    redirect("/admin/users?error=user-not-found");
  }

  const isChangingSelf = currentAdmin.id === targetUser.id;

  if (isChangingSelf && newRole !== "ADMIN") {
    redirect("/admin/users?error=cannot-change-own-admin-role");
  }

  if (newRole === "BUYER" && targetUser.expertProfile) {
    redirect("/admin/users?error=user-has-expert-profile");
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
  revalidatePath("/notifications");

  redirect("/admin/users?updated=1");
}

export async function refundBookingByAdminAction(formData: FormData) {
  const currentAdmin = await getCurrentAdmin();

  await assertAdminRateLimit(currentAdmin.id, "booking-refund");

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

  if (!canRefundBooking(booking.status)) {
    redirect("/admin/bookings?error=booking-not-refundable");
  }

  const paymentIntentId = booking.stripePaymentIntentId;

  if (!paymentIntentId && !booking.stripeCheckoutSessionId) {
    redirect("/admin/bookings?error=no-payment-intent");
  }

  let resolvedPaymentIntentId = paymentIntentId;

  if (!resolvedPaymentIntentId && booking.stripeCheckoutSessionId) {
    const session = await stripe.checkout.sessions.retrieve(
      booking.stripeCheckoutSessionId,
    );

    resolvedPaymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
  }

  if (!resolvedPaymentIntentId) {
    redirect("/admin/bookings?error=no-payment-intent");
  }

  let refundId: string | null = null;

  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: resolvedPaymentIntentId,
        reason: "requested_by_customer",
        reverse_transfer: true,
        refund_application_fee: true,
        metadata: {
          bookingId: booking.id,
          adminId: currentAdmin.id,
          adminEmail: currentAdmin.email,
        },
      },
      {
        idempotencyKey: `refund:${booking.id}:${resolvedPaymentIntentId}`,
      },
    );

    refundId = refund.id;
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
        paymentIntentId: resolvedPaymentIntentId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    redirect("/admin/bookings?error=refund-failed");
  }

  const pricing = getBookingPricingMetadata(booking);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status: "REFUNDED",
        refundedAt: now,
        expiresAt: null,
        stripePaymentIntentId: booking.stripePaymentIntentId ?? resolvedPaymentIntentId,
        stripeRefundId: refundId,
      },
    });

    if (booking.availabilityId) {
      await tx.availability.updateMany({
        where: {
          id: booking.availabilityId,
        },
        data: {
          isActive: true,
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

  await safeSendNotification({
    to: booking.buyer.email,
    type: "BOOKING_REFUNDED",
    subject: "Your SkillDrop booking was refunded",
    message: `Your booking "${
      booking.service?.title ?? "Booked call"
    }" was refunded.`,
    metadata: {
      bookingId: booking.id,
      expertId: booking.expertId,
      paymentIntentId: resolvedPaymentIntentId,
      refundId,
      ...pricing,
    },
  });

  await safeSendNotification({
    to: booking.expert.user.email,
    type: "BOOKING_REFUNDED",
    subject: "A booking was refunded",
    message: `The booking "${
      booking.service?.title ?? "Booked call"
    }" was refunded.`,
    metadata: {
      bookingId: booking.id,
      expertId: booking.expertId,
      paymentIntentId: resolvedPaymentIntentId,
      refundId,
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
      paymentIntentId: resolvedPaymentIntentId,
      refundId,
      ...pricing,
    },
  });

  revalidateAdminBookingPaths(booking.expertId, booking.id);

  redirect("/admin/bookings?status=refunded&updated=1");
}

export async function markBookingDisputedByAdminAction(formData: FormData) {
  const currentAdmin = await getCurrentAdmin();

  await assertAdminRateLimit(currentAdmin.id, "booking-dispute");

  const bookingId = getStringValue(formData, "bookingId");
  const disputeReason = cleanAdminText(getStringValue(formData, "disputeReason"), 300);
  const disputeNote = cleanAdminText(getStringValue(formData, "disputeNote"));

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
      callRoom: true,
    },
  });

  if (!booking) {
    redirect("/admin/bookings?error=booking-not-found");
  }

  if (booking.status === "REFUNDED") {
    redirect("/admin/bookings?error=already-refunded");
  }

  const pricing = getBookingPricingMetadata(booking);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status: "DISPUTED",
        disputeReason,
        disputeNote: disputeNote || null,
        disputedAt: now,
        expiresAt: null,
      },
    });

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

  await safeSendNotification({
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

  await safeSendNotification({
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

  await assertAdminRateLimit(currentAdmin.id, "resolve-dispute");

  const bookingId = getStringValue(formData, "bookingId");
  const resolution = getStringValue(formData, "resolution");
  const resolutionNote = cleanAdminText(getStringValue(formData, "resolutionNote"));

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
        cancelReason:
          newStatus === "CANCELLED"
            ? "DISPUTE_RESOLVED_CANCELLED"
            : booking.cancelReason,
        expiresAt: null,
        disputeNote: [
          booking.disputeNote,
          `Resolved as ${newStatus}.`,
          resolutionNote || null,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    });

    if (newStatus === "CANCELLED" && booking.availabilityId) {
      await tx.availability.updateMany({
        where: {
          id: booking.availabilityId,
        },
        data: {
          isActive: true,
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

  await safeSendNotification({
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
      resolutionNote: resolutionNote || null,
    },
  });

  await safeSendNotification({
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
      resolutionNote: resolutionNote || null,
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
      resolutionNote: resolutionNote || null,
      ...pricing,
    },
  });

  revalidateAdminBookingPaths(booking.expertId, booking.id);

  redirect(`/admin/bookings?status=${newStatus.toLowerCase()}&updated=1`);
}


const OFFICIAL_SKILLDROP_CATEGORIES = [
  {
    name: "Life & Everyday",
    slug: "life-everyday",
    icon: "LIFE",
    description: "Daily decisions, practical problems and simple questions that need a human answer.",
    sortOrder: 10,
    subcategories: [
      "Daily decisions",
      "Personal organization",
      "Local practical help",
      "General life advice",
    ],
  },
  {
    name: "Relationships",
    slug: "relationships",
    icon: "RELATIONSHIPS",
    description: "Dating, communication, confidence, social situations and relationship questions.",
    sortOrder: 20,
    subcategories: [
      "Dating advice",
      "Communication",
      "Confidence",
      "Friendship and social life",
    ],
  },
  {
    name: "Business",
    slug: "business",
    icon: "BUSINESS",
    description: "Business ideas, first clients, positioning, pricing, freelancing and company building.",
    sortOrder: 30,
    subcategories: [
      "Start a company",
      "Find first clients",
      "Pricing and offer",
      "Freelance advice",
      "Marketing basics",
    ],
  },
  {
    name: "Career & Studies",
    slug: "career-studies",
    icon: "CAREER",
    description: "CV, interviews, applications, studies, job search and professional decisions.",
    sortOrder: 40,
    subcategories: [
      "CV review",
      "Mock interview",
      "Motivation letter",
      "Study applications",
      "Career advice",
    ],
  },
  {
    name: "Documents & Admin",
    slug: "documents-admin",
    icon: "DOCUMENTS",
    description: "Forms, official letters, admin processes, applications and confusing documents.",
    sortOrder: 50,
    subcategories: [
      "Understand a document",
      "French administration",
      "Application forms",
      "Emails and letters",
    ],
  },
  {
    name: "Tech & Digital",
    slug: "tech-digital",
    icon: "TECH",
    description: "Coding, websites, IT issues, digital tools, online setup and technical explanations.",
    sortOrder: 60,
    subcategories: [
      "Coding help",
      "Website advice",
      "IT support",
      "Digital tools",
    ],
  },
  {
    name: "Cooking",
    slug: "cooking",
    icon: "COOKING",
    description: "Recipes, cooking basics, traditional dishes, meal ideas and kitchen confidence.",
    sortOrder: 70,
    subcategories: [
      "Recipes",
      "Cooking for beginners",
      "Traditional dishes",
      "Meal planning",
    ],
  },
  {
    name: "Faith & Religion",
    slug: "faith-religion",
    icon: "FAITH",
    description: "Learn, ask questions and speak with knowledgeable people about faith and religion.",
    sortOrder: 80,
    subcategories: [
      "Religious questions",
      "Learn about Christianity",
      "Learn about Islam",
      "Learn about Judaism",
      "Spiritual discussion",
    ],
  },
  {
    name: "Languages & Culture",
    slug: "languages-culture",
    icon: "LANGUAGES",
    description: "Language practice, translation, cultural questions, local life and communication help.",
    sortOrder: 90,
    subcategories: [
      "Language practice",
      "Translation help",
      "Message correction",
      "Culture and local life",
    ],
  },
  {
    name: "Other Practical Help",
    slug: "other-practical-help",
    icon: "OTHER",
    description: "Problems that do not fit yet. Use this carefully while SkillDrop learns new demand.",
    sortOrder: 100,
    subcategories: ["General request", "Not sure yet"],
  },
];

function slugifyCategoryPart(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function seedOfficialCategoriesAction() {
  const currentAdmin = await getCurrentAdmin();

  await assertAdminRateLimit(currentAdmin.id, "seed-categories");

  let createdOrUpdatedCategories = 0;
  let createdOrUpdatedSubcategories = 0;

  for (const category of OFFICIAL_SKILLDROP_CATEGORIES) {
    const savedCategory = await prisma.category.upsert({
      where: {
        slug: category.slug,
      },
      create: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      update: {
        name: category.name,
        icon: category.icon,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });

    createdOrUpdatedCategories += 1;

    for (const [index, subcategoryName] of category.subcategories.entries()) {
      await prisma.subcategory.upsert({
        where: {
          categoryId_slug: {
            categoryId: savedCategory.id,
            slug: slugifyCategoryPart(subcategoryName),
          },
        },
        create: {
          categoryId: savedCategory.id,
          name: subcategoryName,
          slug: slugifyCategoryPart(subcategoryName),
          sortOrder: (index + 1) * 10,
          isActive: true,
        },
        update: {
          name: subcategoryName,
          sortOrder: (index + 1) * 10,
          isActive: true,
        },
      });

      createdOrUpdatedSubcategories += 1;
    }
  }

  await createAdminAuditLog({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    action: "OFFICIAL_CATEGORIES_SEEDED",
    entityType: "Category",
    message: "Official SkillDrop categories and subcategories were seeded.",
    metadata: {
      categories: createdOrUpdatedCategories,
      subcategories: createdOrUpdatedSubcategories,
    },
  });

  revalidatePath("/");
  revalidatePath("/categories");
  revalidatePath("/admin");
  revalidatePath("/admin/launch");
  revalidatePath("/admin/category-requests");
  revalidatePath("/expert/services");

  redirect("/admin/launch?categoriesSeeded=1");
}

