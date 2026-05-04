"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/server/services/notification.service";

const MAX_COMMENT_LENGTH = 1200;

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getRequiredRatingValue(formData: FormData, key: string) {
  const rawRating = getStringValue(formData, key);
  const rating = Number(rawRating);

  if (!Number.isFinite(rating)) {
    return 0;
  }

  return Math.min(Math.max(Math.round(rating), 1), 5);
}

function getOptionalRatingValue(formData: FormData, key: string) {
  const rawRating = getStringValue(formData, key);

  if (!rawRating) {
    return null;
  }

  const rating = Number(rawRating);

  if (!Number.isFinite(rating)) {
    return null;
  }

  return Math.min(Math.max(Math.round(rating), 1), 5);
}

function getBooleanValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

async function getCurrentUserRecord() {
  const { user } = await requireRole(["buyer", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!currentUser) {
    redirect("/sign-in");
  }

  return currentUser;
}

function revalidateReviewPaths(expertId: string) {
  revalidatePath("/");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expertId}`);

  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath("/buyer/reviews");

  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/stats");

  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/experts");

  revalidatePath("/notifications");
}

export async function createReviewAction(formData: FormData) {
  const currentUser = await getCurrentUserRecord();

  const bookingId = getStringValue(formData, "bookingId");

  const rating = getRequiredRatingValue(formData, "rating");
  const helpfulness = getOptionalRatingValue(formData, "helpfulness");
  const clarity = getOptionalRatingValue(formData, "clarity");
  const professionalism = getOptionalRatingValue(formData, "professionalism");
  const wouldRecommend = getBooleanValue(formData, "wouldRecommend");

  const rawComment = getStringValue(formData, "comment");
  const comment = rawComment
    ? rawComment.slice(0, MAX_COMMENT_LENGTH)
    : null;

  if (!bookingId || rating < 1 || rating > 5) {
    redirect("/buyer/reviews?error=invalid-review");
  }

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      buyer: true,
      review: true,
      expert: {
        include: {
          user: true,
        },
      },
      service: true,
    },
  });

  if (!booking) {
    redirect("/buyer/reviews?error=booking-not-found");
  }

  const isOwnerBuyer = booking.buyerId === currentUser.id;
  const isAdmin = currentUser.role === "ADMIN";

  if (!isOwnerBuyer && !isAdmin) {
    redirect("/buyer/reviews?error=not-allowed");
  }

  if (booking.status !== "COMPLETED") {
    redirect(`/buyer/reviews?bookingId=${booking.id}&error=not-completed`);
  }

  if (booking.review) {
    redirect(`/buyer/reviews?bookingId=${booking.id}&error=already-reviewed`);
  }

  const createdReview = await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        bookingId: booking.id,
        buyerId: booking.buyerId,
        expertId: booking.expertId,
        rating,
        helpfulness,
        clarity,
        professionalism,
        wouldRecommend,
        comment,
      },
    });

    const reviewStats = await tx.review.aggregate({
      where: {
        expertId: booking.expertId,
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    const totalReviews = reviewStats._count.rating;
    const averageRating = reviewStats._avg.rating ?? 0;

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

    return review;
  });

  await sendNotification({
    to: booking.expert.user.email,
    type: "REVIEW_RECEIVED",
    subject: "You received a new review",
    message: `A client left a ${createdReview.rating}/5 review for "${
      booking.service?.title ?? "Booked call"
    }".`,
    metadata: {
      bookingId: booking.id,
      expertId: booking.expertId,
      reviewId: createdReview.id,
      rating: createdReview.rating,
    },
  });

  revalidateReviewPaths(booking.expertId);

  redirect("/buyer/reviews?reviewed=1");
}