"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { HelpRequestStatus, HelpType, HelpUrgency } from "@prisma/client";

import { getCurrentUser, requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { trackProductEvent } from "@/lib/product-analytics";
import {
  assertRateLimit,
  getClientIp,
  rateLimitPresets,
} from "@/lib/rate-limit";

const MIN_QUERY_LENGTH = 3;
const MAX_QUERY_LENGTH = 260;
const MAX_LANGUAGE_LENGTH = 40;

const validHelpTypes = new Set<string>(Object.values(HelpType));

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

function parseHelpType(value: string) {
  const normalizedValue = value.trim().toUpperCase();

  if (!validHelpTypes.has(normalizedValue)) {
    return null;
  }

  return normalizedValue as HelpType;
}

function parseUrgency(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "today") {
    return HelpUrgency.TODAY;
  }

  if (normalizedValue === "this-week" || normalizedValue === "this_week") {
    return HelpUrgency.THIS_WEEK;
  }

  return HelpUrgency.FLEXIBLE;
}

function urgencyToSearchParam(urgency: HelpUrgency) {
  if (urgency === HelpUrgency.TODAY) {
    return "today";
  }

  if (urgency === HelpUrgency.THIS_WEEK) {
    return "this-week";
  }

  return "";
}

function parseBudgetMaxCents(value: string) {
  if (!value) {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return null;
  }

  return Math.round(numberValue * 100);
}

function redirectWithSearch(path: string, params: Record<string, string | number | null | undefined>): never {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      searchParams.set(key, String(value));
    }
  });

  redirect(`${path}?${searchParams.toString()}`);
}

async function assertHelpRequestRateLimit(userIdOrEmail: string, action: string) {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);

  assertRateLimit(
    `help-request:${action}:${userIdOrEmail}:${ip}`,
    rateLimitPresets.profileUpdate,
    "Too many help requests. Please try again later.",
  );
}

async function findCategoryOrSubcategory(slug: string) {
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedSlug) {
    return { categoryId: null, subcategoryId: null, categorySlug: "" };
  }

  const category = await prisma.category.findFirst({
    where: {
      slug: normalizedSlug,
      isActive: true,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (category) {
    return {
      categoryId: category.id,
      subcategoryId: null,
      categorySlug: category.slug,
    };
  }

  const subcategory = await prisma.subcategory.findFirst({
    where: {
      slug: normalizedSlug,
      isActive: true,
      category: {
        isActive: true,
      },
    },
    select: {
      id: true,
      slug: true,
      categoryId: true,
      category: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (subcategory) {
    return {
      categoryId: subcategory.categoryId,
      subcategoryId: subcategory.id,
      categorySlug: subcategory.slug || subcategory.category.slug,
    };
  }

  return { categoryId: null, subcategoryId: null, categorySlug: normalizedSlug };
}

export async function createHelpRequestAction(formData: FormData) {
  const currentUser = await getCurrentUser();

  const query = normalizeText(getStringValue(formData, "q") || getStringValue(formData, "query"));
  const categorySlug = normalizeSlug(getStringValue(formData, "category"));
  const helpType = parseHelpType(getStringValue(formData, "helpType"));
  const urgency = parseUrgency(getStringValue(formData, "urgency"));
  const preferredLanguage = normalizeText(getStringValue(formData, "language")).toLowerCase();
  const budgetMaxCents = parseBudgetMaxCents(getStringValue(formData, "maxPrice"));

  const userKey = currentUser?.user?.id ?? currentUser?.user?.email ?? "guest";
  await assertHelpRequestRateLimit(userKey, "create");

  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    redirectWithSearch("/help-me", {
      error: "invalid-query",
      q: query,
    });
  }

  if (preferredLanguage.length > MAX_LANGUAGE_LENGTH) {
    redirectWithSearch("/help-me", {
      error: "invalid-language",
      q: query,
    });
  }

  const categoryMatch = await findCategoryOrSubcategory(categorySlug);

  const helpRequest = await prisma.helpRequest.create({
    data: {
      buyerId: currentUser?.user?.id ?? null,
      categoryId: categoryMatch.categoryId,
      subcategoryId: categoryMatch.subcategoryId,
      query,
      helpType,
      urgency,
      preferredLanguage: preferredLanguage || null,
      budgetMaxCents,
      status: HelpRequestStatus.OPEN,
    },
    select: {
      id: true,
    },
  });

  await trackProductEvent({
    event: "HELP_REQUEST_CREATED",
    userId: currentUser?.user?.id ?? null,
    email: currentUser?.user?.email ?? null,
    entityType: "HelpRequest",
    entityId: helpRequest.id,
    metadata: {
      hasCategory: Boolean(categoryMatch.categoryId || categoryMatch.subcategoryId),
      category: categoryMatch.categorySlug || null,
      helpType: helpType ?? null,
      urgency,
      preferredLanguage: preferredLanguage || null,
      budgetMaxCents,
    },
  });

  revalidatePath("/buyer");
  revalidatePath("/experts");

  redirectWithSearch("/experts", {
    requestId: helpRequest.id,
    q: query,
    category: categoryMatch.categorySlug,
    helpType,
    language: preferredLanguage,
    urgency: urgencyToSearchParam(urgency),
    maxPrice: budgetMaxCents ? Math.round(budgetMaxCents / 100) : null,
  });
}

export async function closeHelpRequestAction(formData: FormData) {
  const { user } = await requireRole(["buyer", "admin"]);

  await assertHelpRequestRateLimit(user.id, "close");

  const requestId = getStringValue(formData, "requestId");

  if (!requestId) {
    redirect("/buyer?error=invalid-help-request");
  }

  await prisma.helpRequest.updateMany({
    where: {
      id: requestId,
      ...(user.role === "ADMIN" ? {} : { buyerId: user.id }),
    },
    data: {
      status: HelpRequestStatus.CLOSED,
    },
  });

  revalidatePath("/buyer");
  redirect("/buyer?saved=1");
}
