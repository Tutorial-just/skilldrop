"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  assertRateLimit,
  getClientIp,
  rateLimitPresets,
} from "@/lib/rate-limit";
import {
  calculatePricingBreakdown,
  validateServicePrice,
} from "@/config/pricing";
import {
  SERVICE_CATEGORY_OPTIONS,
  getCategoryOption,
  getSubcategoryOption,
  serviceFormSchema,
} from "@/server/validators/service.schema";

const MAX_ACTIVE_SERVICES = 12;

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

function redirectWithSearch(
  path: string,
  params: Record<string, string | number>,
): never {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, String(value));
  });

  redirect(`${path}?${searchParams.toString()}`);
}

function redirectWithError(
  path: string,
  code: string,
  extraParams: Record<string, string | number> = {},
): never {
  redirectWithSearch(path, {
    ...extraParams,
    error: code,
  });
}

async function assertServiceRateLimit(userId: string, action: string) {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);

  assertRateLimit(
    `service:${action}:${userId}:${ip}`,
    rateLimitPresets.profileUpdate,
    "Too many service updates. Please try again later.",
  );
}

async function getCurrentExpertProfile() {
  const { user } = await requireRole(["expert", "admin"]);

  const expert = await prisma.expertProfile.findUnique({
    where: {
      userId: user.id,
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  return {
    user,
    expert,
  };
}

function revalidateServicePaths(expertId: string) {
  revalidatePath("/");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expertId}`);

  revalidatePath("/expert");
  revalidatePath("/expert/settings");
  revalidatePath("/expert/services");
  revalidatePath("/expert/stats");
  revalidatePath("/expert/earnings");

  revalidatePath("/admin");
  revalidatePath("/admin/experts");
}

function formDataToObject(formData: FormData) {
  return {
    serviceId: getStringValue(formData, "serviceId") || undefined,
    categorySlug: getStringValue(formData, "categorySlug"),
    subcategorySlug: getStringValue(formData, "subcategorySlug") || undefined,
    helpType: getStringValue(formData, "helpType") || "ADVICE",
    title: normalizeText(getStringValue(formData, "title")),
    description: normalizeText(getStringValue(formData, "description")),
    tags: getStringValue(formData, "tags"),
    durationMinutes: getStringValue(formData, "durationMinutes"),
    price: getStringValue(formData, "price"),
  };
}

function getFirstValidationCode(errorMessage: string) {
  if (errorMessage.toLowerCase().includes("category")) {
    return "invalid-category";
  }

  if (errorMessage.toLowerCase().includes("duration")) {
    return "invalid-duration";
  }

  if (errorMessage.toLowerCase().includes("price")) {
    return "invalid-price";
  }

  if (errorMessage.toLowerCase().includes("title")) {
    return "invalid-title";
  }

  if (errorMessage.toLowerCase().includes("description")) {
    return "invalid-description";
  }

  return "invalid-service";
}

async function getOrCreateCategory(categorySlug: string) {
  const categoryOption = getCategoryOption(categorySlug);

  if (!categoryOption) {
    redirectWithError("/expert/services", "invalid-category");
  }

  const sortOrder = Math.max(
    SERVICE_CATEGORY_OPTIONS.findIndex(
      (category) => category.slug === categoryOption.slug,
    ),
    0,
  );

  return prisma.category.upsert({
    where: {
      slug: categoryOption.slug,
    },
    update: {
      name: categoryOption.name,
      description: categoryOption.description,
      icon: categoryOption.icon,
      isActive: true,
    },
    create: {
      name: categoryOption.name,
      slug: categoryOption.slug,
      description: categoryOption.description,
      icon: categoryOption.icon,
      sortOrder,
      isActive: true,
    },
  });
}

async function getOrCreateSubcategory({
  categoryId,
  categorySlug,
  subcategorySlug,
}: {
  categoryId: string;
  categorySlug: string;
  subcategorySlug?: string | null;
}) {
  const subcategoryOption = getSubcategoryOption(categorySlug, subcategorySlug);

  if (!subcategoryOption) {
    return null;
  }

  return prisma.subcategory.upsert({
    where: {
      categoryId_slug: {
        categoryId,
        slug: subcategoryOption.slug,
      },
    },
    update: {
      name: subcategoryOption.name,
      isActive: true,
    },
    create: {
      categoryId,
      name: subcategoryOption.name,
      slug: subcategoryOption.slug,
      isActive: true,
    },
  });
}

async function validateCategoryPair({
  categoryId,
  subcategoryId,
}: {
  categoryId: string;
  subcategoryId: string | null;
}) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!category) {
    redirectWithError("/expert/services", "invalid-category");
  }

  if (!subcategoryId) {
    return;
  }

  const subcategory = await prisma.subcategory.findFirst({
    where: {
      id: subcategoryId,
      categoryId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!subcategory) {
    redirectWithError("/expert/services", "invalid-subcategory");
  }
}

function assertValidPrice(priceCents: number) {
  const validation = validateServicePrice(priceCents);

  if (!validation.success) {
    redirectWithError("/expert/services", "invalid-price");
  }
}

export async function createServiceAction(formData: FormData) {
  const { user, expert } = await getCurrentExpertProfile();

  await assertServiceRateLimit(user.id, "create");

  const parsed = serviceFormSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirectWithError(
      "/expert/services",
      getFirstValidationCode(parsed.error.issues[0]?.message ?? ""),
    );
  }

  const input = parsed.data;
  assertValidPrice(input.price);

  const activeServicesCount = await prisma.service.count({
    where: {
      expertId: expert.id,
      isActive: true,
    },
  });

  if (activeServicesCount >= MAX_ACTIVE_SERVICES) {
    redirectWithError("/expert/services", "too-many-active-services");
  }

  const category = await getOrCreateCategory(input.categorySlug);
  const subcategory = await getOrCreateSubcategory({
    categoryId: category.id,
    categorySlug: input.categorySlug,
    subcategorySlug: input.subcategorySlug,
  });

  await validateCategoryPair({
    categoryId: category.id,
    subcategoryId: subcategory?.id ?? null,
  });

  const createdService = await prisma.service.create({
    data: {
      expertId: expert.id,
      categoryId: category.id,
      subcategoryId: subcategory?.id ?? null,
      helpType: input.helpType,
      tags: input.tags,
      title: input.title,
      description: input.description,
      durationMinutes: input.durationMinutes,
      priceCents: input.price,
      currency: "EUR",
      isActive: true,
    },
  });

  const pricing = calculatePricingBreakdown(createdService.priceCents);

  revalidateServicePaths(expert.id);

  redirectWithSearch("/expert/services", {
    saved: 1,
    created: 1,
    service: createdService.id,
    clientTotalCents: pricing.clientTotalCents,
  });
}

export async function updateServiceAction(formData: FormData) {
  const { user, expert } = await getCurrentExpertProfile();

  await assertServiceRateLimit(user.id, "update");

  const parsed = serviceFormSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirectWithError(
      "/expert/services",
      getFirstValidationCode(parsed.error.issues[0]?.message ?? ""),
      {
        service: getStringValue(formData, "serviceId"),
      },
    );
  }

  const input = parsed.data;
  const serviceId = input.serviceId;

  if (!serviceId) {
    redirectWithError("/expert/services", "service-not-found");
  }

  assertValidPrice(input.price);

  const existingService = await prisma.service.findFirst({
    where: {
      id: serviceId,
      expertId: expert.id,
    },
  });

  if (!existingService) {
    redirectWithError("/expert/services", "service-not-found");
  }

  const category = await getOrCreateCategory(input.categorySlug);
  const subcategory = await getOrCreateSubcategory({
    categoryId: category.id,
    categorySlug: input.categorySlug,
    subcategorySlug: input.subcategorySlug,
  });

  await validateCategoryPair({
    categoryId: category.id,
    subcategoryId: subcategory?.id ?? null,
  });

  const hasActiveFutureBookings = await prisma.booking.findFirst({
    where: {
      serviceId,
      status: {
        in: ["PENDING", "PAID", "CONFIRMED"],
      },
      startTime: {
        gte: new Date(),
      },
    },
    select: {
      id: true,
    },
  });

  if (hasActiveFutureBookings) {
    const safeFieldsOnly =
      existingService.durationMinutes === input.durationMinutes &&
      existingService.priceCents === input.price;

    if (!safeFieldsOnly) {
      redirectWithError("/expert/services", "service-has-active-bookings", {
        service: serviceId,
      });
    }
  }

  const updatedService = await prisma.service.update({
    where: {
      id: serviceId,
    },
    data: {
      categoryId: category.id,
      subcategoryId: subcategory?.id ?? null,
      helpType: input.helpType,
      tags: input.tags,
      title: input.title,
      description: input.description,
      durationMinutes: input.durationMinutes,
      priceCents: input.price,
      currency: "EUR",
    },
  });

  const pricing = calculatePricingBreakdown(updatedService.priceCents);

  revalidateServicePaths(expert.id);

  redirectWithSearch("/expert/services", {
    saved: 1,
    updated: 1,
    service: updatedService.id,
    clientTotalCents: pricing.clientTotalCents,
  });
}

export async function toggleServiceStatusAction(formData: FormData) {
  const { user, expert } = await getCurrentExpertProfile();

  await assertServiceRateLimit(user.id, "toggle");

  const serviceId = getStringValue(formData, "serviceId");

  if (!serviceId) {
    redirectWithError("/expert/services", "service-not-found");
  }

  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      expertId: expert.id,
    },
  });

  if (!service) {
    redirectWithError("/expert/services", "service-not-found");
  }

  if (!service.isActive) {
    const activeServicesCount = await prisma.service.count({
      where: {
        expertId: expert.id,
        isActive: true,
      },
    });

    if (activeServicesCount >= MAX_ACTIVE_SERVICES) {
      redirectWithError("/expert/services", "too-many-active-services");
    }
  }

  await prisma.service.update({
    where: {
      id: service.id,
    },
    data: {
      isActive: !service.isActive,
    },
  });

  revalidateServicePaths(expert.id);

  redirectWithSearch("/expert/services", {
    saved: 1,
    service: service.id,
  });
}

export async function deleteServiceAction(formData: FormData) {
  const { user, expert } = await getCurrentExpertProfile();

  await assertServiceRateLimit(user.id, "delete");

  const serviceId = getStringValue(formData, "serviceId");

  if (!serviceId) {
    redirectWithError("/expert/services", "service-not-found");
  }

  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      expertId: expert.id,
    },
    include: {
      bookings: {
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!service) {
    redirectWithError("/expert/services", "service-not-found");
  }

  if (service.bookings.length > 0) {
    await prisma.service.update({
      where: {
        id: service.id,
      },
      data: {
        isActive: false,
      },
    });

    revalidateServicePaths(expert.id);

    redirectWithSearch("/expert/services", {
      archived: 1,
      service: service.id,
    });
  }

  await prisma.service.delete({
    where: {
      id: service.id,
    },
  });

  revalidateServicePaths(expert.id);

  redirectWithSearch("/expert/services", {
    deleted: 1,
  });
}

// Backward-compatible aliases, in case an old component still imports these names.
export const createProviderServiceAction = createServiceAction;
export const updateProviderServiceAction = updateServiceAction;
export const toggleProviderServiceAction = toggleServiceStatusAction;
export const deleteProviderServiceAction = deleteServiceAction;
