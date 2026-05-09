"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/server/services/notification.service";

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

function normalizeComment(comment: string) {
  const normalized = comment.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 1500);
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

async function getCurrentBuyerOrAdmin() {
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

export async function createReviewAction(formData: FormData) {
  const currentUser = await getCurrentBuyerOrAdmin();

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

  const comment = normalizeComment(getStringValue(formData, "comment"));

  if (!bookingId || rating === null || rating === undefined) {
    redirect("/buyer/reviews?error=invalid-review");
  }

  if (helpfulness === null || clarity === null || professionalism === null) {
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
        totalSessions: true,
        isVerified: true,
      },
    });

    const shouldAutoVerify =
      Boolean(expert) &&
      !expert?.isVerified &&
      expert.totalSessions >= 3 &&
      newRating >= 3.8;

    await tx.expertProfile.update({
      where: {
        id: booking.expertId,
      },
      data: {
        rating: newRating,
        totalReviews,
        ...(shouldAutoVerify
          ? {
              isVerified: true,
              verifiedAt: new Date(),
              verificationNote:
                "Automatically verified after 3 completed sessions and 3.8+ rating.",
            }
          : {}),
      },
    });

    return {
      status: "SUCCESS" as const,
      booking,
      review: createdReview,
      totalReviews,
      newRating,
      wasAutoVerified: shouldAutoVerify,
    };
  });

  if (result.status === "BOOKING_NOT_FOUND") {
    redirect("/buyer/reviews?error=booking-not-found");
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

  await sendNotification({
    to: result.booking.expert.user.email,
    type: "REVIEW_RECEIVED",
    subject: "You received a new review",
    message: `You received a ${finalRating}/5 review for "${
      result.booking.service?.title ?? "Booked call"
    }".`,
    metadata: {
      bookingId: result.booking.id,
      expertId: result.booking.expertId,
      reviewId: result.review.id,
      rating: finalRating,
      helpfulness: helpfulness ?? null,
      clarity: clarity ?? null,
      professionalism: professionalism ?? null,
      wouldRecommend,
      totalReviews: result.totalReviews,
      newRating: result.newRating,
    },
  });

  if (result.wasAutoVerified) {
    await sendNotification({
      to: result.booking.expert.user.email,
      type: "REVIEW_RECEIVED",
      subject: "Your SkillDrop profile is now verified",
      message:
        "Congratulations. Your profile was automatically verified after reaching 3 completed sessions and a rating of at least 3.8.",
      metadata: {
        expertId: result.booking.expertId,
        totalReviews: result.totalReviews,
        rating: result.newRating,
        totalSessionsRequired: 3,
        minimumRatingRequired: 3.8,
      },
    });
  }

  revalidateReviewPaths(result.booking.expertId, result.booking.id);

  redirect(`/buyer/reviews?reviewed=${result.booking.id}`);
}