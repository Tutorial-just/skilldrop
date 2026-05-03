"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getRatingValue(formData: FormData) {
  const rawRating = getStringValue(formData, "rating");
  const rating = Number(rawRating);

  if (!Number.isFinite(rating)) {
    return 0;
  }

  return Math.min(Math.max(Math.round(rating), 1), 5);
}

export async function createReviewAction(formData: FormData) {
  const { user } = await requireRole(["buyer", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const bookingId = getStringValue(formData, "bookingId");
  const rating = getRatingValue(formData);
  const comment = getStringValue(formData, "comment");

  if (!bookingId || rating < 1 || rating > 5) {
    redirect("/buyer/reviews?error=invalid-review");
  }

  const buyer = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!buyer) {
    redirect("/sign-in");
  }

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      review: true,
      expert: true,
    },
  });

  if (!booking) {
    redirect("/buyer/reviews?error=booking-not-found");
  }

  const isOwnerBuyer = booking.buyerId === buyer.id;
  const isAdmin = buyer.role === "ADMIN";

  if (!isOwnerBuyer && !isAdmin) {
    redirect("/buyer/reviews?error=not-allowed");
  }

  if (booking.status !== "COMPLETED") {
    redirect("/buyer/reviews?error=not-completed");
  }

  if (booking.review) {
    redirect("/buyer/reviews?error=already-reviewed");
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        bookingId: booking.id,
        buyerId: booking.buyerId,
        expertId: booking.expertId,
        rating,
        comment: comment || null,
      },
    });

    const reviews = await tx.review.findMany({
      where: {
        expertId: booking.expertId,
      },
      select: {
        rating: true,
      },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
        : 0;

    const shouldVerify =
      booking.expert.totalSessions >= 3 && averageRating >= 3.8;

    await tx.expertProfile.update({
      where: {
        id: booking.expertId,
      },
      data: {
        rating: Number(averageRating.toFixed(2)),
        totalReviews,
        isVerified: shouldVerify ? true : booking.expert.isVerified,
        verifiedAt:
          shouldVerify && !booking.expert.isVerified
            ? new Date()
            : booking.expert.verifiedAt,
      },
    });
  });

  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath("/buyer/reviews");
  revalidatePath("/expert");
  revalidatePath("/expert/stats");
  revalidatePath(`/experts/${booking.expertId}`);

  redirect("/buyer/reviews?reviewed=1");
}