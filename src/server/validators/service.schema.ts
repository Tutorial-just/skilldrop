import { z } from "zod";

export const SERVICE_CATEGORY_OPTIONS = [
  {
    name: "Life & Everyday",
    slug: "life-everyday",
    description: "Practical help for everyday problems, choices and small life situations.",
    icon: "home",
    subcategories: [
      { name: "Everyday decisions", slug: "everyday-decisions" },
      { name: "Local help", slug: "local-help" },
      { name: "Personal organization", slug: "personal-organization" },
      { name: "Practical life advice", slug: "practical-life-advice" },
    ],
  },
  {
    name: "Relationships",
    slug: "relationships",
    description: "Advice about communication, dating, confidence and social situations.",
    icon: "heart",
    subcategories: [
      { name: "Dating advice", slug: "dating-advice" },
      { name: "Communication", slug: "communication" },
      { name: "Confidence", slug: "confidence" },
      { name: "Family relationships", slug: "family-relationships" },
    ],
  },
  {
    name: "Business",
    slug: "business",
    description: "Help with ideas, first clients, pricing, marketing and company building.",
    icon: "briefcase",
    subcategories: [
      { name: "Start a company", slug: "start-a-company" },
      { name: "Find first clients", slug: "find-first-clients" },
      { name: "Pricing", slug: "pricing" },
      { name: "Marketing", slug: "marketing" },
      { name: "Freelance", slug: "freelance" },
    ],
  },
  {
    name: "Career & Studies",
    slug: "career-studies",
    description: "CV, jobs, interviews, school applications and study guidance.",
    icon: "graduation-cap",
    subcategories: [
      { name: "CV review", slug: "cv-review" },
      { name: "Motivation letter", slug: "motivation-letter" },
      { name: "Interview preparation", slug: "interview-preparation" },
      { name: "Study applications", slug: "study-applications" },
      { name: "Job search", slug: "job-search" },
    ],
  },
  {
    name: "Documents & Admin",
    slug: "documents-admin",
    description: "Help understanding documents, forms, official messages and admin steps.",
    icon: "file-text",
    subcategories: [
      { name: "Understand a document", slug: "understand-a-document" },
      { name: "Forms and applications", slug: "forms-and-applications" },
      { name: "French admin help", slug: "french-admin-help" },
      { name: "Official messages", slug: "official-messages" },
    ],
  },
  {
    name: "Tech & Digital",
    slug: "tech-digital",
    description: "Help with websites, coding, IT problems, tools and digital setup.",
    icon: "monitor",
    subcategories: [
      { name: "Website help", slug: "website-help" },
      { name: "Coding help", slug: "coding-help" },
      { name: "IT support", slug: "it-support" },
      { name: "Digital tools", slug: "digital-tools" },
    ],
  },
  {
    name: "Cooking & Skills",
    slug: "cooking-skills",
    description: "Learn recipes, daily skills, practical know-how and beginner guidance.",
    icon: "chef-hat",
    subcategories: [
      { name: "Recipes", slug: "recipes" },
      { name: "Cooking for beginners", slug: "cooking-for-beginners" },
      { name: "Meal planning", slug: "meal-planning" },
      { name: "Practical skills", slug: "practical-skills" },
    ],
  },
  {
    name: "Faith & Religion",
    slug: "faith-religion",
    description: "Respectful conversations to understand faith, religion and spiritual questions.",
    icon: "sparkles",
    subcategories: [
      { name: "Learn about Christianity", slug: "learn-about-christianity" },
      { name: "Learn about Islam", slug: "learn-about-islam" },
      { name: "Learn about Judaism", slug: "learn-about-judaism" },
      { name: "Spiritual questions", slug: "spiritual-questions" },
      { name: "Religious practices", slug: "religious-practices" },
    ],
  },
  {
    name: "Languages & Culture",
    slug: "languages-culture",
    description: "Language practice, translation, culture questions and relocation context.",
    icon: "globe",
    subcategories: [
      { name: "Language practice", slug: "language-practice" },
      { name: "Translation help", slug: "translation-help" },
      { name: "Culture questions", slug: "culture-questions" },
      { name: "Moving abroad", slug: "moving-abroad" },
    ],
  },
  {
    name: "Other",
    slug: "other",
    description: "For useful help that does not fit another category yet.",
    icon: "circle-help",
    subcategories: [
      { name: "Other practical help", slug: "other-practical-help" },
      { name: "Personal experience", slug: "personal-experience" },
      { name: "Ask anything safe", slug: "ask-anything-safe" },
    ],
  },
] as const;

