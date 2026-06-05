"use client";

import { useMemo, useState } from "react";

export type SearchableService = {
  title?: string | null;
  description?: string | null;
  priceCents?: number | null;
  isActive?: boolean | null;
  helpType?: string | null;
  tags?: string[] | null;
  category?: {
    name?: string | null;
    slug?: string | null;
  } | null;
  subcategory?: {
    name?: string | null;
    slug?: string | null;
  } | null;
};

export type SearchableExpert = {
  id: string;
  headline?: string | null;
  bio?: string | null;
  country?: string | null;
  timezone?: string | null;
  languages?: string[] | null;
  skills?: string[] | null;
  tags?: string[] | null;
  rating?: number | null;
  totalReviews?: number | null;
  totalSessions?: number | null;
  isVerified?: boolean | null;
  services?: SearchableService[] | null;
  availability?: unknown[] | null;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
};

export type ExpertSearchFilters = {
  query: string;
  categorySlug: string;
  helpType: string;
  language: string;
  maxPrice: string;
  onlyAvailable: boolean;
  onlyVerified: boolean;
};

export const DEFAULT_EXPERT_SEARCH_FILTERS: ExpertSearchFilters = {
  query: "",
  categorySlug: "",
  helpType: "",
  language: "",
  maxPrice: "",
  onlyAvailable: false,
  onlyVerified: false,
};

export const MARKETPLACE_CATEGORIES = [
  {
    name: "Life & Everyday",
    slug: "life-everyday",
    aliases: ["life", "everyday", "daily", "problem", "advice", "choice"],
  },
  {
    name: "Relationships",
    slug: "relationships",
    aliases: ["relationship", "dating", "girl", "boy", "date", "confidence", "communication", "family"],
  },
  {
    name: "Business",
    slug: "business",
    aliases: ["business", "startup", "company", "clients", "pricing", "marketing", "freelance"],
  },
  {
    name: "Career & Studies",
    slug: "career-studies",
    aliases: ["career", "job", "cv", "resume", "interview", "study", "school", "application", "letter"],
  },
  {
    name: "Documents & Admin",
    slug: "documents-admin",
    aliases: ["document", "admin", "forms", "letter", "official", "visa", "caf", "cpam", "crous"],
  },
  {
    name: "Tech & Digital",
    slug: "tech-digital",
    aliases: ["tech", "coding", "website", "it", "computer", "digital", "app"],
  },
  {
    name: "Cooking & Skills",
    slug: "cooking-skills",
    aliases: ["cooking", "recipe", "food", "cook", "skill", "learn", "baking", "meal"],
  },
  {
    name: "Faith & Religion",
    slug: "faith-religion",
    aliases: ["religion", "faith", "islam", "christianity", "judaism", "spiritual", "god", "prayer", "church", "mosque"],
  },
  {
    name: "Languages & Culture",
    slug: "languages-culture",
    aliases: ["language", "translation", "culture", "speak", "french", "english", "message"],
  },
  {
    name: "Other",
    slug: "other",
    aliases: ["other", "anything", "custom"],
  },
];

export const HELP_TYPE_FILTERS = [
  { value: "", label: "Any help type" },
  { value: "ADVICE", label: "Advice" },
  { value: "EXPLANATION", label: "Explanation" },
  { value: "TEACHING", label: "Teaching" },
  { value: "PRACTICAL_GUIDANCE", label: "Practical guidance" },
  { value: "PERSONAL_EXPERIENCE", label: "Personal experience" },
  { value: "EMOTIONAL_SUPPORT", label: "Emotional support" },
  { value: "RELIGIOUS_DISCUSSION", label: "Religious discussion" },
  { value: "BUSINESS_MENTORING", label: "Business mentoring" },
  { value: "OTHER", label: "Other" },
];

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9а-яё\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalize(value)
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

