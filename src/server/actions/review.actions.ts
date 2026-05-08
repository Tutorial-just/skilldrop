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

async function recalculateExpertReviewStats(expertId: string) {
  const reviews = await prisma.review.findMany({
    where: {
      expertId,
    },
    select: {
      rating: true,
    },
  });

  const totalReviews = reviews.length;

  const rating =
    totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

  const expert = await prisma.expertProfile.findUnique({
    where: {
      id: expertId,
    },
    select: {
      totalSessions: true,
      isVerified: true,
    },
  });

  if (!expert) {
    return {
      rating,
      totalReviews,
      wasAutoVerified: false,
    };
  }

  const shouldVerify = expert.totalSessions >= 3 && rating >= 3.8;

  await prisma.expertProfile.update({
    where: {
      id: expertId,
    },
    data: {
      rating,
      totalReviews,
      ...(shouldVerify && !expert.isVerified
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
    rating,
    totalReviews,
    wasAutoVerified: shouldVerify && !expert.isVerified,
  };
}

export async function createReviewAction(formData: FormData) {
  const { user } = await requireRole(["buyer", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

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

  const comment = getStringValue(formData, "comment");

  if (!bookingId || rating === null || rating === undefined) {
    redirect("/buyer/reviews?error=invalid-review");
  }

  if (
    helpfulness === null ||
    clarity === null ||
    professionalism === null
  ) {
    redirect(`/buyer/reviews?bookingId=${bookingId}&error=invalid-review`);
  }

  const finalRating: number = rating;

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
    redirect("/buyer/reviews?error=booking-not-found");
  }

  const isOwner = booking.buyerId === buyer.id;
  const isAdmin = buyer.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    redirect("/buyer/reviews?error=not-allowed");
  }

  if (booking.status !== "COMPLETED") {
    redirect(`/buyer/reviews?bookingId=${booking.id}&error=not-completed`);
  }

  if (booking.review) {
    redirect(`/buyer/reviews?bookingId=${booking.id}&error=already-reviewed`);
  }

  await prisma.review.create({
    data: {
      bookingId: booking.id,
      buyerId: booking.buyerId,
      expertId: booking.expertId,
      rating: finalRating,
      helpfulness: helpfulness ?? null,
      clarity: clarity ?? null,
      professionalism: professionalism ?? null,
      wouldRecommend,
      comment: comment || null,
    },
  });

  const stats = await recalculateExpertReviewStats(booking.expertId);

  await sendNotification({
    to: booking.expert.user.email,
    type: "REVIEW_RECEIVED",
    subject: "You received a new review",
    message: `You received a ${finalRating}/5 review for "${
      booking.service?.title ?? "Booked call"
    }".`,
    metadata: {
      bookingId: booking.id,
      expertId: booking.expertId,
      rating: finalRating,
      helpfulness: helpfulness ?? null,
      clarity: clarity ?? null,
      professionalism: professionalism ?? null,
      wouldRecommend,
      totalReviews: stats.totalReviews,
      newRating: stats.rating,
    },
  });

  if (stats.wasAutoVerified) {
    await sendNotification({
      to: booking.expert.user.email,
      type: "REVIEW_RECEIVED",
      subject: "Your SkillDrop profile is now verified",
      message:
        "Congratulations. Your profile was automatically verified after reaching 3 completed sessions and a rating of at least 3.8.",
      metadata: {
        expertId: booking.expertId,
        totalReviews: stats.totalReviews,
        rating: stats.rating,
        totalSessionsRequired: 3,
        minimumRatingRequired: 3.8,
      },
    });
  }

  revalidateReviewPaths(booking.expertId, booking.id);

  redirect(`/buyer/reviews?reviewed=${booking.id}`);
}