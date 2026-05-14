import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendNotification } from "@/server/services/notification.service";
import { calculatePricingBreakdown } from "@/config/pricing";

export const runtime = "nodejs";

type ConfirmedBookingData = {
  id: string;
  expertId: string;
  buyerEmail: string | null;
  expertEmail: string | null;
  buyerName: string;
  serviceTitle: string;
  startTime: Date;
  endTime: Date;
  note: string | null;
  servicePriceCents: number;
  providerCommissionCents: number;
  providerNetCents: number;
  clientServiceFeeCents: number;
  clientTotalCents: number;
  platformGrossFeeCents: number;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
};

type FailedBookingData = {
  id: string;
  expertId: string;
  availabilityId: string | null;
  buyerEmail: string | null;
  expertEmail: string | null;
  serviceTitle: string;
};

type RefundedBookingData = {
  id: string;
  expertId: string;
  availabilityId: string | null;
  buyerEmail: string | null;
  expertEmail: string | null;
  serviceTitle: string;
};

type ExpiredBookingData = {
  id: string;
  expertId: string;
  availabilityId: string | null;
  buyerEmail: string | null;
  expertEmail: string | null;
  serviceTitle: string;
};

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  if (!session.payment_intent) {
    return null;
  }

  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }

  return session.payment_intent.id;
}