function expertSearchText(expert: SearchableExpert) {
  const services = expert.services ?? [];

  return normalize(
    [
      expert.user?.name,
      expert.user?.email,
      expert.headline,
      expert.bio,
      expert.country,
      expert.timezone,
      ...(expert.languages ?? []),
      ...(expert.skills ?? []),
      ...(expert.tags ?? []),
      ...services.flatMap((service) => [
        service.title,
        service.description,
        service.helpType,
        ...(service.tags ?? []),
        service.category?.name,
        service.category?.slug,
        service.subcategory?.name,
        service.subcategory?.slug,
      ]),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function getActiveServices(expert: SearchableExpert) {
  return (expert.services ?? []).filter((service) => service.isActive ?? true);
}

function matchesQuery(expert: SearchableExpert, query: string) {
  const tokens = tokenize(query);

  if (tokens.length === 0) {
    return true;
  }

  const text = expertSearchText(expert);

  return tokens.every((token) => text.includes(token));
}

function matchesCategory(expert: SearchableExpert, categorySlug: string) {
  if (!categorySlug) {
    return true;
  }

  return getActiveServices(expert).some((service) => {
    return service.category?.slug === categorySlug || service.subcategory?.slug === categorySlug;
  });
}

function matchesHelpType(expert: SearchableExpert, helpType: string) {
  if (!helpType) {
    return true;
  }

  return getActiveServices(expert).some((service) => service.helpType === helpType);
}

function matchesLanguage(expert: SearchableExpert, language: string) {
  if (!language.trim()) {
    return true;
  }

  const wanted = normalize(language);

  return (expert.languages ?? []).some((item) => normalize(item).includes(wanted));
}

function matchesMaxPrice(expert: SearchableExpert, maxPrice: string) {
  if (!maxPrice.trim()) {
    return true;
  }

  const euros = Number(maxPrice.replace(",", "."));

  if (!Number.isFinite(euros) || euros <= 0) {
    return true;
  }

  const maxCents = Math.round(euros * 100);
  const activeServices = getActiveServices(expert);

  if (activeServices.length === 0) {
    return false;
  }

  return activeServices.some((service) => (service.priceCents ?? Infinity) <= maxCents);
}

function scoreExpert(expert: SearchableExpert, query: string) {
  const text = expertSearchText(expert);
  const tokens = tokenize(query);
  let score = 0;

  for (const token of tokens) {
    if (text.includes(token)) score += 4;
  }

  if (expert.isVerified) score += 8;
  score += Math.min(expert.rating ?? 0, 5);
  score += Math.min(expert.totalReviews ?? 0, 20) * 0.25;
  score += Math.min(expert.totalSessions ?? 0, 50) * 0.1;
  score += (expert.availability?.length ?? 0) > 0 ? 6 : 0;
  score += getActiveServices(expert).length > 0 ? 5 : 0;

  return score;
}

export function guessCategoryFromQuery(query: string) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return null;
  }

  const scored = MARKETPLACE_CATEGORIES.map((category) => {
    const score = category.aliases.reduce((total, alias) => {
      return normalizedQuery.includes(normalize(alias)) ? total + 1 : total;
    }, 0);

    return { category, score };
  }).sort((a, b) => b.score - a.score);

  return scored[0]?.score > 0 ? scored[0].category : null;
}

export function useExpertSearch<TExpert extends SearchableExpert>(
  experts: TExpert[],
  initialFilters: Partial<ExpertSearchFilters> = {},
) {
  const [filters, setFilters] = useState<ExpertSearchFilters>({
    ...DEFAULT_EXPERT_SEARCH_FILTERS,
    ...initialFilters,
  });

  const filteredExperts = useMemo(() => {
    return experts
      .filter((expert) => matchesQuery(expert, filters.query))
      .filter((expert) => matchesCategory(expert, filters.categorySlug))
      .filter((expert) => matchesHelpType(expert, filters.helpType))
      .filter((expert) => matchesLanguage(expert, filters.language))
      .filter((expert) => matchesMaxPrice(expert, filters.maxPrice))
      .filter((expert) => (filters.onlyAvailable ? (expert.availability?.length ?? 0) > 0 : true))
      .filter((expert) => (filters.onlyVerified ? Boolean(expert.isVerified) : true))
      .sort((a, b) => scoreExpert(b, filters.query) - scoreExpert(a, filters.query));
  }, [experts, filters]);

  const suggestedCategory = useMemo(() => {
    return guessCategoryFromQuery(filters.query);
  }, [filters.query]);

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === "onlyAvailable" || key === "onlyVerified") {
      return value === true;
    }

    return String(value).trim().length > 0;
  });

  function updateFilter<TKey extends keyof ExpertSearchFilters>(
    key: TKey,
    value: ExpertSearchFilters[TKey],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters(DEFAULT_EXPERT_SEARCH_FILTERS);
  }

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    filteredExperts,
    hasActiveFilters,
    suggestedCategory,
    noResults: hasActiveFilters && filteredExperts.length === 0,
  };
}

export function usePlaceholder() {
  return null;
}
