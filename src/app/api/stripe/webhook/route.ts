import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendNotification } from "@/server/services/notification.service";
import { calculatePricingBreakdown } from "@/config/pricing";

type ConfirmedBookingData = {
  id: string;
  expertId: string;
  buyerEmail: string | null;
  expertEmail: string | null;
  buyerName: string;
  serviceTitle: string;
  startTime: Date;
  endTime: Date;
  servicePriceCents: number;
  providerCommissionCents: number;
  providerNetCents: number;
  clientServiceFeeCents: number;
  clientTotalCents: number;
  platformGrossFeeCents: number;
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

function createCallRoomData(bookingId: string) {
  const roomName = `skilldrop-${bookingId}`;
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

  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/availability");
  revalidatePath("/expert/earnings");
  revalidatePath("/expert/stats");

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
  return user.name?.trim() || user.email.split("@")[0] || "Client";
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
    update: {},
    create: {
      id: event.id,
      type: event.type,
      processed: false,
    },
  });

  if (event.type !== "checkout.session.completed") {
    await markStripeEventProcessed(event.id);

    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const bookingId = session.metadata?.bookingId;

  if (!bookingId) {
    await markStripeEventProcessed(event.id);

    return NextResponse.json(
      { error: "Missing bookingId metadata" },
      { status: 400 },
    );
  }

  if (session.payment_status !== "paid") {
    await markStripeEventProcessed(event.id);

    return NextResponse.json({
      received: true,
      skipped: "checkout-session-not-paid",
    });
  }

  const paymentIntentId = getPaymentIntentId(session);

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
            id: event.id,
          },
          data: {
            processed: true,
          },
        });

        return null;
      }

      if (booking.status === "CONFIRMED") {
        await tx.stripeEvent.update({
          where: {
            id: event.id,
          },
          data: {
            processed: true,
          },
        });

        return null;
      }

      if (booking.status !== "PENDING") {
        await tx.stripeEvent.update({
          where: {
            id: event.id,
          },
          data: {
            processed: true,
          },
        });

        return null;
      }

      const now = new Date();
      const pricing = calculatePricingBreakdown(booking.priceCents);

      const updatedBooking = await tx.booking.updateMany({
        where: {
          id: booking.id,
          status: "PENDING",
        },
        data: {
          status: "CONFIRMED",
          paidAt: now,
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
            id: event.id,
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
          id: event.id,
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
        servicePriceCents: pricing.servicePriceCents,
        providerCommissionCents: pricing.providerCommissionCents,
        providerNetCents: pricing.providerNetCents,
        clientServiceFeeCents: pricing.clientServiceFeeCents,
        clientTotalCents: pricing.clientTotalCents,
        platformGrossFeeCents: pricing.platformGrossFeeCents,
      };
    },
  );

  if (confirmedBooking) {
    await sendNotification({
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
        servicePriceCents: confirmedBooking.servicePriceCents,
        clientServiceFeeCents: confirmedBooking.clientServiceFeeCents,
        clientTotalCents: confirmedBooking.clientTotalCents,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
      },
    });

    await sendNotification({
      to: confirmedBooking.expertEmail,
      type: "PAYMENT_CONFIRMED",
      subject: "New confirmed booking",
      message: `${confirmedBooking.buyerName} paid and confirmed "${
        confirmedBooking.serviceTitle
      }" for ${formatDateTime(
        confirmedBooking.startTime,
      )}. You can join the call 10 minutes before start.`,
      metadata: {
        bookingId: confirmedBooking.id,
        expertId: confirmedBooking.expertId,
        buyerName: confirmedBooking.buyerName,
        serviceTitle: confirmedBooking.serviceTitle,
        startTime: confirmedBooking.startTime.toISOString(),
        endTime: confirmedBooking.endTime.toISOString(),
        servicePriceCents: confirmedBooking.servicePriceCents,
        providerCommissionCents: confirmedBooking.providerCommissionCents,
        providerNetCents: confirmedBooking.providerNetCents,
        platformGrossFeeCents: confirmedBooking.platformGrossFeeCents,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
      },
    });

    revalidateWebhookPaths(confirmedBooking.expertId, confirmedBooking.id);
  }

  return NextResponse.json({ received: true });
}