export const HELP_TYPE_OPTIONS = [
  { value: "ADVICE", label: "Advice" },
  { value: "EXPLANATION", label: "Explanation" },
  { value: "TEACHING", label: "Teaching" },
  { value: "PRACTICAL_GUIDANCE", label: "Practical guidance" },
  { value: "PERSONAL_EXPERIENCE", label: "Personal experience" },
  { value: "EMOTIONAL_SUPPORT", label: "Emotional support" },
  { value: "RELIGIOUS_DISCUSSION", label: "Religious discussion" },
  { value: "BUSINESS_MENTORING", label: "Business mentoring" },
  { value: "OTHER", label: "Other" },
] as const;

export type ServiceCategoryOption = (typeof SERVICE_CATEGORY_OPTIONS)[number];
export type HelpTypeValue = (typeof HELP_TYPE_OPTIONS)[number]["value"];

const categorySlugs = SERVICE_CATEGORY_OPTIONS.map((category) => category.slug) as [
  string,
  ...string[],
];

const helpTypeValues = HELP_TYPE_OPTIONS.map((type) => type.value) as [
  HelpTypeValue,
  ...HelpTypeValue[],
];

function cleanText(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function parseTags(value: unknown) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((tag) => cleanText(tag, 32))
    .filter(Boolean)
    .filter(
      (tag, index, tags) =>
        tags.findIndex((item) => item.toLowerCase() === tag.toLowerCase()) ===
        index,
    )
    .slice(0, 10);
}

export const serviceFormSchema = z.object({
  serviceId: z.string().trim().optional(),
  categorySlug: z.enum(categorySlugs, {
    message: "Please choose a valid category.",
  }),
  subcategorySlug: z.string().trim().max(80).optional(),
  helpType: z.enum(helpTypeValues).default("ADVICE"),
  title: z
    .string()
    .trim()
    .min(4, "Please enter a clearer offer title.")
    .max(90, "The title is too long."),
  description: z
    .string()
    .trim()
    .min(20, "Please describe your offer in more detail.")
    .max(1200, "The description is too long."),
  tags: z.preprocess(parseTags, z.array(z.string()).max(10)).default([]),
  durationMinutes: z.coerce.number().int().refine((value) => [15, 30, 45, 60].includes(value), {
    message: "Please choose a valid duration.",
  }),
  price: z
    .string()
    .trim()
    .min(1, "Please enter a price.")
    .transform((value) => Number(value.replace(",", ".")))
    .refine((value) => Number.isFinite(value), "Please enter a valid price.")
    .transform((value) => Math.round(value * 100)),
});

export type ServiceFormInput = z.input<typeof serviceFormSchema>;
export type ServiceFormValues = z.output<typeof serviceFormSchema>;

export function getCategoryOption(slug: string) {
  return SERVICE_CATEGORY_OPTIONS.find((category) => category.slug === slug) ?? null;
}

export function getSubcategoryOption(categorySlug: string, subcategorySlug?: string | null) {
  const category = getCategoryOption(categorySlug);

  if (!category || !subcategorySlug) {
    return null;
  }

  return (
    category.subcategories.find(
      (subcategory) => subcategory.slug === subcategorySlug,
    ) ?? null
  );
}
