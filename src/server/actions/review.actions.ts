"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { refreshExpertVerification } from "@/lib/expert-verification";
import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { trackProductEvent } from "@/lib/product-analytics";
import {
  assertRateLimit,
  getClientIp,
  rateLimitPresets,
} from "@/lib/rate-limit";
import { sendNotification } from "@/server/services/notification.service";
import {
  sendExpertVerifiedEmail,
  sendReviewReceivedEmail,
} from "@/lib/booking-emails";

const MAX_REVIEW_COMMENT_LENGTH = 1500;

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function parseScore(value: string, required = false) {
  if (!value) {
    return required ? null : undefined;
  }

  const score = Number(value);

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return null;
  }

  return score;
}

function parseBooleanValue(value: string) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

function parseProblemSolved(value: string) {
  if (value === "YES") {
    return "YES";
  }

  if (value === "PARTIALLY") {
    return "PARTIALLY";
  }

  if (value === "NO") {
    return "NO";
  }

  return null;
}

function normalizeComment(comment: string) {
  const normalized = comment
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, MAX_REVIEW_COMMENT_LENGTH);
}

function revalidateReviewPaths(expertId: string, bookingId: string) {
  revalidatePath("/");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expertId}`);

  revalidatePath("/buyer");
  revalidatePath("/buyer/bookings");
  revalidatePath("/buyer/reviews");

  revalidatePath("/expert");
  revalidatePath("/expert/bookings");
  revalidatePath("/expert/stats");
  revalidatePath("/expert/earnings");

  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/experts");
  revalidatePath("/admin/bookings");

  revalidatePath(`/calls/${bookingId}`);
  revalidatePath("/notifications");
}

async function safeSendNotification(
  input: Parameters<typeof sendNotification>[0],
) {
  try {
    await sendNotification(input);
  } catch (error) {
    console.error("Notification error:", error);
  }
}

async function getCurrentBuyerOrAdmin() {
  const { user } = await requireRole(["buyer", "admin"]);

  const currentUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
  });

  if (!currentUser) {
    redirect("/sign-in");
  }

  return currentUser;
}

async function assertReviewRateLimit(userId: string) {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);

  assertRateLimit(
    `review:create:${userId}:${ip}`,
    rateLimitPresets.profileUpdate,
    "Too many review attempts. Please try again later.",
  );
}

export async function createReviewAction(formData: FormData) {
  const currentUser = await getCurrentBuyerOrAdmin();

  await assertReviewRateLimit(currentUser.id);

  const bookingId = getStringValue(formData, "bookingId");

  const rating = parseScore(getStringValue(formData, "rating"), true);
  const helpfulness = parseScore(getStringValue(formData, "helpfulness"));
  const clarity = parseScore(getStringValue(formData, "clarity"));
  const professionalism = parseScore(
    getStringValue(formData, "professionalism"),
  );

  const wouldRecommend = parseBooleanValue(
    getStringValue(formData, "wouldRecommend"),
  );

  const problemSolved = parseProblemSolved(
    getStringValue(formData, "problemSolved"),
  );

  const rawComment = getStringValue(formData, "comment");
  const comment = normalizeComment(rawComment);

  if (!bookingId || rating === null || rating === undefined) {
    redirect("/buyer/reviews?error=invalid-review");
  }

  if (rawComment.length > MAX_REVIEW_COMMENT_LENGTH) {
    redirect(`/buyer/reviews?bookingId=${bookingId}&error=comment-too-long`);
  }

  if (helpfulness === null || clarity === null || professionalism === null) {
    redirect(`/buyer/reviews?bookingId=${bookingId}&error=invalid-review`);
  }

  if (!problemSolved) {
    redirect(`/buyer/reviews?bookingId=${bookingId}&error=invalid-review`);
  }

  if (wouldRecommend === null) {
    redirect(`/buyer/reviews?bookingId=${bookingId}&error=invalid-review`);
  }

  const finalRating: number = rating;

  const result = await prisma.$transaction(async (tx) => {
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
        review: true,
      },
    });

    if (!booking) {
      return {
        status: "BOOKING_NOT_FOUND" as const,
      };
    }

    const isOwner = booking.buyerId === currentUser.id;
    const isAdmin = currentUser.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return {
        status: "NOT_ALLOWED" as const,
      };
    }

    if (booking.status !== "COMPLETED") {
      return {
        status: "NOT_COMPLETED" as const,
        bookingId: booking.id,
      };
    }

    if (booking.review) {
      return {
        status: "ALREADY_REVIEWED" as const,
        bookingId: booking.id,
      };
    }

    const createdReview = await tx.review.create({
      data: {
        bookingId: booking.id,
        buyerId: booking.buyerId,
        expertId: booking.expertId,
        rating: finalRating,
        helpfulness: helpfulness ?? null,
        clarity: clarity ?? null,
        professionalism: professionalism ?? null,
        wouldRecommend,
        problemSolved,
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
        id: true,
      },
    });

    const totalReviews = reviewStats._count.id;
    const newRating = reviewStats._avg.rating ?? 0;

    const expert = await tx.expertProfile.findUnique({
      where: {
        id: booking.expertId,
      },
      select: {
        id: true,
      },
    });

    if (!expert) {
      return {
        status: "EXPERT_NOT_FOUND" as const,
      };
    }

    await tx.expertProfile.update({
      where: {
        id: booking.expertId,
      },
      data: {
        rating: newRating,
        totalReviews,
      },
    });

    return {
      status: "SUCCESS" as const,
      booking,
      review: createdReview,
      totalReviews,
      newRating,
    };
  });

  if (result.status === "BOOKING_NOT_FOUND") {
    redirect("/buyer/reviews?error=booking-not-found");
  }

  if (result.status === "EXPERT_NOT_FOUND") {
    redirect("/buyer/reviews?error=expert-not-found");
  }

  if (result.status === "NOT_ALLOWED") {
    redirect("/buyer/reviews?error=not-allowed");
  }

  if (result.status === "NOT_COMPLETED") {
    redirect(`/buyer/reviews?bookingId=${result.bookingId}&error=not-completed`);
  }

  if (result.status === "ALREADY_REVIEWED") {
    redirect(
      `/buyer/reviews?bookingId=${result.bookingId}&error=already-reviewed`,
    );
  }

  if (result.status !== "SUCCESS") {
    redirect("/buyer/reviews?error=invalid-review");
  }

  const verificationResult = await refreshExpertVerification(
    result.booking.expertId,
  );

  await safeSendNotification({
    to: result.booking.expert.user.email,
    type: "REVIEW_RECEIVED",
    subject: "You received a new review",
    message: `You received a ${finalRating}/5 review for "${
      result.booking.service?.title ?? "Booked call"
    }".`,
    metadata: {
      bookingId: result.booking.id,
      expertId: result.booking.expertId,
      buyerId: result.booking.buyerId,
      reviewId: result.review.id,
      rating: finalRating,
      helpfulness: helpfulness ?? null,
      clarity: clarity ?? null,
      professionalism: professionalism ?? null,
      wouldRecommend,
      problemSolved,
      hasComment: Boolean(comment),
      totalReviews: result.totalReviews,
      newRating: result.newRating,
    },
  });

  if (result.booking.expert.user.email) {
    await sendReviewReceivedEmail({
      expertEmail: result.booking.expert.user.email,
      expertName: result.booking.expert.user.name,
      buyerName: result.booking.buyer.name,
      serviceTitle: result.booking.service?.title,
      bookingId: result.booking.id,
      rating: finalRating,
      problemSolved,
      comment,
    });
  }

  if (verificationResult.wasUpdated) {
    await safeSendNotification({
      to: result.booking.expert.user.email,
      type: "EXPERT_APPROVED",
      subject: "Your SkillDrop profile is now verified",
      message:
        "Congratulations. Your profile earned verification after successful calls and positive reviews.",
      metadata: {
        expertId: result.booking.expertId,
        totalReviews: result.totalReviews,
        rating: result.newRating,
        totalSessionsRequired: 3,
        minimumRatingRequired: 3.8,
      },
    });

    if (result.booking.expert.user.email) {
      await sendExpertVerifiedEmail({
        expertEmail: result.booking.expert.user.email,
        expertName: result.booking.expert.user.name,
        rating: result.newRating,
        totalReviews: result.totalReviews,
      });
    }
  }

  await trackProductEvent({
    event: "REVIEW_LEFT",
    userId: currentUser.id,
    email: currentUser.email,
    entityType: "Review",
    entityId: result.review.id,
    metadata: {
      bookingId: result.booking.id,
      expertId: result.booking.expertId,
      rating: finalRating,
      problemSolved,
      wouldRecommend,
    },
  });

  revalidateReviewPaths(result.booking.expertId, result.booking.id);

  redirect(`/buyer/reviews?reviewed=${result.booking.id}`);
}