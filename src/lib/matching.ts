import type { HelpType } from "@prisma/client";

export type MatchableService = {
  title: string;
  description: string;
  priceCents: number;
  helpType: HelpType | string | null;
  tags?: string[];
  category?: { slug?: string | null; name?: string | null } | null;
  subcategory?: { slug?: string | null; name?: string | null } | null;
};

export type MatchableExpert = {
  headline: string;
  bio: string;
  country?: string | null;
  languages: string[];
  skills: string[];
  tags: string[];
  rating: number;
  totalReviews: number;
  totalSessions: number;
  isVerified: boolean;
  services: MatchableService[];
  availability: { startTime: Date; endTime: Date }[];
};

export type BuyerProblemSignal = {
  query?: string | null;
  categorySlug?: string | null;
  helpType?: HelpType | string | null;
  preferredLanguage?: string | null;
  budgetMaxCents?: number | null;
  urgency?: "today" | "this-week" | "flexible" | string | null;
};

const synonyms: Record<string, string[]> = {
  cv: ["resume", "career", "job", "application", "interview"],
  resume: ["cv", "career", "job", "application", "interview"],
  document: ["documents", "admin", "paperwork", "form", "letter"],
  documents: ["document", "admin", "paperwork", "form", "letter"],
  french: ["france", "francais", "français", "document", "translation"],
  website: ["web", "code", "developer", "bug", "seo"],
  code: ["programming", "developer", "website", "debug", "bug"],
  business: ["clients", "pricing", "marketing", "startup", "sales"],
  clients: ["business", "marketing", "sales", "pricing"],
  translation: ["language", "french", "english", "message"],
  cooking: ["recipe", "food", "meal", "kitchen"],
};

export function normalizeMatchText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getProblemTerms(query: string | null | undefined) {
  const baseTerms = normalizeMatchText(query)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  const expanded = baseTerms.flatMap((term) => [term, ...(synonyms[term] ?? [])]);

  return Array.from(new Set(expanded));
}

export function calculateWorldClassMatchScore({
  expert,
  problem,
}: {
  expert: MatchableExpert;
  problem: BuyerProblemSignal;
}) {
  const terms = getProblemTerms(problem.query);
  const categorySlug = normalizeMatchText(problem.categorySlug);
  const helpType = normalizeMatchText(problem.helpType ? String(problem.helpType) : "");
  const language = normalizeMatchText(problem.preferredLanguage);
  const budgetMaxCents = problem.budgetMaxCents ?? null;

  const profileText = normalizeMatchText(
    [
      expert.headline,
      expert.bio,
      expert.country ?? "",
      ...expert.skills,
      ...expert.tags,
      ...expert.languages,
    ].join(" "),
  );

  let score = 0;
  const reasons: string[] = [];

  let topicHits = 0;
  for (const term of terms) {
    if (profileText.includes(term)) {
      topicHits += 1;
      score += 6;
    }

    for (const service of expert.services) {
      const serviceText = normalizeMatchText(
        [service.title, service.description, ...(service.tags ?? [])].join(" "),
      );

      if (serviceText.includes(term)) {
        topicHits += 1;
        score += 9;
      }
    }
  }

  if (topicHits > 0) {
    reasons.push(topicHits >= 3 ? "Strong topic match" : "Relevant topic match");
  }

  const matchingCategory = categorySlug
    ? expert.services.some((service) => {
        const serviceCategory = normalizeMatchText(service.category?.slug ?? service.category?.name ?? "");
        const serviceSubcategory = normalizeMatchText(
          service.subcategory?.slug ?? service.subcategory?.name ?? "",
        );

        return serviceCategory === categorySlug || serviceSubcategory === categorySlug;
      })
    : false;

  if (matchingCategory) {
    score += 25;
    reasons.push("Category match");
  }

  const matchingHelpType = helpType
    ? expert.services.some((service) => normalizeMatchText(String(service.helpType ?? "")) === helpType)
    : false;

  if (matchingHelpType) {
    score += 15;
    reasons.push("Right help type");
  }

  const matchingLanguage = language
    ? expert.languages.some((item) => normalizeMatchText(item).includes(language))
    : false;

  if (matchingLanguage) {
    score += 12;
    reasons.push(`Speaks ${problem.preferredLanguage}`);
  }

  const budgetMatch = budgetMaxCents
    ? expert.services.some((service) => service.priceCents <= budgetMaxCents)
    : false;

  if (budgetMatch) {
    score += 8;
    reasons.push("Inside budget");
  }

  if (expert.availability.length > 0) {
    score += 8;
    reasons.push("Has availability");
  }

  if (expert.isVerified) {
    score += 8;
    reasons.push("Verified helper");
  }

  if (expert.totalSessions >= 5) {
    score += 5;
    reasons.push("Experienced on platform");
  }

  if (expert.totalReviews > 0 && expert.rating >= 4.5) {
    score += 8;
    reasons.push("Strong reviews");
  } else if (expert.totalReviews > 0) {
    score += 4;
  }

  return {
    score: Math.round(score),
    reasons: Array.from(new Set(reasons)).slice(0, 6),
  };
}
