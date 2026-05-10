"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/get-current-user";
import {
  assertRateLimit,
  getClientIp,
  rateLimitPresets,
} from "@/lib/rate-limit";
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

  revalidatePath("/admin");
  revalidatePath("/admin/bookings");

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
        status: "EXPIRED",
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

function getBookingPricing(booking: {
  priceCents: number;
  currency: string;
  platformFeeCents: number | null;
  providerNetCents: number | null;
  clientServiceFeeCents: number | null;
  clientTotalCents: number | null;
}) {
  const fallback = calculatePricingBreakdown(booking.priceCents);

  const providerCommissionCents =
    booking.platformFeeCents ?? fallback.providerCommissionCents;

  const providerNetCents =
    booking.providerNetCents ?? fallback.providerNetCents;

  const clientServiceFeeCents =
    booking.clientServiceFeeCents ?? fallback.clientServiceFeeCents;

  const clientTotalCents =
    booking.clientTotalCents ?? fallback.clientTotalCents;

  const platformGrossFeeCents =
    providerCommissionCents + clientServiceFeeCents;

  return {
    servicePriceCents: booking.priceCents,
    providerCommissionCents,
    providerNetCents,
    clientServiceFeeCents,
    clientTotalCents,
    platformFeeCents: providerCommissionCents,
    platformGrossFeeCents,
    currency: booking.currency || fallback.currency,
  };
}

export async function createCheckoutSessionAction(bookingId: string) {
  const { user } = await requireRole(["buyer", "admin"]);

  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);

  assertRateLimit(`checkout:${user.id}:${ip}`, rateLimitPresets.payment);

  const appUrl = getAppUrl();

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      buyerId: user.id,
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

  if (booking.stripeCheckoutSessionId) {
    try {
      const existingSession = await stripe.checkout.sessions.retrieve(
        booking.stripeCheckoutSessionId,
      );

      if (existingSession.status === "open" && existingSession.url) {
        redirect(existingSession.url);
      }
    } catch {
      // If Stripe session cannot be retrieved, create a fresh one below.
    }
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

  if (connectedAccount.deleted) {
    redirect(getCheckoutHref(booking.id, "provider-payout-not-ready"));
  }

  if (!connectedAccount.charges_enabled || !connectedAccount.payouts_enabled) {
    await prisma.expertProfile.update({
      where: {
        id: booking.expertId,
      },
      data: {
        stripeChargesEnabled: Boolean(connectedAccount.charges_enabled),
        stripePayoutsEnabled: Boolean(connectedAccount.payouts_enabled),
        stripeDetailsSubmitted: Boolean(connectedAccount.details_submitted),
      },
    });

    redirect(getCheckoutHref(booking.id, "provider-payout-not-ready"));
  }

  await prisma.expertProfile.update({
    where: {
      id: booking.expertId,
    },
    data: {
      stripeChargesEnabled: Boolean(connectedAccount.charges_enabled),
      stripePayoutsEnabled: Boolean(connectedAccount.payouts_enabled),
      stripeDetailsSubmitted: Boolean(connectedAccount.details_submitted),
      stripeOnboardingDoneAt: connectedAccount.details_submitted
        ? new Date()
        : null,
    },
  });

  const pricing = getBookingPricing(booking);

  if (pricing.clientTotalCents <= 0) {
    redirect(getCheckoutHref(booking.id, "invalid-price"));
  }

  const providerName = booking.expert.user.name ?? "Provider";
  const serviceTitle = booking.service?.title ?? "SkillDrop call";
  const currency = pricing.currency.toLowerCase();

  const stripeMetadata = {
    bookingId: booking.id,
    buyerId: user.id,
    expertId: booking.expertId,
    serviceId: booking.serviceId,

    servicePriceCents: String(pricing.servicePriceCents),
    providerCommissionCents: String(pricing.providerCommissionCents),
    providerNetCents: String(pricing.providerNetCents),
    clientServiceFeeCents: String(pricing.clientServiceFeeCents),
    clientTotalCents: String(pricing.clientTotalCents),
    platformFeeCents: String(pricing.platformFeeCents),
    platformGrossFeeCents: String(pricing.platformGrossFeeCents),

    currency,
  };

  let session;

  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: user.email,

        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: serviceTitle,
                description: `Call with ${providerName}`,
                metadata: {
                  bookingId: booking.id,
                  expertId: booking.expertId,
                },
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
          metadata: stripeMetadata,
        },

        success_url: `${appUrl}/buyer/bookings?payment=success&booking=${booking.id}`,
        cancel_url: `${appUrl}${getCheckoutHref(booking.id)}`,

        metadata: stripeMetadata,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      },
      {
        idempotencyKey: `checkout:${booking.id}:${booking.updatedAt.getTime()}`,
      },
    );
  } catch (error) {
    console.error("Stripe checkout session error:", error);

    redirect(getCheckoutHref(booking.id, "checkout-session-failed"));
  }

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