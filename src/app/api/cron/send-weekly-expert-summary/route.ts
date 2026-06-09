import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendWeeklyExpertSummaryEmail } from "@/lib/booking-emails";

function isAuthorized(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${expectedSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const experts = await prisma.expertProfile.findMany({
    where: {
      status: "APPROVED",
      settings: {
        is: {
          weeklySummary: true,
        },
      },
      user: {
        email: {
          not: "",
        },
      },
    },
    include: {
      user: true,
      bookings: {
        where: {
          OR: [
            {
              startTime: {
                gte: now,
                lte: weekAhead,
              },
              status: {
                in: [BookingStatus.PAID, BookingStatus.CONFIRMED],
              },
            },
            {
              completedAt: {
                gte: weekAgo,
              },
              status: BookingStatus.COMPLETED,
            },
          ],
        },
        include: {
          outcome: true,
        },
      },
    },
    take: 100,
  });

  let sent = 0;

  for (const expert of experts) {
    if (!expert.user.email) {
      continue;
    }

    const upcomingCalls = expert.bookings.filter(
      (booking) => booking.startTime >= now && [BookingStatus.PAID, BookingStatus.CONFIRMED].includes(booking.status),
    );

    const completedCalls = expert.bookings.filter(
      (booking) => booking.status === BookingStatus.COMPLETED,
    );

    const openOutcomes = completedCalls.filter((booking) => !booking.outcome);

    const estimatedNetCents = upcomingCalls.reduce(
      (sum, booking) => sum + (booking.providerNetCents ?? booking.priceCents),
      0,
    );

    await sendWeeklyExpertSummaryEmail({
      expertEmail: expert.user.email,
      expertName: expert.user.name,
      upcomingCalls: upcomingCalls.length,
      completedCalls: completedCalls.length,
      openOutcomes: openOutcomes.length,
      estimatedNetCents,
      currency: upcomingCalls[0]?.currency ?? "EUR",
    });

    sent += 1;
  }

  return NextResponse.json({ ok: true, sent, checked: experts.length });
}
