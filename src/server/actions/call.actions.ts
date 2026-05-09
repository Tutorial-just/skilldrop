"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

function createSafeRoomName(bookingId: string) {
  return `skilldrop-${bookingId}`.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
}

function createCallRoomData(bookingId: string) {
  const roomName = createSafeRoomName(bookingId);
  const baseUrl = process.env.JITSI_BASE_URL || "https://meet.jit.si";

  return {
    provider: process.env.VIDEO_PROVIDER || "JITSI",
    roomName,
    roomUrl: `${baseUrl}/${roomName}`,
  };
}

function getBookingsHref(role: string) {
  if (role === "ADMIN") {
    return "/admin/bookings";
  }

  if (role === "EXPERT") {
    return "/expert/bookings";
  }

  return "/buyer/bookings";
}

function getCompletedRedirectHref(role: string, bookingId: string) {
  if (role === "ADMIN") {
    return "/admin/bookings?updated=1";
  }

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

export async function createOrOpenCallRoomAction(formData: FormData) {
  const { user } = await requireRole(["buyer", "expert", "admin"]);

  const email = user.email?.toLowerCase();
  const bookingId = getStringValue(formData, "bookingId");

  if (!email) {
    redirect("/sign-in");
  }

  if (!bookingId) {
    redirect("/buyer/bookings?error=booking-not-found");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      email,
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

  if (booking.status !== "CONFIRMED") {
    redirect(`${getBookingsHref(currentUser.role)}?error=call-not-confirmed`);
  }

  if (!booking.callRoom) {
    const room = createCallRoomData(booking.id);

    await prisma.callRoom.create({
      data: {
        bookingId: booking.id,
        provider: room.provider,
        roomName: room.roomName,
        roomUrl: room.roomUrl,
        startsAt: booking.startTime,
        endsAt: booking.endTime,
      },
    });

    revalidateCallPaths(booking.expertId, booking.id);
  }

  redirect(`/calls/${booking.id}`);
}

export async function markCallCompletedAction(formData: FormData) {
  const { user } = await requireRole(["expert", "admin"]);

  const email = user.email?.toLowerCase();
  const bookingId = getStringValue(formData, "bookingId");

  if (!email) {
    redirect("/sign-in");
  }

  if (!bookingId) {
    redirect("/expert/bookings?error=booking-not-found");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      email,
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

  if (booking.status === "COMPLETED") {
    redirect(getCompletedRedirectHref(currentUser.role, booking.id));
  }

  if (booking.status !== "CONFIRMED") {
    redirect(`/calls/${booking.id}?error=not-confirmed`);
  }

  const now = new Date();

  if (now < booking.endTime && !isAdmin) {
    redirect(`/calls/${booking.id}?error=call-not-ended`);
  }

  const completed = await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.updateMany({
      where: {
        id: booking.id,
        status: "CONFIRMED",
      },
      data: {
        status: "COMPLETED",
        completedAt: now,
      },
    });

    if (updatedBooking.count === 0) {
      return false;
    }

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
        },
      });
    }

    await tx.callRoom.updateMany({
      where: {
        bookingId: booking.id,
      },
      data: {
        status: "ENDED",
        endsAt: now,
      },
    });

    return true;
  });

  if (!completed) {
    redirect(getCompletedRedirectHref(currentUser.role, booking.id));
  }

  await sendNotification({
    to: booking.buyer.email,
    type: "REVIEW_REQUESTED",
    subject: "How was your SkillDrop call?",
    message: `Your call "${
      booking.service?.title ?? "Booked call"
    }" is completed. You can now leave a review.`,
    metadata: {
      bookingId: booking.id,
      expertId: booking.expertId,
      serviceTitle: booking.service?.title ?? "Booked call",
    },
  });

  await sendNotification({
    to: booking.expert.user.email,
    type: "CALL_COMPLETED",
    subject: "Call marked as completed",
    message: `Your call "${
      booking.service?.title ?? "Booked call"
    }" was marked as completed.`,
    metadata: {
      bookingId: booking.id,
      expertId: booking.expertId,
      serviceTitle: booking.service?.title ?? "Booked call",
    },
  });

  revalidateCallPaths(booking.expertId, booking.id);

  redirect(getCompletedRedirectHref(currentUser.role, booking.id));
}