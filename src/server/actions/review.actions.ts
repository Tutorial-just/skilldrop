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

function normalizeComment(comment: string) {
  return comment.replace(/\s+/g, " ").trim().slice(0, MAX_COMMENT_LENGTH);
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

function getReviewsHref(bookingId?: string, error?: string) {
  const params = new URLSearchParams();

  if (bookingId) {
    params.set("bookingId", bookingId);
  }

  if (error) {
    params.set("error", error);
  }

  const query = params.toString();

  return query ? `/buyer/reviews?${query}` : "/buyer/reviews";
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
  const comment = rawComment ? normalizeComment(rawComment) : null;

  if (!bookingId || rating < 1 || rating > 5) {
    redirect(getReviewsHref(bookingId, "invalid-review"));
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
    redirect(getReviewsHref(undefined, "booking-not-found"));
  }

  const isOwnerBuyer = booking.buyerId === currentUser.id;
  const isAdmin = currentUser.role === "ADMIN";

  if (!isOwnerBuyer && !isAdmin) {
    redirect(getReviewsHref(booking.id, "not-allowed"));
  }

  if (booking.status !== "COMPLETED") {
    redirect(getReviewsHref(booking.id, "not-completed"));
  }

  if (booking.review) {
    redirect(getReviewsHref(booking.id, "already-reviewed"));
  }

  let createdReview: {
    id: string;
    rating: number;
  };

  try {
    createdReview = await prisma.$transaction(async (tx) => {
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
        select: {
          id: true,
          rating: true,
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

       const completedSessions = await tx.booking.count({
         where: {
           expertId: booking.expertId,
           status: "COMPLETED",
          },
        });


      const totalReviews = reviewStats._count.rating;
      const averageRating = reviewStats._avg.rating ?? 0;

      const shouldEarnVerification =
        completedSessions >= 3 && averageRating >= 3.8 && !booking.expert.isVerified;

      await tx.expertProfile.update({
        where: {
          id: booking.expertId,
        },
        data: {
          rating: Number(averageRating.toFixed(2)),
          totalReviews,
          totalSessions: completedSessions,
          ...(shouldEarnVerification
            ? {
                isVerified: true,
                verifiedAt: new Date(),
              }
            : {}),
        },
      });

      return review;
    });
  } catch {
    redirect(getReviewsHref(booking.id, "already-reviewed"));
  }

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

  redirect(`/buyer/reviews?reviewed=${booking.id}`);
}