"use server";

import { redirect } from "next/navigation";

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/get-current-user";

const PLATFORM_FEE_RATE = 0.05;

export async function createCheckoutSessionAction(bookingId: string) {
  const { user } = await requireRole(["buyer"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is missing.");
  }

  const buyer = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!buyer) {
    redirect("/sign-in");
  }

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      buyerId: buyer.id,
      status: "PENDING",
    },
    include: {
      expert: {
        include: {
          user: true,
        },
      },
      service: true,
    },
  });

  if (!booking) {
    redirect("/buyer/bookings");
  }

  if (booking.expiresAt && booking.expiresAt < new Date()) {
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

    redirect("/buyer/bookings?payment=expired");
  }

  if (!booking.expert.stripeAccountId) {
    redirect(`/buyer/bookings/${booking.id}/checkout?error=expert-payout-not-ready`);
  }

  const platformFeeCents = Math.round(booking.priceCents * PLATFORM_FEE_RATE);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",

    payment_method_types: ["card"],

    customer_email: buyer.email,

    line_items: [
      {
        price_data: {
          currency: booking.currency.toLowerCase(),
          product_data: {
            name: booking.service?.title ?? "SkillDrop consultation",
            description: `Call with ${booking.expert.user.name ?? "Expert"}`,
          },
          unit_amount: booking.priceCents,
        },
        quantity: 1,
      },
    ],

    payment_intent_data: {
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: booking.expert.stripeAccountId,
      },
      metadata: {
        bookingId: booking.id,
        buyerId: buyer.id,
        expertId: booking.expertId,
        platformFeeCents: String(platformFeeCents),
      },
    },

    success_url: `${appUrl}/buyer/bookings?payment=success`,
    cancel_url: `${appUrl}/buyer/bookings/${booking.id}/checkout`,

    metadata: {
      bookingId: booking.id,
      buyerId: buyer.id,
      expertId: booking.expertId,
      platformFeeCents: String(platformFeeCents),
    },
  });

  await prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      stripeCheckoutSessionId: session.id,
    },
  });

  redirect(session.url!);
}