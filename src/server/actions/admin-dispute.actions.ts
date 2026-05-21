"use server";

import { revalidatePath } from "next/cache";
import { BookingStatus, UserRole } from "@prisma/client";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export async function closeBookingReportAction(formData: FormData) {
  await requireRole(["admin"]);

  const reportId = String(formData.get("reportId") ?? "");
  const bookingId = String(formData.get("bookingId") ?? "");
  const resolution = String(formData.get("resolution") ?? "");

  if (!reportId || !bookingId) {
    throw new Error("Missing report or booking id.");
  }

  await prisma.bookingReport.update({
    where: {
      id: reportId,
    },
    data: {
      status: "CLOSED",
      message: resolution.trim().length > 0 ? resolution.trim() : undefined,
    },
  });

  revalidatePath("/admin/disputes");
  revalidatePath("/admin/bookings");
  revalidatePath("/buyer/bookings");
  revalidatePath("/expert/bookings");
}

export async function resolveBookingAsCompletedAction(formData: FormData) {
  await requireRole(["admin"]);

  const reportId = String(formData.get("reportId") ?? "");
  const bookingId = String(formData.get("bookingId") ?? "");

  if (!reportId || !bookingId) {
    throw new Error("Missing report or booking id.");
  }

  await prisma.$transaction([
    prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: BookingStatus.COMPLETED,
        completedAt: new Date(),
      },
    }),

    prisma.bookingReport.update({
      where: {
        id: reportId,
      },
      data: {
        status: "CLOSED",
      },
    }),
  ]);

  revalidatePath("/admin/disputes");
  revalidatePath("/admin/bookings");
  revalidatePath("/buyer/bookings");
  revalidatePath("/expert/bookings");
}

export async function keepBookingDisputedAction(formData: FormData) {
  await requireRole(["admin"]);

  const reportId = String(formData.get("reportId") ?? "");
  const bookingId = String(formData.get("bookingId") ?? "");

  if (!reportId || !bookingId) {
    throw new Error("Missing report or booking id.");
  }

  await prisma.$transaction([
    prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: BookingStatus.DISPUTED,
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

  revalidatePath("/admin/disputes");
  revalidatePath("/admin/bookings");
  revalidatePath("/buyer/bookings");
  revalidatePath("/expert/bookings");
}