"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BookingStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function createBookingAction(formData: FormData) {
  const expertId = String(formData.get("expertId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const availabilityId = String(formData.get("availabilityId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!expertId || !serviceId || !availabilityId || !name || !email) {
    throw new Error("Missing required booking fields.");
  }

  const service = await prisma.service.findUnique({
    where: {
      id: serviceId,
    },
    include: {
      expert: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!service || service.expertId !== expertId || !service.isActive) {
    throw new Error("Service not found.");
  }

  const availability = await prisma.availability.findUnique({
    where: {
      id: availabilityId,
    },
  });

  if (!availability) {
    throw new Error("Availability slot not found.");
  }

  if (availability.expertId !== expertId) {
    throw new Error("This slot does not belong to the selected expert.");
  }

  if (availability.isBooked) {
    throw new Error("This slot is already booked.");
  }

  if (availability.startTime < new Date()) {
    throw new Error("This slot is in the past.");
  }

  let buyer = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!buyer) {
    buyer = await prisma.user.create({
      data: {
        id: `buyer_${randomUUID()}`,
        email,
        name,
        role: UserRole.BUYER,
      },
    });
  }

  const booking = await prisma.$transaction(async (tx) => {
    const freshSlot = await tx.availability.findUnique({
      where: {
        id: availabilityId,
      },
    });

    if (!freshSlot || freshSlot.isBooked) {
      throw new Error("This slot was just booked by someone else.");
    }

    const createdBooking = await tx.booking.create({
      data: {
        buyerId: buyer.id,
        expertId,
        serviceId,
        availabilityId,
        startTime: freshSlot.startTime,
        endTime: freshSlot.endTime,
        status: BookingStatus.PENDING,
        priceCents: service.priceCents,
        currency: service.currency,
      },
    });

    await tx.availability.update({
      where: {
        id: availabilityId,
      },
      data: {
        isBooked: true,
      },
    });

    return createdBooking;
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: booking.id,
    customer_email: email,
    success_url: `${appUrl}/dashboard/bookings/${booking.id}?payment=success`,
    cancel_url: `${appUrl}/dashboard/bookings/${booking.id}?payment=cancelled`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: service.currency.toLowerCase(),
          unit_amount: service.priceCents,
          product_data: {
            name: service.title,
            description: `${service.durationMinutes} min session with ${
              service.expert.user.name ?? "SkillDrop expert"
            }`,
          },
        },
      },
    ],
    metadata: {
      bookingId: booking.id,
      expertId,
      serviceId,
      availabilityId,
    },
  });

  if (!checkoutSession.url) {
    throw new Error("Failed to create Stripe Checkout session.");
  }

  await prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      stripeCheckoutSessionId: checkoutSession.id,
    },
  });

  redirect(checkoutSession.url);
}

export async function cancelBookingAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");

  if (!bookingId) {
    throw new Error("Booking ID is required.");
  }

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
  });

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (booking.status === BookingStatus.CANCELLED) {
    return;
  }

  if (booking.status === BookingStatus.COMPLETED) {
    throw new Error("Completed bookings cannot be cancelled.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status: BookingStatus.CANCELLED,
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

  revalidatePath(`/dashboard/bookings/${booking.id}`);
  revalidatePath("/dashboard/bookings");
  revalidatePath("/expert/availability");
  revalidatePath(`/experts/${booking.expertId}/book`);
}

export async function confirmBookingAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");

  if (!bookingId) {
    throw new Error("Booking ID is required.");
  }

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
  });

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (booking.status === BookingStatus.CANCELLED) {
    throw new Error("Cancelled bookings cannot be confirmed.");
  }

  if (booking.status === BookingStatus.COMPLETED) {
    throw new Error("Completed bookings cannot be confirmed again.");
  }

  await prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      status: BookingStatus.CONFIRMED,
    },
  });

  revalidatePath(`/dashboard/bookings/${booking.id}`);
  revalidatePath("/dashboard/bookings");
}

export async function completeBookingAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");

  if (!bookingId) {
    throw new Error("Booking ID is required.");
  }

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
  });

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (booking.status === BookingStatus.CANCELLED) {
    throw new Error("Cancelled bookings cannot be completed.");
  }

  if (booking.status === BookingStatus.PENDING) {
    throw new Error("Pending bookings should be confirmed before completion.");
  }

  if (booking.status === BookingStatus.COMPLETED) {
    return;
  }

  await prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      status: BookingStatus.COMPLETED,
    },
  });

  await prisma.expertProfile.update({
    where: {
      id: booking.expertId,
    },
    data: {
      totalSessions: {
        increment: 1,
      },
    },
  });

  revalidatePath(`/dashboard/bookings/${booking.id}`);
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/experts/${booking.expertId}`);
  revalidatePath("/experts");
}