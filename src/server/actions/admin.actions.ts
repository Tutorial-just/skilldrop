"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendNotification } from "@/server/services/notification.service";
import { createAdminAuditLog } from "@/server/services/admin-audit.service";

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

export async function updateExpertStatusAction(formData: FormData) {
  const currentAdmin = await getCurrentAdmin();

  const expertId = getStringValue(formData, "expertId");
  const status = getStringValue(formData, "status");

  const allowedStatuses = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"];

  if (!expertId || !allowedStatuses.includes(status)) {
    redirect("/admin/experts?error=invalid-status");
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

  await prisma.expertProfile.update({
    where: {
      id: expert.id,
    },
    data: {
      status: status as "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED",
    },
  });

  await createAdminAuditLog({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    action: "EXPERT_STATUS_UPDATED",
    entityType: "EXPERT",
    entityId: expert.id,
    message: `Expert status changed from ${expert.status} to ${status}.`,
    metadata: {
      expertId: expert.id,
      expertEmail: expert.user.email,
      previousStatus: expert.status,
      newStatus: status,
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

  const allowedStatuses = [
    "PENDING",
    "PAID",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
    "REFUNDED",
    "DISPUTED",
  ];

  if (!bookingId || !allowedStatuses.includes(status)) {
    redirect("/admin/bookings?error=invalid-status");
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

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status: status as
          | "PENDING"
          | "PAID"
          | "CONFIRMED"
          | "COMPLETED"
          | "CANCELLED"
          | "REFUNDED"
          | "DISPUTED",
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
  });

  await createAdminAuditLog({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    action: "BOOKING_STATUS_UPDATED",
    entityType: "BOOKING",
    entityId: booking.id,
    message: `Booking status changed from ${booking.status} to ${status}.`,
    metadata: {
      bookingId: booking.id,
      buyerEmail: booking.buyer.email,
      expertEmail: booking.expert.user.email,
      serviceTitle: booking.service?.title ?? null,
      previousStatus: booking.status,
      newStatus: status,
      priceCents: booking.priceCents,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/earnings");
  revalidatePath("/expert/stats");
  revalidatePath("/experts");
  revalidatePath(`/experts/${booking.expertId}`);

  redirect("/admin/bookings?updated=1");
}

export async function updateUserRoleByAdminAction(formData: FormData) {
  const currentAdmin = await getCurrentAdmin();

  const userId = getStringValue(formData, "userId");
  const role = getStringValue(formData, "role");

  const allowedRoles = ["BUYER", "EXPERT", "ADMIN"];

  if (!userId || !allowedRoles.includes(role)) {
    redirect("/admin/users?error=invalid-role");
  }

  const targetUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!targetUser) {
    redirect("/admin/users?error=user-not-found");
  }

  const isChangingSelf = currentAdmin.id === targetUser.id;

  if (isChangingSelf && role !== "ADMIN") {
    redirect("/admin/users?error=cannot-change-own-admin-role");
  }

  await prisma.user.update({
    where: {
      id: targetUser.id,
    },
    data: {
      role: role as "BUYER" | "EXPERT" | "ADMIN",
    },
  });

  await createAdminAuditLog({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    action: "USER_ROLE_UPDATED",
    entityType: "USER",
    entityId: targetUser.id,
    message: `User role changed from ${targetUser.role} to ${role}.`,
    metadata: {
      targetUserEmail: targetUser.email,
      previousRole: targetUser.role,
      newRole: role,
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

  await stripe.refunds.create({
    payment_intent: paymentIntentId,
    reason: "requested_by_customer",
    reverse_transfer: true,
    refund_application_fee: true,
    metadata: {
      bookingId: booking.id,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status: "REFUNDED",
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
      priceCents: booking.priceCents,
      previousStatus: booking.status,
      newStatus: "REFUNDED",
      stripeCheckoutSessionId: booking.stripeCheckoutSessionId,
      paymentIntentId,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/earnings");
  revalidatePath(`/experts/${booking.expertId}`);

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

  await prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      status: "DISPUTED",
      disputeReason,
      disputeNote: disputeNote || null,
      disputedAt: new Date(),
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
      disputeReason,
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
      disputeReason,
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
      previousStatus: booking.status,
      newStatus: "DISPUTED",
      disputeReason,
      disputeNote: disputeNote || null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/earnings");

  redirect("/admin/bookings?status=disputed&updated=1");
}

export async function resolveDisputeByAdminAction(formData: FormData) {
  const currentAdmin = await getCurrentAdmin();

  const bookingId = getStringValue(formData, "bookingId");
  const resolution = getStringValue(formData, "resolution");

  const allowedResolutions = ["COMPLETED", "CANCELLED"];

  if (!bookingId || !allowedResolutions.includes(resolution)) {
    redirect("/admin/bookings?status=disputed&error=invalid-resolution");
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
    redirect("/admin/bookings?status=disputed&error=booking-not-found");
  }

  if (booking.status !== "DISPUTED") {
    redirect("/admin/bookings?status=disputed&error=not-disputed");
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status: resolution as "COMPLETED" | "CANCELLED",
        disputeNote: booking.disputeNote
          ? `${booking.disputeNote}\n\nResolved as ${resolution}.`
          : `Resolved as ${resolution}.`,
      },
    });

    if (resolution === "CANCELLED" && booking.availabilityId) {
      await tx.availability.update({
        where: {
          id: booking.availabilityId,
        },
        data: {
          isBooked: false,
        },
      });
    }

    if (resolution === "COMPLETED") {
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
    }" was resolved as ${resolution.toLowerCase()}.`,
    metadata: {
      bookingId: booking.id,
      resolution,
    },
  });

  await sendNotification({
    to: booking.expert.user.email,
    type: "BOOKING_DISPUTED",
    subject: "A SkillDrop dispute was resolved",
    message: `The booking "${
      booking.service?.title ?? "Booked call"
    }" was resolved as ${resolution.toLowerCase()}.`,
    metadata: {
      bookingId: booking.id,
      resolution,
    },
  });

  await createAdminAuditLog({
    adminId: currentAdmin.id,
    adminEmail: currentAdmin.email,
    action: "DISPUTE_RESOLVED",
    entityType: "BOOKING",
    entityId: booking.id,
    message: `Dispute resolved as ${resolution}.`,
    metadata: {
      bookingId: booking.id,
      buyerEmail: booking.buyer.email,
      expertEmail: booking.expert.user.email,
      serviceTitle: booking.service?.title ?? null,
      previousStatus: booking.status,
      newStatus: resolution,
      disputeReason: booking.disputeReason,
      previousDisputeNote: booking.disputeNote,
      resolution,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/earnings");
  revalidatePath("/expert/stats");
  revalidatePath(`/experts/${booking.expertId}`);

  redirect(`/admin/bookings?status=${resolution.toLowerCase()}&updated=1`);
}