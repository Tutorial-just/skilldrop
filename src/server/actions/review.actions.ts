"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createReviewAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const buyerId = String(formData.get("buyerId") ?? "");
  const expertId = String(formData.get("expertId") ?? "");
  const rating = Number(formData.get("rating") ?? 0);
  const comment = String(formData.get("comment") ?? "").trim();

  if (!bookingId || !buyerId || !expertId || !rating) {
    throw new Error("Missing required review fields.");
  }

  if (rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5.");
  }

  const existingReview = await prisma.review.findUnique({
    where: {
      bookingId,
    },
  });

  if (existingReview) {
    throw new Error("This booking already has a review.");
  }

  await prisma.review.create({
    data: {
      bookingId,
      buyerId,
      expertId,
      rating,
      comment: comment || null,
    },
  });

  const reviews = await prisma.review.findMany({
    where: {
      expertId,
    },
  });

  const averageRating =
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  await prisma.expertProfile.update({
    where: {
      id: expertId,
    },
    data: {
      rating: Number(averageRating.toFixed(1)),
      totalReviews: reviews.length,
    },
  });

  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath(`/experts/${expertId}`);
  revalidatePath("/experts");
}