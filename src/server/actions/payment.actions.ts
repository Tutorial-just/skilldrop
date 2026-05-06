"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/get-current-user";
import { calculatePricingBreakdown } from "@/config/pricing";

function getCheckoutHref(bookingId: string, error?: string) {
  if (!error) {
    return `/buyer/bookings/${bookingId}/checkout`;
  }

  return `/buyer/bookings/${bookingId}/checkout?error=${encodeURIComponent(
    error,
  )}`;
}

function revalidatePaymentPaths(expertId: string, bookingId: string) {
  revalidatePath("/");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expertId}`);

  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath(`/buyer/bookings/${bookingId}/checkout`);

  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/availability");
  revalidatePath("/expert/earnings");
  revalidatePath("/expert/stats");

  revalidatePath("/notifications");
}

async function cancelExpiredPendingBooking({
  bookingId,
  expertId,
  availabilityId,
  hasCallRoom,
}: {
  bookingId: string;
  expertId: string;
  availabilityId: string | null;
  hasCallRoom: boolean;
}) {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.updateMany({
      where: {
        id: bookingId,
        status: "PENDING",
      },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        expiresAt: null,
      },
    });

    if (updatedBooking.count === 0) {
      return;
    }

    if (availabilityId) {
      await tx.availability.updateMany({
        where: {
          id: availabilityId,
        },
        data: {
          isBooked: false,
        },
      });
    }

    if (hasCallRoom) {
      await tx.callRoom.updateMany({
        where: {
          bookingId,
        },
        data: {
          status: "ENDED",
          endsAt: now,
        },
      });
    }
  });

  revalidatePaymentPaths(expertId, bookingId);
}

export async function createCheckoutSessionAction(bookingId: string) {
  const { user } = await requireRole(["buyer", "admin"]);

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
      callRoom: true,
    },
  });

  if (!booking) {
    redirect("/buyer/bookings?error=booking-not-found");
  }

  const now = new Date();

  if (booking.expiresAt && booking.expiresAt < now) {
    await cancelExpiredPendingBooking({
      bookingId: booking.id,
      expertId: booking.expertId,
      availabilityId: booking.availabilityId,
      hasCallRoom: Boolean(booking.callRoom),
    });

    redirect("/buyer/bookings?error=booking-expired");
  }

  const stripeAccountId = booking.expert.stripeAccountId;

  if (!stripeAccountId) {
    redirect(getCheckoutHref(booking.id, "provider-payout-not-ready"));
  }

  let connectedAccount;

  try {
    connectedAccount = await stripe.accounts.retrieve(stripeAccountId);
  } catch {
    redirect(getCheckoutHref(booking.id, "provider-payout-not-ready"));
  }

  if (!connectedAccount.charges_enabled || !connectedAccount.payouts_enabled) {
    redirect(getCheckoutHref(booking.id, "provider-payout-not-ready"));
  }

  const pricing = calculatePricingBreakdown(booking.priceCents);

  const providerName = booking.expert.user.name ?? "Provider";
  const serviceTitle = booking.service?.title ?? "SkillDrop call";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",

    payment_method_types: ["card"],

    customer_email: buyer.email,

    line_items: [
      {
        price_data: {
          currency: booking.currency.toLowerCase(),
          product_data: {
            name: serviceTitle,
            description: `Call with ${providerName}`,
          },
          unit_amount: pricing.clientTotalCents,
        },
        quantity: 1,
      },
    ],

    payment_intent_data: {
      application_fee_amount: pricing.platformGrossFeeCents,
      transfer_data: {
        destination: stripeAccountId,
      },
      metadata: {
        bookingId: booking.id,
        buyerId: buyer.id,
        expertId: booking.expertId,
        servicePriceCents: String(pricing.servicePriceCents),
        providerCommissionCents: String(pricing.providerCommissionCents),
        platformFeeCents: String(pricing.platformFeeCents),
        clientServiceFeeCents: String(pricing.clientServiceFeeCents),
        providerNetCents: String(pricing.providerNetCents),
        clientTotalCents: String(pricing.clientTotalCents),
        platformGrossFeeCents: String(pricing.platformGrossFeeCents),
      },
    },

    success_url: `${appUrl}/buyer/bookings?payment=success&booking=${booking.id}`,
    cancel_url: `${appUrl}${getCheckoutHref(booking.id)}`,

    metadata: {
      bookingId: booking.id,
      buyerId: buyer.id,
      expertId: booking.expertId,
      servicePriceCents: String(pricing.servicePriceCents),
      platformFeeCents: String(pricing.platformFeeCents),
      clientServiceFeeCents: String(pricing.clientServiceFeeCents),
      providerNetCents: String(pricing.providerNetCents),
      clientTotalCents: String(pricing.clientTotalCents),
      platformGrossFeeCents: String(pricing.platformGrossFeeCents),
    },
  });

  if (!session.url) {
    redirect(getCheckoutHref(booking.id, "checkout-session-failed"));
  }

  await prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: {
      stripeCheckoutSessionId: session.id,
      platformFeeCents: pricing.providerCommissionCents,
      providerNetCents: pricing.providerNetCents,
      clientServiceFeeCents: pricing.clientServiceFeeCents,
      clientTotalCents: pricing.clientTotalCents,
    },
  });

  revalidatePaymentPaths(booking.expertId, booking.id);

  redirect(session.url);
}