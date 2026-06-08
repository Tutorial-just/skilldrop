"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import { sendReviewRequestEmail } from "@/lib/booking-emails";
import { refreshExpertVerification } from "@/lib/expert-verification";
import { trackProductEvent } from "@/lib/product-analytics";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/server/services/notification.service";
import {
  canJoinCall,
  completeBooking,
  createCallRoom,
  openCallRoom,
} from "@/server/services/booking.service";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getBookingsHref(role: string) {
  if (role === "ADMIN") return "/admin/bookings";
  if (role === "EXPERT") return "/expert/bookings";
  return "/buyer/bookings";
}

function getCompletedRedirectHref(role: string, bookingId: string) {
  if (role === "ADMIN") return "/admin/bookings?updated=1";
  return `/expert/bookings?completed=${bookingId}`;
}

function revalidateCallPaths(expertId: string, bookingId: string) {
  revalidatePath("/");
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

  revalidatePath("/experts");
  revalidatePath(`/experts/${expertId}`);
  revalidatePath(`/calls/${bookingId}`);

  revalidatePath("/notifications");
}

async function safeSendNotification(
  input: Parameters<typeof sendNotification>[0],
) {
  if (!input.to) return;

  try {
    await sendNotification(input);
  } catch (error) {
    console.error("Notification error:", error);
  }
}

export async function createOrOpenCallRoomAction(formData: FormData) {
  const { user } = await requireRole(["buyer", "expert", "admin"]);

  const bookingId = getStringValue(formData, "bookingId");

  if (!bookingId) {
    redirect("/buyer/bookings?error=booking-not-found");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
  });

  if (!currentUser) {
    redirect("/sign-in");
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
    redirect(getBookingsHref(currentUser.role));
  }

  const isBuyer = booking.buyerId === currentUser.id;
  const isExpert = booking.expert.userId === currentUser.id;
  const isAdmin = currentUser.role === "ADMIN";

  if (!isBuyer && !isExpert && !isAdmin) {
    redirect("/");
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    redirect(`${getBookingsHref(currentUser.role)}?error=call-not-confirmed`);
  }

  const joinAccess = canJoinCall(booking.startTime, booking.endTime);

  if (!isAdmin && !joinAccess.allowed) {
    const now = new Date();

    if (now < joinAccess.joinOpensAt) {
      redirect(`${getBookingsHref(currentUser.role)}?error=call-too-early`);
    }

    redirect(`${getBookingsHref(currentUser.role)}?error=call-ended`);
  }

  await prisma.$transaction(async (tx) => {
    await createCallRoom(tx, {
      id: booking.id,
      startTime: booking.startTime,
      endTime: booking.endTime,
    });

    await openCallRoom(tx, booking.id);
  });

  revalidateCallPaths(booking.expertId, booking.id);

  redirect(`/calls/${booking.id}`);
}

export async function markCallCompletedAction(formData: FormData) {
  const { user } = await requireRole(["expert", "admin"]);

  const bookingId = getStringValue(formData, "bookingId");

  if (!bookingId) {
    redirect("/expert/bookings?error=booking-not-found");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
  });

  if (!currentUser) {
    redirect("/sign-in");
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
    redirect(`${getBookingsHref(currentUser.role)}?error=booking-not-found`);
  }

  const isExpertOwner = booking.expert.userId === currentUser.id;
  const isAdmin = currentUser.role === "ADMIN";

  if (!isExpertOwner && !isAdmin) {
    redirect("/");
  }

  if (booking.status === BookingStatus.COMPLETED) {
    redirect(getCompletedRedirectHref(currentUser.role, booking.id));
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    redirect(`${getBookingsHref(currentUser.role)}?error=not-confirmed`);
  }

  const now = new Date();

  if (now < booking.endTime && !isAdmin) {
    redirect(`${getBookingsHref(currentUser.role)}?error=call-not-ended`);
  }

  const completed = await prisma.$transaction(async (tx) => {
    const updatedBooking = await completeBooking(tx, booking.id);
    return updatedBooking.status === BookingStatus.COMPLETED;
  });

  if (!completed) {
    redirect(getCompletedRedirectHref(currentUser.role, booking.id));
  }

  await safeSendNotification({
    to: booking.buyer.email,
    type: "REVIEW_REQUESTED",
    subject: "How was your SkillDrop call?",
    message: `Your call "${
      booking.service?.title ?? "Booked call"
    }" is complete. You can now leave a review to help other buyers choose with confidence.`,
    metadata: {
      bookingId: booking.id,
      expertId: booking.expertId,
      serviceId: booking.serviceId,
      serviceTitle: booking.service?.title ?? "Booked call",
    },
  });

  await safeSendNotification({
    to: booking.expert.user.email,
    type: "CALL_COMPLETED",
    subject: "Call marked as completed",
    message: `Your call "${
      booking.service?.title ?? "Booked call"
    }" was marked as completed. The buyer can now leave a review.`,
    metadata: {
      bookingId: booking.id,
      expertId: booking.expertId,
      serviceId: booking.serviceId,
      serviceTitle: booking.service?.title ?? "Booked call",
    },
  });

  await trackProductEvent({
    event: "CALL_COMPLETED",
    userId: currentUser.id,
    email: currentUser.email,
    entityType: "Booking",
    entityId: booking.id,
    metadata: {
      expertId: booking.expertId,
      buyerId: booking.buyerId,
      serviceId: booking.serviceId,
    },
  });

  await refreshExpertVerification(booking.expertId);

  if (booking.buyer.email && booking.expert.user.email) {
    await sendReviewRequestEmail({
      buyerEmail: booking.buyer.email,
      buyerName: booking.buyer.name,
      expertEmail: booking.expert.user.email,
      expertName: booking.expert.user.name,
      serviceTitle: booking.service?.title,
      bookingId: booking.id,
      startTime: booking.startTime,
      endTime: booking.endTime,
    });
  }

  revalidateCallPaths(booking.expertId, booking.id);

  redirect(getCompletedRedirectHref(currentUser.role, booking.id));
}