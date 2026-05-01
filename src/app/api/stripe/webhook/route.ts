import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not set" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);

    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const bookingId =
      session.metadata?.bookingId ?? session.client_reference_id ?? null;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Missing bookingId in Stripe session" },
        { status: 400 },
      );
    }

    await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: BookingStatus.PAID,
        stripeCheckoutSessionId: session.id,
      },
    });
  }

  return NextResponse.json({ received: true });
}