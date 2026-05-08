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

function getAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is missing.");
  }

  return appUrl.replace(/\/$/, "");
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
  revalidatePath("/expert/settings");
  revalidatePath("/expert/stats");

  revalidatePath("/notifications");
}

function revalidateExpertPayoutPaths(expertId: string) {
  revalidatePath("/");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expertId}`);

  revalidatePath("/expert");
  revalidatePath("/expert/earnings");
  revalidatePath("/expert/settings");
  revalidatePath("/expert/stats");
}

async function getCurrentExpertProfileForPayments() {
  const { user } = await requireRole(["expert", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const expert = await prisma.expertProfile.findFirst({
    where: {
      user: {
        email,
      },
    },
    include: {
      user: true,
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  return expert;
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

export async function createStripeConnectAccountAction() {
  const expert = await getCurrentExpertProfileForPayments();
  const appUrl = getAppUrl();

  let stripeAccountId = expert.stripeAccountId;

  if (stripeAccountId) {
    try {
      await stripe.accounts.retrieve(stripeAccountId);
    } catch {
      stripeAccountId = null;
    }
  }

  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "FR",
      email: expert.user.email,
      business_type: "individual",
      capabilities: {
        card_payments: {
          requested: true,
        },
        transfers: {
          requested: true,
        },
      },
      metadata: {
        expertId: expert.id,
        userId: expert.userId,
        userEmail: expert.user.email,
      },
    });

    stripeAccountId = account.id;

    await prisma.expertProfile.update({
      where: {
        id: expert.id,
      },
      data: {
        stripeAccountId,
      },
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${appUrl}/expert/settings?stripe=refresh`,
    return_url: `${appUrl}/expert/settings?stripe=return`,
    type: "account_onboarding",
  });

  revalidateExpertPayoutPaths(expert.id);

  redirect(accountLink.url);
}

export async function createStripeConnectDashboardAction() {
  const expert = await getCurrentExpertProfileForPayments();

  if (!expert.stripeAccountId) {
    redirect("/expert/settings?error=stripe-account-missing");
  }

  try {
    const loginLink = await stripe.accounts.createLoginLink(
      expert.stripeAccountId,
    );

    redirect(loginLink.url);
  } catch {
    redirect("/expert/settings?error=stripe-dashboard-unavailable");
  }
}

export async function refreshStripeConnectStatusAction() {
  const expert = await getCurrentExpertProfileForPayments();

  if (!expert.stripeAccountId) {
    redirect("/expert/settings?error=stripe-account-missing");
  }

  try {
    await stripe.accounts.retrieve(expert.stripeAccountId);
  } catch {
    await prisma.expertProfile.update({
      where: {
        id: expert.id,
      },
      data: {
        stripeAccountId: null,
      },
    });

    revalidateExpertPayoutPaths(expert.id);

    redirect("/expert/settings?error=stripe-account-invalid");
  }

  revalidateExpertPayoutPaths(expert.id);

  redirect("/expert/settings?stripe=checked");
}

export async function createCheckoutSessionAction(bookingId: string) {
  const { user } = await requireRole(["buyer", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const appUrl = getAppUrl();

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