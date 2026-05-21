import { prisma } from "@/lib/prisma";

type VerificationResult = {
  wasUpdated: boolean;
  isVerified: boolean;
  reason: string;
};

const MIN_COMPLETED_CALLS = 3;
const MIN_REVIEWS = 3;
const MIN_RATING = 3.8;

export async function refreshExpertVerification(
  expertId: string,
): Promise<VerificationResult> {
  const expert = await prisma.expertProfile.findUnique({
    where: {
      id: expertId,
    },
    select: {
      id: true,
      isVerified: true,
      totalSessions: true,
      totalReviews: true,
      rating: true,
    },
  });

  if (!expert) {
    return {
      wasUpdated: false,
      isVerified: false,
      reason: "Expert profile not found.",
    };
  }

  if (expert.isVerified) {
    return {
      wasUpdated: false,
      isVerified: true,
      reason: "Expert is already verified.",
    };
  }

  const hasEnoughCalls = expert.totalSessions >= MIN_COMPLETED_CALLS;
  const hasEnoughReviews = expert.totalReviews >= MIN_REVIEWS;
  const hasGoodRating = expert.rating >= MIN_RATING;

  if (!hasEnoughCalls || !hasEnoughReviews || !hasGoodRating) {
    return {
      wasUpdated: false,
      isVerified: false,
      reason: "Expert does not meet verification requirements yet.",
    };
  }

  await prisma.expertProfile.update({
    where: {
      id: expert.id,
    },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  return {
    wasUpdated: true,
    isVerified: true,
    reason: "Expert earned verification.",
  };
}

export function getVerificationRequirements() {
  return {
    minCompletedCalls: MIN_COMPLETED_CALLS,
    minReviews: MIN_REVIEWS,
    minRating: MIN_RATING,
  };
}