import { NextResponse } from "next/server";

import { releaseExpiredPendingBookings } from "@/server/actions/booking.actions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }
  }

  try {
    const result = await releaseExpiredPendingBookings();

    return NextResponse.json({
      ok: true,
      job: "release-expired-bookings",
      result,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron.release-expired-bookings]", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Cron job failed",
      },
      {
        status: 500,
      },
    );
  }
}