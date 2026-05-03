"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function createCallRoomData(bookingId: string) {
  const provider = process.env.VIDEO_PROVIDER || "JITSI";
  const baseUrl = process.env.JITSI_BASE_URL || "https://meet.jit.si";
  const roomName = `skilldrop-${bookingId}-${randomUUID()}`;
  const roomUrl = `${baseUrl}/${roomName}`;

  return {
    provider,
    roomName,
    roomUrl,
  };
}

export async function createBookingAction(formData: FormData) {
  const { user } = await requireRole(["buyer", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const expertId = getStringValue(formData, "expertId");
  const serviceId = getStringValue(formData, "serviceId");
  const availabilityId = getStringValue(formData, "availabilityId");

  if (!expertId || !serviceId || !availabilityId) {
    redirect(`/experts/${expertId || ""}?error=missing-booking-data`);
  }

  const buyer = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!buyer) {
    redirect("/sign-in");
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
    redirect("/experts?error=expert-not-found");
  }

  if (expert.userId === buyer.id) {
    redirect(`/experts/${expertId}?error=cannot-book-yourself`);
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
    redirect(`/experts/${expertId}?service=${serviceId}&error=slot-not-available`);
  }

  const booking = await prisma.$transaction(async (tx) => {
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
      throw new Error("Slot is no longer available.");
    }

    const createdBooking = await tx.booking.create({
      data: {
        buyerId: buyer.id,
        expertId,
        serviceId,
        availabilityId,
        startTime: availability.startTime,
        endTime: availability.endTime,
        priceCents: service.priceCents,
        currency: service.currency,
        status: "CONFIRMED",
      },
    });

    const room = createCallRoomData(createdBooking.id);

    await tx.callRoom.create({
      data: {
        bookingId: createdBooking.id,
        provider: room.provider,
        roomName: room.roomName,
        roomUrl: room.roomUrl,
        startsAt: createdBooking.startTime,
        endsAt: createdBooking.endTime,
      },
    });

    return createdBooking;
  });

  revalidatePath(`/experts/${expertId}`);
  revalidatePath("/experts");
  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath("/buyer/reviews");
  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/availability");
  revalidatePath("/expert/stats");

  redirect(`/buyer/bookings?booked=${booking.id}`);
}

export async function cancelBookingAction(formData: FormData) {
  const { user } = await requireRole(["buyer", "expert", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const bookingId = getStringValue(formData, "bookingId");

  if (!bookingId) {
    redirect("/");
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
      expert: true,
    },
  });

  if (!booking) {
    redirect("/buyer/bookings");
  }

  const isBuyer = booking.buyerId === currentUser.id;
  const isExpert = booking.expert.userId === currentUser.id;
  const isAdmin = currentUser.role === "ADMIN";

  if (!isBuyer && !isExpert && !isAdmin) {
    redirect("/");
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status: "CANCELLED",
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

  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath("/buyer/reviews");
  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/availability");
  revalidatePath("/expert/stats");
  revalidatePath(`/experts/${booking.expertId}`);

  if (isExpert) {
    redirect("/expert/bookings");
  }

  redirect("/buyer/bookings");
}

export async function updateBookingStatusAction(formData: FormData) {
  const { user } = await requireRole(["expert", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const bookingId = getStringValue(formData, "bookingId");
  const status = getStringValue(formData, "status");

  if (!bookingId || !status) {
    redirect("/expert/bookings");
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
      expert: true,
      callRoom: true,
    },
  });

  if (!booking) {
    redirect("/expert/bookings");
  }

  const isOwnerExpert = booking.expert.userId === currentUser.id;
  const isAdmin = currentUser.role === "ADMIN";

  if (!isOwnerExpert && !isAdmin) {
    redirect("/expert/bookings");
  }

  const allowedStatuses = [
    "PENDING",
    "PAID",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
    "REFUNDED",
    "DISPUTED",
  ];

  if (!allowedStatuses.includes(status)) {
    redirect("/expert/bookings");
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

    if (status === "CANCELLED" && booking.availabilityId) {
      await tx.availability.update({
        where: {
          id: booking.availabilityId,
        },
        data: {
          isBooked: false,
        },
      });
    }

    if (status === "COMPLETED" && booking.status !== "COMPLETED") {
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

      if (booking.callRoom) {
        await tx.callRoom.update({
          where: {
            bookingId: booking.id,
          },
          data: {
            status: "ENDED",
            endsAt: new Date(),
          },
        });
      }
    }
  });

  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/stats");
  revalidatePath("/expert/availability");
  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath("/buyer/reviews");
  revalidatePath(`/experts/${booking.expertId}`);

  redirect("/expert/bookings");
}