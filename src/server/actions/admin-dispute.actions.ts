"use server";

import { revalidatePath } from "next/cache";
import { BookingStatus } from "@prisma/client";
import { createAdminAuditLog } from "@/lib/admin-audit-log";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/server/services/notification.service";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getResolutionNote(formData: FormData, fallback: string) {
  const resolution = getStringValue(formData, "resolution");

  return resolution.length > 0 ? resolution : fallback;
}

function revalidateDisputePaths(bookingId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/health");
  revalidatePath("/admin/disputes");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/reviews");

  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath("/buyer/reviews");

  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/stats");
  revalidatePath("/expert/earnings");

  revalidatePath("/notifications");

  if (bookingId) {
    revalidatePath(`/calls/${bookingId}`);
  }
}

async function safeSendNotification(
  input: Parameters<typeof sendNotification>[0],
) {
  try {
    await sendNotification(input);
  } catch (error) {
    console.error("Dispute notification error:", error);
  }
}

async function getReportWithBooking(reportId: string, bookingId: string) {
  return prisma.bookingReport.findFirst({
    where: {
      id: reportId,
      bookingId,
    },
    include: {
      booking: {
        include: {
          buyer: true,
          expert: {
            include: {
              user: true,
            },
          },
          service: true,
        },
      },
      reporter: true,
    },
  });
}

export async function closeBookingReportAction(formData: FormData) {
  const { user: admin } = await requireRole(["admin"]);

  const reportId = getStringValue(formData, "reportId");
  const bookingId = getStringValue(formData, "bookingId");
  const resolution = getResolutionNote(
    formData,
    "Report closed by SkillDrop admin. No booking status change was made.",
  );

  if (!reportId || !bookingId) {
    throw new Error("Missing report or booking id.");
  }

  const report = await getReportWithBooking(reportId, bookingId);

  if (!report) {
    throw new Error("Report was not found.");
  }

  await prisma.bookingReport.update({
    where: {
      id: reportId,
    },
    data: {
      status: "CLOSED",
      message: resolution,
    },
  });

  await safeSendNotification({
    to: report.booking.buyer.email,
    type: "BOOKING_DISPUTED",
    subject: "Your booking report was reviewed",
    message: `SkillDrop reviewed your report for "${
      report.booking.service?.title ?? "Booked call"
    }". Resolution: ${resolution}`,
    metadata: {
      reportId,
      bookingId,
      expertId: report.booking.expertId,
      resolution,
    },
  });

  await safeSendNotification({
    to: report.booking.expert.user.email,
    type: "BOOKING_DISPUTED",
    subject: "A booking report was reviewed",
    message: `SkillDrop reviewed a report for "${
      report.booking.service?.title ?? "Booked call"
    }". Resolution: ${resolution}`,
    metadata: {
      reportId,
      bookingId,
      expertId: report.booking.expertId,
      resolution,
    },
  });

  await createAdminAuditLog({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "BOOKING_REPORT_CLOSED",
    entityType: "BookingReport",
    entityId: reportId,
    message: `Closed booking report for booking ${bookingId}.`,
    metadata: {
      bookingId,
      reportId,
      expertId: report.booking.expertId,
      buyerId: report.booking.buyerId,
      resolution,
    },
  });

  revalidateDisputePaths(bookingId);
}

export async function resolveBookingAsCompletedAction(formData: FormData) {
  const { user: admin } = await requireRole(["admin"]);

  const reportId = getStringValue(formData, "reportId");
  const bookingId = getStringValue(formData, "bookingId");

  if (!reportId || !bookingId) {
    throw new Error("Missing report or booking id.");
  }

  const report = await getReportWithBooking(reportId, bookingId);

  if (!report) {
    throw new Error("Report was not found.");
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: BookingStatus.COMPLETED,
        completedAt: report.booking.completedAt ?? now,
        expiresAt: null,
      },
    }),

    prisma.bookingReport.update({
      where: {
        id: reportId,
      },
      data: {
        status: "CLOSED",
        message:
          "Resolved by SkillDrop admin: booking was marked as completed.",
      },
    }),
  ]);

  await safeSendNotification({
    to: report.booking.buyer.email,
    type: "BOOKING_COMPLETED",
    subject: "Booking resolved as completed",
    message: `SkillDrop reviewed the report for "${
      report.booking.service?.title ?? "Booked call"
    }" and resolved the booking as completed.`,
    metadata: {
      reportId,
      bookingId,
      expertId: report.booking.expertId,
      resolution: "completed",
    },
  });

  await safeSendNotification({
    to: report.booking.expert.user.email,
    type: "BOOKING_COMPLETED",
    subject: "Booking resolved as completed",
    message: `SkillDrop reviewed the report for "${
      report.booking.service?.title ?? "Booked call"
    }" and resolved the booking as completed.`,
    metadata: {
      reportId,
      bookingId,
      expertId: report.booking.expertId,
      resolution: "completed",
    },
  });

  await createAdminAuditLog({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "BOOKING_RESOLVED_COMPLETED",
    entityType: "Booking",
    entityId: bookingId,
    message: `Resolved disputed booking ${bookingId} as completed.`,
    metadata: {
      bookingId,
      reportId,
      expertId: report.booking.expertId,
      buyerId: report.booking.buyerId,
      previousStatus: report.booking.status,
      newStatus: BookingStatus.COMPLETED,
    },
  });

  revalidateDisputePaths(bookingId);
}

