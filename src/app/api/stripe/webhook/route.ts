import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { sendNotification } from "@/server/services/notification.service";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

type ConfirmedBookingNotification = {
  id: string;
  buyerEmail: string | null;
  expertEmail: string | null;
  serviceTitle: string;
};

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    const bookingId = session.metadata?.bookingId;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Missing bookingId metadata" },
        { status: 400 },
      );
    }

    let confirmedBooking: ConfirmedBookingNotification | null = null;

    await prisma.$transaction(async (tx) => {
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
        return;
      }

      if (booking.status !== "PENDING") {
        return;
      }

      await tx.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          status: "CONFIRMED",
          stripeCheckoutSessionId: session.id,
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

      confirmedBooking = {
        id: booking.id,
        buyerEmail: booking.buyer.email,
        expertEmail: booking.expert.user.email,
        serviceTitle: booking.service?.title ?? "Booked call",
      };
    });

    if (confirmedBooking) {
      await sendNotification({
        to: confirmedBooking.buyerEmail,
        type: "PAYMENT_CONFIRMED",
        subject: "Your call is confirmed",
        message: `Your payment was received and your call "${confirmedBooking.serviceTitle}" is confirmed.`,
        metadata: {
          bookingId: confirmedBooking.id,
          stripeCheckoutSessionId: session.id,
        },
      });

      await sendNotification({
        to: confirmedBooking.expertEmail,
        type: "PAYMENT_CONFIRMED",
        subject: "New confirmed booking",
        message: `A client confirmed and paid for "${confirmedBooking.serviceTitle}".`,
        metadata: {
          bookingId: confirmedBooking.id,
          stripeCheckoutSessionId: session.id,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}