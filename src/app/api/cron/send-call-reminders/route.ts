import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendCallReminderEmail } from "@/lib/booking-emails";
import { sendNotification } from "@/server/services/notification.service";

export const dynamic = "force-dynamic";

const REMINDER_WINDOWS = [
  { key: "60m", minutesBefore: 60, from: 55, to: 65 },
  { key: "10m", minutesBefore: 10, from: 8, to: 12 },
];

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  let sent = 0;
  const skipped: string[] = [];

  try {
    for (const window of REMINDER_WINDOWS) {
      const rangeStart = new Date(now.getTime() + window.from * 60 * 1000);
      const rangeEnd = new Date(now.getTime() + window.to * 60 * 1000);

      const bookings = await prisma.booking.findMany({
        where: {
          status: BookingStatus.CONFIRMED,
          startTime: {
            gte: rangeStart,
            lte: rangeEnd,
          },
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
        take: 50,
      });

      for (const booking of bookings) {
        const eventId = `${booking.id}:${window.key}`;
        const existingEvent = await prisma.productEvent.findFirst({
          where: {
            event: "CALL_REMINDER_SENT",
            entityType: "Booking",
            entityId: eventId,
          },
          select: {
            id: true,
          },
        });

        if (existingEvent) {
          skipped.push(eventId);
          continue;
        }

        await sendCallReminderEmail({
          buyerEmail: booking.buyer.email,
          buyerName: booking.buyer.name,
          expertEmail: booking.expert.user.email,
          expertName: booking.expert.user.name,
          serviceTitle: booking.service?.title,
          bookingId: booking.id,
          startTime: booking.startTime,
          endTime: booking.endTime,
          minutesBefore: window.minutesBefore,
        });

        await Promise.all([
          sendNotification({
            to: booking.buyer.email,
            type: "SYSTEM",
            subject: `Your SkillDrop call starts in ${window.minutesBefore} minutes`,
            message: `Prepare your question for “${booking.service?.title ?? "Booked call"}”.`,
            metadata: { bookingId: booking.id, reminder: window.key },
          }),
          sendNotification({
            to: booking.expert.user.email,
            type: "SYSTEM",
            subject: `Buyer call starts in ${window.minutesBefore} minutes`,
            message: `Review the buyer note for “${booking.service?.title ?? "Booked call"}”.`,
            metadata: { bookingId: booking.id, reminder: window.key },
          }),
          prisma.productEvent.create({
            data: {
              event: "CALL_REMINDER_SENT",
              entityType: "Booking",
              entityId: eventId,
              metadata: {
                bookingId: booking.id,
                reminder: window.key,
                minutesBefore: window.minutesBefore,
              },
            },
          }),
        ]);

        sent += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      job: "send-call-reminders",
      sent,
      skipped: skipped.length,
      executedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("[cron.send-call-reminders]", error);

    return NextResponse.json({ ok: false, error: "Cron job failed" }, { status: 500 });
  }
}