function getPaymentIntentIdFromCharge(charge: Stripe.Charge) {
  if (!charge.payment_intent) {
    return null;
  }

  if (typeof charge.payment_intent === "string") {
    return charge.payment_intent;
  }

  return charge.payment_intent.id;
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

function revalidateWebhookPaths(expertId: string, bookingId: string) {
  revalidatePath("/");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expertId}`);

  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath(`/buyer/bookings/${bookingId}/checkout`);
  revalidatePath(`/calls/${bookingId}`);

  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/availability");
  revalidatePath("/expert/earnings");
  revalidatePath("/expert/stats");

  revalidatePath("/admin");
  revalidatePath("/admin/bookings");

  revalidatePath("/notifications");
}

async function markStripeEventProcessed(eventId: string) {
  await prisma.stripeEvent.update({
    where: {
      id: eventId,
    },
    data: {
      processed: true,
    },
  });
}

async function safeSendNotification(
  input: Parameters<typeof sendNotification>[0],
) {
  if (!input.to) {
    return;
  }

  try {
    await sendNotification(input);
  } catch (error) {
    console.error("Notification error:", error);
  }
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getDisplayName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email.split("@")[0] || "Buyer";
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

async function handleCheckoutSessionPaid({
  eventId,
  session,
}: {
  eventId: string;
  session: Stripe.Checkout.Session;
}) {
  const bookingId = session.metadata?.bookingId;

  if (!bookingId) {
    await markStripeEventProcessed(eventId);
    return null;
  }

  if (session.payment_status !== "paid") {
    await markStripeEventProcessed(eventId);
    return null;
  }

  const paymentIntentId = getPaymentIntentId(session);
  const stripeAmountTotal = session.amount_total;

  const confirmedBooking = await prisma.$transaction(
    async (tx): Promise<ConfirmedBookingData | null> => {
      const booking = await tx.booking.findUnique({
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
        await tx.stripeEvent.update({
          where: {
            id: eventId,
          },
          data: {
            processed: true,
          },
        });

        return null;
      }

      const pricing = getBookingPricing(booking);

      if (
        typeof stripeAmountTotal === "number" &&
        stripeAmountTotal !== pricing.clientTotalCents
      ) {
        await tx.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            status: "DISPUTED",
            disputedAt: new Date(),
            disputeReason: "PAYMENT_AMOUNT_MISMATCH",
            disputeNote: `Stripe amount_total ${stripeAmountTotal} does not match expected clientTotalCents ${pricing.clientTotalCents}.`,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: paymentIntentId,
            expiresAt: null,
          },
        });

        await tx.stripeEvent.update({
          where: {
            id: eventId,
          },
          data: {
            processed: true,
          },
        });

        return null;
      }

      if (booking.status === "CONFIRMED") {
        await tx.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: paymentIntentId,
            clientServiceFeeCents: pricing.clientServiceFeeCents,
            clientTotalCents: pricing.clientTotalCents,
            platformFeeCents: pricing.providerCommissionCents,
            providerNetCents: pricing.providerNetCents,
            expiresAt: null,
          },
        });

        if (!booking.callRoom) {
          const room = createCallRoomData(booking.id);

          await tx.callRoom.create({
            data: {
              bookingId: booking.id,
              provider: room.provider,
              roomName: room.roomName,
              roomUrl: room.roomUrl,
              startsAt: booking.startTime,
              endsAt: booking.endTime,
            },
          });
        }

        await tx.stripeEvent.update({
          where: {
            id: eventId,
          },
          data: {
            processed: true,
          },
        });

        return null;
      }

      if (booking.status !== "PENDING" && booking.status !== "PAID") {
        await tx.stripeEvent.update({
          where: {
            id: eventId,
          },
          data: {
            processed: true,
          },
        });

        return null;
      }

      const now = new Date();

      const updatedBooking = await tx.booking.updateMany({
        where: {
          id: booking.id,
          status: {
            in: ["PENDING", "PAID"],
          },
        },
        data: {
          status: "CONFIRMED",
          paidAt: booking.paidAt ?? now,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          platformFeeCents: pricing.providerCommissionCents,
          providerNetCents: pricing.providerNetCents,
          clientServiceFeeCents: pricing.clientServiceFeeCents,
          clientTotalCents: pricing.clientTotalCents,
          expiresAt: null,
        },
      });

      if (updatedBooking.count === 0) {
        await tx.stripeEvent.update({
          where: {
            id: eventId,
          },
          data: {
            processed: true,
          },
        });

        return null;
      }

      if (!booking.callRoom) {
        const room = createCallRoomData(booking.id);

        await tx.callRoom.create({
          data: {
            bookingId: booking.id,
            provider: room.provider,
            roomName: room.roomName,
            roomUrl: room.roomUrl,
            startsAt: booking.startTime,
            endsAt: booking.endTime,
          },
        });
      }

      await tx.stripeEvent.update({
        where: {
          id: eventId,
        },
        data: {
          processed: true,
        },
      });

      return {
        id: booking.id,
        expertId: booking.expertId,
        buyerEmail: booking.buyer.email,
        expertEmail: booking.expert.user.email,
        buyerName: getDisplayName(booking.buyer),
        serviceTitle: booking.service?.title ?? "Booked call",
        startTime: booking.startTime,
        endTime: booking.endTime,
        note: booking.note,
        servicePriceCents: pricing.servicePriceCents,
        providerCommissionCents: pricing.providerCommissionCents,
        providerNetCents: pricing.providerNetCents,
        clientServiceFeeCents: pricing.clientServiceFeeCents,
        clientTotalCents: pricing.clientTotalCents,
        platformGrossFeeCents: pricing.platformGrossFeeCents,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
      };
    },
  );

  if (!confirmedBooking) {
    return null;
  }

  await safeSendNotification({
    to: confirmedBooking.buyerEmail,
    type: "PAYMENT_CONFIRMED",
    subject: "Your call is confirmed",
    message: `Your payment was received and your call "${confirmedBooking.serviceTitle}" is confirmed.`,
    metadata: {
      bookingId: confirmedBooking.id,
      expertId: confirmedBooking.expertId,
      serviceTitle: confirmedBooking.serviceTitle,
      startTime: confirmedBooking.startTime.toISOString(),
      endTime: confirmedBooking.endTime.toISOString(),
      note: confirmedBooking.note,
      servicePriceCents: confirmedBooking.servicePriceCents,
      clientServiceFeeCents: confirmedBooking.clientServiceFeeCents,
      clientTotalCents: confirmedBooking.clientTotalCents,
      stripeCheckoutSessionId: confirmedBooking.stripeCheckoutSessionId,
      stripePaymentIntentId: confirmedBooking.stripePaymentIntentId,
    },
  });

  await safeSendNotification({
    to: confirmedBooking.expertEmail,
    type: "PAYMENT_CONFIRMED",
    subject: "New confirmed booking",
    message: `${confirmedBooking.buyerName} paid and confirmed "${
      confirmedBooking.serviceTitle
    }" for ${formatDateTime(
      confirmedBooking.startTime,
    )}. You can join the call 10 minutes before start.${
      confirmedBooking.note ? ` Buyer note: ${confirmedBooking.note}` : ""
    }`,
    metadata: {
      bookingId: confirmedBooking.id,
      expertId: confirmedBooking.expertId,
      buyerName: confirmedBooking.buyerName,
      serviceTitle: confirmedBooking.serviceTitle,
      startTime: confirmedBooking.startTime.toISOString(),
      endTime: confirmedBooking.endTime.toISOString(),
      note: confirmedBooking.note,
      servicePriceCents: confirmedBooking.servicePriceCents,
      providerCommissionCents: confirmedBooking.providerCommissionCents,
      providerNetCents: confirmedBooking.providerNetCents,
      platformGrossFeeCents: confirmedBooking.platformGrossFeeCents,
      stripeCheckoutSessionId: confirmedBooking.stripeCheckoutSessionId,
      stripePaymentIntentId: confirmedBooking.stripePaymentIntentId,
    },
  });

  revalidateWebhookPaths(confirmedBooking.expertId, confirmedBooking.id);

  return confirmedBooking;
}

async function handlePaymentIntentFailed({
  eventId,
  paymentIntent,
}: {
  eventId: string;
  paymentIntent: Stripe.PaymentIntent;
}) {
  const bookingId = paymentIntent.metadata?.bookingId;

  if (!bookingId) {
    await markStripeEventProcessed(eventId);
    return null;
  }

  const failedBooking = await prisma.$transaction(
    async (tx): Promise<FailedBookingData | null> => {
      const booking = await tx.booking.findUnique({
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
        },
      });

      if (!booking) {
        await tx.stripeEvent.update({
          where: {
            id: eventId,
          },
          data: {
            processed: true,
          },
        });

        return null;
      }

      if (booking.status === "PENDING") {
        await tx.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelReason: "PAYMENT_FAILED",
            expiresAt: null,
            stripePaymentIntentId: paymentIntent.id,
          },
        });

        if (booking.availabilityId) {
          await tx.availability.updateMany({
            where: {
              id: booking.availabilityId,
            },
            data: {
              isBooked: false,
            },
          });
        }

        await tx.callRoom.updateMany({
          where: {
            bookingId: booking.id,
          },
          data: {
            status: "ENDED",
            endsAt: new Date(),
          },
        });
      }

      await tx.stripeEvent.update({
        where: {
          id: eventId,
        },
        data: {
          processed: true,
        },
      });

      return {
        id: booking.id,
        expertId: booking.expertId,
        availabilityId: booking.availabilityId,
        buyerEmail: booking.buyer.email,
        expertEmail: booking.expert.user.email,
        serviceTitle: booking.service?.title ?? "Booked call",
      };
    },
  );

  if (!failedBooking) {
    return null;
  }

  await safeSendNotification({
    to: failedBooking.buyerEmail,
    type: "BOOKING_CANCELLED",
    subject: "Payment failed",
    message: `Payment failed for "${failedBooking.serviceTitle}". The booking was not confirmed.`,
    metadata: {
      bookingId: failedBooking.id,
      expertId: failedBooking.expertId,
      stripePaymentIntentId: paymentIntent.id,
    },
  });

  await safeSendNotification({
    to: failedBooking.expertEmail,
    type: "BOOKING_CANCELLED",
    subject: "Booking payment failed",
    message: `The booking "${failedBooking.serviceTitle}" was cancelled because the buyer payment failed.`,
    metadata: {
      bookingId: failedBooking.id,
      expertId: failedBooking.expertId,
      stripePaymentIntentId: paymentIntent.id,
    },
  });

  revalidateWebhookPaths(failedBooking.expertId, failedBooking.id);

  return failedBooking;
}

async function handleCheckoutSessionExpired({
  eventId,
  session,
}: {
  eventId: string;
  session: Stripe.Checkout.Session;
}) {
  const bookingId = session.metadata?.bookingId;

  if (!bookingId) {
    await markStripeEventProcessed(eventId);
    return null;
  }

  const expiredBooking = await prisma.$transaction(
    async (tx): Promise<ExpiredBookingData | null> => {
      const booking = await tx.booking.findUnique({
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
        await tx.stripeEvent.update({
          where: {
            id: eventId,
          },
          data: {
            processed: true,
          },
        });

        return null;
      }

      if (booking.status === "PENDING") {
        await tx.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            status: "EXPIRED",
            cancelledAt: new Date(),
            cancelReason: "PAYMENT_EXPIRED",
            expiresAt: null,
            stripeCheckoutSessionId: session.id,
          },
        });

        if (booking.availabilityId) {
          await tx.availability.updateMany({
            where: {
              id: booking.availabilityId,
            },
            data: {
              isBooked: false,
            },
          });
        }

        if (booking.callRoom) {
          await tx.callRoom.updateMany({
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

      await tx.stripeEvent.update({
        where: {
          id: eventId,
        },
        data: {
          processed: true,
        },
      });

      return {
        id: booking.id,
        expertId: booking.expertId,
        availabilityId: booking.availabilityId,
        buyerEmail: booking.buyer.email,
        expertEmail: booking.expert.user.email,
        serviceTitle: booking.service?.title ?? "Booked call",
      };
    },
  );

  if (!expiredBooking) {
    return null;
  }

  await safeSendNotification({
    to: expiredBooking.buyerEmail,
    type: "BOOKING_CANCELLED",
    subject: "Booking expired",
    message: `Your booking "${expiredBooking.serviceTitle}" expired because checkout was not completed in time.`,
    metadata: {
      bookingId: expiredBooking.id,
      expertId: expiredBooking.expertId,
      stripeCheckoutSessionId: session.id,
      reason: "stripe-checkout-expired",
      newStatus: "EXPIRED",
    },
  });

  await safeSendNotification({
    to: expiredBooking.expertEmail,
    type: "BOOKING_CANCELLED",
    subject: "Booking expired",
    message: `The booking "${expiredBooking.serviceTitle}" expired because the buyer did not complete checkout in time.`,
    metadata: {
      bookingId: expiredBooking.id,
      expertId: expiredBooking.expertId,
      stripeCheckoutSessionId: session.id,
      reason: "stripe-checkout-expired",
      newStatus: "EXPIRED",
    },
  });

  revalidateWebhookPaths(expiredBooking.expertId, expiredBooking.id);

  return expiredBooking;
}

async function handleChargeRefunded({
  eventId,
  charge,
}: {
  eventId: string;
  charge: Stripe.Charge;
}) {
  const paymentIntentId = getPaymentIntentIdFromCharge(charge);

  if (!paymentIntentId) {
    await markStripeEventProcessed(eventId);
    return null;
  }

  const refundedBooking = await prisma.$transaction(
    async (tx): Promise<RefundedBookingData | null> => {
      const booking = await tx.booking.findFirst({
        where: {
          stripePaymentIntentId: paymentIntentId,
        },
        include: {
          buyer: true,
          expert: {
            include: {
              user: true,
            },
          },
          service: true,
        },
      });

      if (!booking) {
        await tx.stripeEvent.update({
          where: {
            id: eventId,
          },
          data: {
            processed: true,
          },
        });

        return null;
      }

      if (booking.status !== "REFUNDED") {
        await tx.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            status: "REFUNDED",
            refundedAt: new Date(),
            expiresAt: null,
          },
        });

        if (booking.availabilityId) {
          await tx.availability.updateMany({
            where: {
              id: booking.availabilityId,
            },
            data: {
              isBooked: false,
            },
          });
        }

        await tx.callRoom.updateMany({
          where: {
            bookingId: booking.id,
          },
          data: {
            status: "ENDED",
            endsAt: new Date(),
          },
        });
      }

      await tx.stripeEvent.update({
        where: {
          id: eventId,
        },
        data: {
          processed: true,
        },
      });

      return {
        id: booking.id,
        expertId: booking.expertId,
        availabilityId: booking.availabilityId,
        buyerEmail: booking.buyer.email,
        expertEmail: booking.expert.user.email,
        serviceTitle: booking.service?.title ?? "Booked call",
      };
    },
  );

  if (!refundedBooking) {
    return null;
  }

  await safeSendNotification({
    to: refundedBooking.buyerEmail,
    type: "BOOKING_REFUNDED",
    subject: "Your SkillDrop booking was refunded",
    message: `Your booking "${refundedBooking.serviceTitle}" was refunded.`,
    metadata: {
      bookingId: refundedBooking.id,
      expertId: refundedBooking.expertId,
      stripePaymentIntentId: paymentIntentId,
      chargeId: charge.id,
    },
  });

  await safeSendNotification({
    to: refundedBooking.expertEmail,
    type: "BOOKING_REFUNDED",
    subject: "A booking was refunded",
    message: `The booking "${refundedBooking.serviceTitle}" was refunded.`,
    metadata: {
      bookingId: refundedBooking.id,
      expertId: refundedBooking.expertId,
      stripePaymentIntentId: paymentIntentId,
      chargeId: charge.id,
    },
  });

  revalidateWebhookPaths(refundedBooking.expertId, refundedBooking.id);

  return refundedBooking;
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing Stripe webhook secret" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  const existingEvent = await prisma.stripeEvent.findUnique({
    where: {
      id: event.id,
    },
  });

  if (existingEvent?.processed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await prisma.stripeEvent.upsert({
    where: {
      id: event.id,
    },
    update: {
      type: event.type,
    },
    create: {
      id: event.id,
      type: event.type,
      processed: false,
    },
  });

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;

      await handleCheckoutSessionPaid({
        eventId: event.id,
        session,
      });

      return NextResponse.json({ received: true });
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;

      await handleCheckoutSessionExpired({
        eventId: event.id,
        session,
      });

      return NextResponse.json({ received: true });
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      await handlePaymentIntentFailed({
        eventId: event.id,
        paymentIntent,
      });

      return NextResponse.json({ received: true });
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;

      await handleChargeRefunded({
        eventId: event.id,
        charge,
      });

      return NextResponse.json({ received: true });
    }

    await markStripeEventProcessed(event.id);

    return NextResponse.json({
      received: true,
      ignored: event.type,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error";

    console.error("Stripe webhook error:", message);

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}