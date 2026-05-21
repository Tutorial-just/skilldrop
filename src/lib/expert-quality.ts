export type ExpertLevel =
  | "NEW_HELPER"
  | "FOUNDING_HELPER"
  | "EARNED_VERIFIED"
  | "TOP_HELPER";

export type ExpertBadge = {
  level: ExpertLevel;
  label: string;
  shortLabel: string;
  description: string;
  priority: number;
};

export type ProfileCompletenessInput = {
  image?: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
  bio?: string | null;
  country?: string | null;
  timezone?: string | null;
  languages?: string[] | null;
  skills?: string[] | null;
  tags?: string[] | null;
  servicesCount?: number;
  activeServicesCount?: number;
  availabilityCount?: number;
  hasStripeAccount?: boolean;
};

export type ExpertQualityInput = ProfileCompletenessInput & {
  totalSessions?: number | null;
  completedCalls?: number | null;
  totalReviews?: number | null;
  averageRating?: number | null;
  rating?: number | null;
  refundCount?: number | null;
  noShowCount?: number | null;
  disputeCount?: number | null;
  repeatClientsCount?: number | null;
  responseTimeMinutes?: number | null;
  isFoundingHelper?: boolean | null;
  isManuallyVerified?: boolean | null;
};

export type ProfileCompletenessResult = {
  score: number;
  completedItems: number;
  totalItems: number;
  missingItems: string[];
  isReadyToSell: boolean;
};

export type ExpertQualityResult = {
  level: ExpertLevel;
  badge: ExpertBadge;
  qualityScore: number;
  profileCompleteness: ProfileCompletenessResult;
  isVerified: boolean;
  canReceiveBookings: boolean;
  trustLabel: string;
};

const EXPERT_BADGES: Record<ExpertLevel, ExpertBadge> = {
  NEW_HELPER: {
    level: "NEW_HELPER",
    label: "New Helper",
    shortLabel: "New",
    description:
      "This helper is new on SkillDrop and is still building their reputation.",
    priority: 1,
  },
  FOUNDING_HELPER: {
    level: "FOUNDING_HELPER",
    label: "Founding Helper",
    shortLabel: "Founding",
    description:
      "This helper joined during the SkillDrop launch and helped build the first trusted community.",
    priority: 2,
  },
  EARNED_VERIFIED: {
    level: "EARNED_VERIFIED",
    label: "Earned Verified",
    shortLabel: "Verified",
    description:
      "This helper earned verification after successful calls and positive reviews.",
    priority: 3,
  },
  TOP_HELPER: {
    level: "TOP_HELPER",
    label: "Top Helper",
    shortLabel: "Top",
    description:
      "This helper has strong ratings, successful calls, and reliable behavior.",
    priority: 4,
  },
};

function normalizeNumber(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return value;
}

