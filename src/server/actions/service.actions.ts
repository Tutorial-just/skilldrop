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

const MAX_TITLE_LENGTH = 90;
const MAX_DESCRIPTION_LENGTH = 1200;
const MIN_DESCRIPTION_LENGTH = 20;
const ALLOWED_DURATIONS = [15, 30, 45, 60];
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

function parseDuration(value: string) {
  const duration = Number(value);

  if (!Number.isInteger(duration) || !ALLOWED_DURATIONS.includes(duration)) {
    return null;
  }

  return duration;
}

function parsePriceCents(value: string) {
  const normalized = value.replace(",", ".").trim();
  const priceEuros = Number(normalized);

  if (!Number.isFinite(priceEuros)) {
    return null;
  }

  const priceCents = Math.round(priceEuros * 100);

  const validation = validateServicePrice(priceCents);

  if (!validation.success) {
    return null;
  }

  return priceCents;
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

function validateServiceInput({
  title,
  description,
  durationMinutes,
  priceCents,
}: {
  title: string;
  description: string;
  durationMinutes: number | null;
  priceCents: number | null;
}) {
  if (!title || title.length > MAX_TITLE_LENGTH) {
    return "invalid-title";
  }

  if (
    !description ||
    description.length < MIN_DESCRIPTION_LENGTH ||
    description.length > MAX_DESCRIPTION_LENGTH
  ) {
    return "invalid-description";
  }

  if (!durationMinutes) {
    return "invalid-duration";
  }

  if (priceCents === null) {
    return "invalid-price";
  }

  return null;
}

export async function createServiceAction(formData: FormData) {
  const { user, expert } = await getCurrentExpertProfile();

  await assertServiceRateLimit(user.id, "create");

  const title = normalizeText(getStringValue(formData, "title"));
  const description = normalizeText(getStringValue(formData, "description"));
  const categoryId = getStringValue(formData, "categoryId") || null;
  const durationMinutes = parseDuration(getStringValue(formData, "durationMinutes"));
  const priceCents = parsePriceCents(getStringValue(formData, "price"));

  const validationError = validateServiceInput({
    title,
    description,
    durationMinutes,
    priceCents,
  });

  if (validationError) {
    redirectWithError("/expert/services", validationError);
  }

  const activeServicesCount = await prisma.service.count({
    where: {
      expertId: expert.id,
      isActive: true,
    },
  });

  if (activeServicesCount >= MAX_ACTIVE_SERVICES) {
    redirectWithError("/expert/services", "too-many-active-services");
  }

  if (categoryId) {
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
  }

  const createdService = await prisma.service.create({
    data: {
      expertId: expert.id,
      categoryId,
      title,
      description,
      durationMinutes: durationMinutes!,
      priceCents: priceCents!,
      currency: "EUR",
      isActive: true,
    },
  });

  const pricing = calculatePricingBreakdown(createdService.priceCents);

  revalidateServicePaths(expert.id);

  redirectWithSearch("/expert/services", {
    saved: 1,
    service: createdService.id,
    clientTotalCents: pricing.clientTotalCents,
  });
}

export async function updateServiceAction(formData: FormData) {
  const { user, expert } = await getCurrentExpertProfile();

  await assertServiceRateLimit(user.id, "update");

  const serviceId = getStringValue(formData, "serviceId");
  const title = normalizeText(getStringValue(formData, "title"));
  const description = normalizeText(getStringValue(formData, "description"));
  const categoryId = getStringValue(formData, "categoryId") || null;
  const durationMinutes = parseDuration(getStringValue(formData, "durationMinutes"));
  const priceCents = parsePriceCents(getStringValue(formData, "price"));

  if (!serviceId) {
    redirectWithError("/expert/services", "service-not-found");
  }

  const validationError = validateServiceInput({
    title,
    description,
    durationMinutes,
    priceCents,
  });

  if (validationError) {
    redirectWithError("/expert/services", validationError, {
      service: serviceId,
    });
  }

  const existingService = await prisma.service.findFirst({
    where: {
      id: serviceId,
      expertId: expert.id,
    },
  });

  if (!existingService) {
    redirectWithError("/expert/services", "service-not-found");
  }

  if (categoryId) {
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
      redirectWithError("/expert/services", "invalid-category", {
        service: serviceId,
      });
    }
  }

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
      existingService.durationMinutes === durationMinutes &&
      existingService.priceCents === priceCents;

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
      categoryId,
      title,
      description,
      durationMinutes: durationMinutes!,
      priceCents: priceCents!,
      currency: "EUR",
    },
  });

  const pricing = calculatePricingBreakdown(updatedService.priceCents);

  revalidateServicePaths(expert.id);

  redirectWithSearch("/expert/services", {
    saved: 1,
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
          status: true,
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