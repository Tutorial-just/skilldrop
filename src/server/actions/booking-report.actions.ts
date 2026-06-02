"use server";

import { revalidatePath } from "next/cache";
import { BookingStatus, UserRole } from "@prisma/client";
import { sendDisputeCreatedEmail } from "@/lib/booking-emails";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

const ALLOWED_REASONS = [
  "EXPERT_NO_SHOW",
  "BUYER_NO_SHOW",
  "CALL_QUALITY_PROBLEM",
  "WRONG_SERVICE",
  "ABUSIVE_BEHAVIOR",
  "REFUND_REQUEST",
  "OTHER",
];

type ReportBookingState = {
  ok: boolean;
  message: string;
};

export async function reportBookingAction(
  bookingId: string,
  _previousState: ReportBookingState,
  formData: FormData,
): Promise<ReportBookingState> {
  const { user } = await requireRole(["buyer", "expert", "admin"]);

  const reason = String(formData.get("reason") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!ALLOWED_REASONS.includes(reason)) {
    return {
      ok: false,
      message: "Please select a valid reason.",
    };
  }

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    select: {
      id: true,
      buyerId: true,
      expertId: true,
      status: true,
      expert: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!booking) {
    return {
      ok: false,
      message: "Booking not found.",
    };
  }

  const isBuyer = booking.buyerId === user.id;
  const isExpert = booking.expert.userId === user.id;
  const isAdmin = user.role === UserRole.ADMIN;

  if (!isBuyer && !isExpert && !isAdmin) {
    return {
      ok: false,
      message: "You are not allowed to report this booking.",
    };
  }

  await prisma.$transaction([
    prisma.bookingReport.create({
      data: {
        bookingId: booking.id,
        reporterId: user.id,
        reason,
        message: message.length > 0 ? message : null,
      },
    }),

    prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status: BookingStatus.DISPUTED,
      },
    }),
  ]);

  await sendDisputeCreatedEmail({
    adminEmail: process.env.ADMIN_EMAIL,
    bookingId: booking.id,
    reason,
    message: message.length > 0 ? message : null,
  });

  revalidatePath("/buyer/bookings");
  revalidatePath("/expert/bookings");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/disputes");

  return {
    ok: true,
    message: "Problem reported. SkillDrop will review this booking.",
  };
}