function normalizeRating(input: ExpertQualityInput): number {
  const rating = normalizeNumber(input.averageRating ?? input.rating);

  if (rating < 0) {
    return 0;
  }

  if (rating > 5) {
    return 5;
  }

  return rating;
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function hasArrayItems(value: string[] | null | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}

export function getProfileCompleteness(
  input: ProfileCompletenessInput,
): ProfileCompletenessResult {
  const checks = [
    {
      label: "Add a profile photo",
      completed: Boolean(input.image || input.avatarUrl),
    },
    {
      label: "Add a clear headline",
      completed: hasText(input.headline),
    },
    {
      label: "Write a short bio",
      completed: hasText(input.bio),
    },
    {
      label: "Add your country",
      completed: hasText(input.country),
    },
    {
      label: "Set your timezone",
      completed: hasText(input.timezone),
    },
    {
      label: "Add at least one language",
      completed: hasArrayItems(input.languages),
    },
    {
      label: "Add at least one skill",
      completed: hasArrayItems(input.skills) || hasArrayItems(input.tags),
    },
    {
      label: "Create at least one active service",
      completed:
        normalizeNumber(input.activeServicesCount ?? input.servicesCount) > 0,
    },
    {
      label: "Add availability",
      completed: normalizeNumber(input.availabilityCount) > 0,
    },
  ];

  const completedItems = checks.filter((check) => check.completed).length;
  const totalItems = checks.length;
  const score = Math.round((completedItems / totalItems) * 100);
  const missingItems = checks
    .filter((check) => !check.completed)
    .map((check) => check.label);

  return {
    score,
    completedItems,
    totalItems,
    missingItems,
    isReadyToSell: score >= 70,
  };
}

export function getExpertLevel(input: ExpertQualityInput): ExpertLevel {
  const completedCalls = normalizeNumber(
    input.completedCalls ?? input.totalSessions,
  );
  const totalReviews = normalizeNumber(input.totalReviews);
  const rating = normalizeRating(input);
  const refundCount = normalizeNumber(input.refundCount);
  const noShowCount = normalizeNumber(input.noShowCount);
  const disputeCount = normalizeNumber(input.disputeCount);
  const repeatClientsCount = normalizeNumber(input.repeatClientsCount);

  const hasSeriousProblems = noShowCount >= 2 || disputeCount >= 2;
  const hasTooManyRefunds = refundCount >= 3;

  if (
    completedCalls >= 10 &&
    totalReviews >= 5 &&
    rating >= 4.6 &&
    !hasSeriousProblems &&
    !hasTooManyRefunds &&
    repeatClientsCount >= 1
  ) {
    return "TOP_HELPER";
  }

  if (
    input.isManuallyVerified ||
    (completedCalls >= 3 &&
      totalReviews >= 3 &&
      rating >= 3.8 &&
      !hasSeriousProblems)
  ) {
    return "EARNED_VERIFIED";
  }

  if (input.isFoundingHelper) {
    return "FOUNDING_HELPER";
  }

  return "NEW_HELPER";
}

export function getExpertBadge(input: ExpertQualityInput): ExpertBadge {
  return EXPERT_BADGES[getExpertLevel(input)];
}

export function getExpertQualityScore(input: ExpertQualityInput): number {
  const completedCalls = normalizeNumber(
    input.completedCalls ?? input.totalSessions,
  );
  const totalReviews = normalizeNumber(input.totalReviews);
  const rating = normalizeRating(input);
  const refundCount = normalizeNumber(input.refundCount);
  const noShowCount = normalizeNumber(input.noShowCount);
  const disputeCount = normalizeNumber(input.disputeCount);
  const repeatClientsCount = normalizeNumber(input.repeatClientsCount);
  const responseTimeMinutes = normalizeNumber(input.responseTimeMinutes);
  const profileCompleteness = getProfileCompleteness(input);

  let score = 0;

  score += rating * 20;
  score += Math.min(completedCalls, 50) * 2;
  score += Math.min(totalReviews, 50);
  score += Math.min(repeatClientsCount, 20) * 4;
  score += profileCompleteness.score * 0.4;

  if (input.isFoundingHelper) {
    score += 8;
  }

  if (input.isManuallyVerified) {
    score += 15;
  }

  if (responseTimeMinutes > 0 && responseTimeMinutes <= 60) {
    score += 8;
  } else if (responseTimeMinutes > 60 && responseTimeMinutes <= 240) {
    score += 4;
  }

  score -= refundCount * 10;
  score -= noShowCount * 15;
  score -= disputeCount * 12;

  return Math.max(0, Math.round(score));
}

export function getExpertTrustLabel(level: ExpertLevel): string {
  switch (level) {
    case "TOP_HELPER":
      return "Highly trusted";
    case "EARNED_VERIFIED":
      return "Verified by successful calls";
    case "FOUNDING_HELPER":
      return "Early trusted helper";
    case "NEW_HELPER":
    default:
      return "Building reputation";
  }
}

export function getExpertQuality(
  input: ExpertQualityInput,
): ExpertQualityResult {
  const level = getExpertLevel(input);
  const badge = EXPERT_BADGES[level];
  const qualityScore = getExpertQualityScore(input);
  const profileCompleteness = getProfileCompleteness(input);

  const canReceiveBookings =
    profileCompleteness.isReadyToSell &&
    normalizeNumber(input.activeServicesCount ?? input.servicesCount) > 0 &&
    normalizeNumber(input.availabilityCount) > 0;

  return {
    level,
    badge,
    qualityScore,
    profileCompleteness,
    isVerified: level === "EARNED_VERIFIED" || level === "TOP_HELPER",
    canReceiveBookings,
    trustLabel: getExpertTrustLabel(level),
  };
}

export function formatProfileCompletenessMessage(
  result: ProfileCompletenessResult,
): string {
  if (result.score >= 100) {
    return "Your profile is complete.";
  }

  if (result.score >= 70) {
    return "Your profile is ready, but you can still improve it.";
  }

  return "Complete your profile to start receiving bookings.";
}

export function getNextProfileStep(
  result: ProfileCompletenessResult,
): string | null {
  return result.missingItems[0] ?? null;
}