export async function keepBookingDisputedAction(formData: FormData) {
  const { user: admin } = await requireRole(["admin"]);

  const reportId = getStringValue(formData, "reportId");
  const bookingId = getStringValue(formData, "bookingId");

  if (!reportId || !bookingId) {
    throw new Error("Missing report or booking id.");
  }

  const report = await getReportWithBooking(reportId, bookingId);

  if (!report) {
    throw new Error("Report was not found.");
  }

  await prisma.$transaction([
    prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: BookingStatus.DISPUTED,
        disputedAt: report.booking.disputedAt ?? new Date(),
        disputeReason: report.booking.disputeReason ?? report.reason,
        disputeNote:
          report.booking.disputeNote ??
          "Kept under review by SkillDrop admin.",
      },
    }),

    prisma.bookingReport.update({
      where: {
        id: reportId,
      },
      data: {
        status: "OPEN",
      },
    }),
  ]);

  await safeSendNotification({
    to: report.booking.buyer.email,
    type: "BOOKING_DISPUTED",
    subject: "Booking still under review",
    message: `SkillDrop is still reviewing the report for "${
      report.booking.service?.title ?? "Booked call"
    }".`,
    metadata: {
      reportId,
      bookingId,
      expertId: report.booking.expertId,
      resolution: "kept_disputed",
    },
  });

  await safeSendNotification({
    to: report.booking.expert.user.email,
    type: "BOOKING_DISPUTED",
    subject: "Booking still under review",
    message: `SkillDrop is still reviewing the report for "${
      report.booking.service?.title ?? "Booked call"
    }".`,
    metadata: {
      reportId,
      bookingId,
      expertId: report.booking.expertId,
      resolution: "kept_disputed",
    },
  });

  await createAdminAuditLog({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "BOOKING_KEPT_DISPUTED",
    entityType: "Booking",
    entityId: bookingId,
    message: `Kept booking ${bookingId} under dispute review.`,
    metadata: {
      bookingId,
      reportId,
      expertId: report.booking.expertId,
      buyerId: report.booking.buyerId,
      reason: report.reason,
      status: BookingStatus.DISPUTED,
    },
  });

  revalidateDisputePaths(bookingId);
}

export async function markBookingRefundedManuallyAction(formData: FormData) {
  const { user: admin } = await requireRole(["admin"]);

  const reportId = getStringValue(formData, "reportId");
  const bookingId = getStringValue(formData, "bookingId");
  const resolution = getResolutionNote(
    formData,
    "Refund was issued manually in Stripe Dashboard and marked as refunded in SkillDrop.",
  );

  if (!reportId || !bookingId) {
    throw new Error("Missing report or booking id.");
  }

  const report = await getReportWithBooking(reportId, bookingId);

  if (!report) {
    throw new Error("Report was not found.");
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: BookingStatus.REFUNDED,
        refundedAt: now,
        expiresAt: null,
        disputeNote: resolution,
      },
    }),

    prisma.bookingReport.update({
      where: {
        id: reportId,
      },
      data: {
        status: "CLOSED",
        message: resolution,
      },
    }),
  ]);

  await safeSendNotification({
    to: report.booking.buyer.email,
    type: "BOOKING_REFUNDED",
    subject: "Booking refunded",
    message: `SkillDrop reviewed the report for "${
      report.booking.service?.title ?? "Booked call"
    }" and marked the booking as refunded. ${resolution}`,
    metadata: {
      reportId,
      bookingId,
      expertId: report.booking.expertId,
      resolution: "manual_refund",
      note: resolution,
    },
  });

  await safeSendNotification({
    to: report.booking.expert.user.email,
    type: "BOOKING_REFUNDED",
    subject: "Booking refunded",
    message: `SkillDrop reviewed the report for "${
      report.booking.service?.title ?? "Booked call"
    }" and marked the booking as refunded. ${resolution}`,
    metadata: {
      reportId,
      bookingId,
      expertId: report.booking.expertId,
      resolution: "manual_refund",
      note: resolution,
    },
  });

  await createAdminAuditLog({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "BOOKING_MARKED_REFUNDED_MANUALLY",
    entityType: "Booking",
    entityId: bookingId,
    message: `Marked booking ${bookingId} as manually refunded.`,
    metadata: {
      bookingId,
      reportId,
      expertId: report.booking.expertId,
      buyerId: report.booking.buyerId,
      previousStatus: report.booking.status,
      newStatus: BookingStatus.REFUNDED,
      note: resolution,
    },
  });

  revalidateDisputePaths(bookingId);
}