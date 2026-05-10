"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/get-current-user";

const MAX_AVATAR_SIZE_BYTES = 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ALLOWED_DURATIONS = [15, 30, 45, 60];

const MAX_LIST_ITEMS = 24;
const MAX_TAG_LENGTH = 40;
const MAX_PRICE_EUR = 1000;

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
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

function redirectWithError(path: string, message: string): never {
  redirectWithSearch(path, {
    error: message,
  });
}

function cleanText(value: string, maxLength = 2000) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => cleanText(item, MAX_TAG_LENGTH))
    .filter(Boolean)
    .filter(
      (item, index, array) =>
        array.findIndex(
          (currentItem) => currentItem.toLowerCase() === item.toLowerCase(),
        ) === index,
    )
    .slice(0, MAX_LIST_ITEMS);
}

function createSlug(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return slug || "general";
}

function parsePriceCents(value: string) {
  const normalized = value.replace(",", ".").trim();
  const price = Number(normalized);

  if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE_EUR) {
    return null;
  }

  return Math.round(price * 100);
}

function parseDuration(value: string) {
  const duration = Number(value);

  if (!Number.isInteger(duration) || !ALLOWED_DURATIONS.includes(duration)) {
    return null;
  }

  return duration;
}

async function getAvatarDataUrl(formData: FormData, errorPath: string) {
  const avatar = formData.get("avatar");

  if (!(avatar instanceof File)) {
    return null;
  }

  if (avatar.size === 0) {
    return null;
  }

  if (!ALLOWED_AVATAR_TYPES.includes(avatar.type)) {
    redirectWithError(errorPath, "invalid-avatar");
  }

  if (avatar.size > MAX_AVATAR_SIZE_BYTES) {
    redirectWithError(errorPath, "avatar-too-large");
  }

  const buffer = Buffer.from(await avatar.arrayBuffer());
  const base64 = buffer.toString("base64");

  return `data:${avatar.type};base64,${base64}`;
}

async function getCurrentExpertProfile() {
  const { user } = await requireRole(["expert", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const expert = await prisma.expertProfile.findFirst({
    where: {
      user: {
        email,
      },
    },
    include: {
      user: true,
    },
  });

  if (!expert) {
    redirect("/become-expert");
  }

  return expert;
}

async function getOrCreateCategory(categoryName: string) {
  const cleanCategoryName = cleanText(categoryName, 80);
  const categorySlug = createSlug(cleanCategoryName);

  if (!cleanCategoryName) {
    redirectWithError("/expert/services", "missing-required-fields");
  }

  return prisma.category.upsert({
    where: {
      slug: categorySlug,
    },
    update: {
      name: cleanCategoryName,
      isActive: true,
    },
    create: {
      name: cleanCategoryName,
      slug: categorySlug,
      description: `${cleanCategoryName} services`,
      isActive: true,
    },
  });
}

function validateProviderProfileInput({
  displayName,
  headline,
  bio,
  categoryName,
  timezone,
  languages,
  skills,
  serviceTitle,
  serviceDescription,
  durationMinutes,
  priceCents,
  errorPath,
}: {
  displayName: string;
  headline: string;
  bio: string;
  categoryName: string;
  timezone: string;
  languages: string[];
  skills: string[];
  serviceTitle: string;
  serviceDescription: string;
  durationMinutes: number | null;
  priceCents: number | null;
  errorPath: string;
}) {
  if (!displayName || !categoryName || !timezone || !serviceTitle) {
    redirectWithError(errorPath, "missing-required-fields");
  }

  if (displayName.length > 80) {
    redirectWithError(errorPath, "name-too-long");
  }

  if (headline.length < 8) {
    redirectWithError(errorPath, "headline-too-short");
  }

  if (headline.length > 120) {
    redirectWithError(errorPath, "headline-too-long");
  }

  if (bio.length < 80) {
    redirectWithError(errorPath, "bio-too-short");
  }

  if (bio.length > 1200) {
    redirectWithError(errorPath, "bio-too-long");
  }

  if (languages.length === 0) {
    redirectWithError(errorPath, "missing-languages");
  }

  if (skills.length < 2) {
    redirectWithError(errorPath, "missing-skills");
  }

  if (serviceTitle.length < 4) {
    redirectWithError(errorPath, "title-too-short");
  }

  if (serviceTitle.length > 120) {
    redirectWithError(errorPath, "title-too-long");
  }

  if (serviceDescription.length < 30) {
    redirectWithError(errorPath, "service-description-too-short");
  }

  if (serviceDescription.length > 800) {
    redirectWithError(errorPath, "service-description-too-long");
  }

  if (!durationMinutes) {
    redirectWithError(errorPath, "invalid-duration");
  }

  if (!priceCents) {
    redirectWithError(errorPath, "invalid-price");
  }
}

function validateProfileUpdateInput({
  displayName,
  headline,
  bio,
  languages,
  skills,
  errorPath,
}: {
  displayName: string;
  headline: string;
  bio: string;
  languages: string[];
  skills: string[];
  errorPath: string;
}) {
  if (!displayName) {
    redirectWithError(errorPath, "missing-required-fields");
  }

  if (displayName.length > 80) {
    redirectWithError(errorPath, "name-too-long");
  }

  if (headline.length < 8) {
    redirectWithError(errorPath, "headline-too-short");
  }

  if (headline.length > 120) {
    redirectWithError(errorPath, "headline-too-long");
  }

  if (bio.length < 80) {
    redirectWithError(errorPath, "bio-too-short");
  }

  if (bio.length > 1200) {
    redirectWithError(errorPath, "bio-too-long");
  }

  if (languages.length === 0) {
    redirectWithError(errorPath, "missing-languages");
  }

  if (skills.length < 2) {
    redirectWithError(errorPath, "missing-skills");
  }
}

function validateServiceInput({
  categoryName,
  title,
  description,
  durationMinutes,
  priceCents,
  errorPath,
}: {
  categoryName: string;
  title: string;
  description: string;
  durationMinutes: number | null;
  priceCents: number | null;
  errorPath: string;
}) {
  if (!categoryName || !title || !description) {
    redirectWithError(errorPath, "missing-required-fields");
  }

  if (title.length < 4) {
    redirectWithError(errorPath, "title-too-short");
  }

  if (title.length > 120) {
    redirectWithError(errorPath, "title-too-long");
  }

  if (description.length < 30) {
    redirectWithError(errorPath, "description-too-short");
  }

  if (description.length > 800) {
    redirectWithError(errorPath, "description-too-long");
  }

  if (!durationMinutes) {
    redirectWithError(errorPath, "invalid-duration");
  }

  if (!priceCents) {
    redirectWithError(errorPath, "invalid-price");
  }
}

function revalidateExpertPaths(expertId: string) {
  revalidatePath("/");
  revalidatePath("/expert");
  revalidatePath("/expert/profile");
  revalidatePath("/expert/services");
  revalidatePath("/expert/availability");
  revalidatePath("/expert/settings");
  revalidatePath("/expert/stats");
  revalidatePath("/become-expert");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expertId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/experts");
}

export async function createProviderProfileAction(formData: FormData) {
  const { user } = await requireRole(["buyer", "expert", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirectWithError("/become-expert", "not-signed-in");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      expertProfile: true,
    },
  });

  if (existingUser?.expertProfile) {
    redirectWithError("/become-expert", "profile-already-exists");
  }

  const displayName = cleanText(
    getStringValue(formData, "displayName") || user.name || email,
    80,
  );

  const headline = cleanText(getStringValue(formData, "headline"), 120);
  const bio = getStringValue(formData, "bio").trim().slice(0, 1200);
  const categoryName = cleanText(getStringValue(formData, "category"), 80);
  const country = cleanText(getStringValue(formData, "country"), 80);
  const timezone =
    cleanText(getStringValue(formData, "timezone"), 80) || "Europe/Paris";

  const languages = parseList(getStringValue(formData, "languages"));
  const skills = parseList(getStringValue(formData, "skills"));
  const tags = parseList(getStringValue(formData, "tags"));

  const serviceTitle = cleanText(getStringValue(formData, "serviceTitle"), 120);

  const serviceDescription = getStringValue(formData, "serviceDescription")
    .trim()
    .slice(0, 800);

  const durationMinutes = parseDuration(
    getStringValue(formData, "durationMinutes"),
  );

  const priceCents = parsePriceCents(getStringValue(formData, "price"));
  const avatarDataUrl = await getAvatarDataUrl(formData, "/become-expert");

  validateProviderProfileInput({
    displayName,
    headline,
    bio,
    categoryName,
    timezone,
    languages,
    skills,
    serviceTitle,
    serviceDescription,
    durationMinutes,
    priceCents,
    errorPath: "/become-expert",
  });

  const categorySlug = createSlug(categoryName);

  const expertProfileId = await prisma.$transaction(async (tx) => {
    const dbUser = await tx.user.upsert({
      where: {
        email,
      },
      update: {
        name: displayName,
        role: "EXPERT",
        ...(avatarDataUrl
          ? {
              avatarUrl: avatarDataUrl,
            }
          : {}),
      },
      create: {
        email,
        name: displayName,
        role: "EXPERT",
        ...(avatarDataUrl
          ? {
              avatarUrl: avatarDataUrl,
            }
          : {}),
      },
    });

    const existingProfile = await tx.expertProfile.findUnique({
      where: {
        userId: dbUser.id,
      },
    });

    if (existingProfile) {
      redirectWithError("/become-expert", "profile-already-exists");
    }

    const category = await tx.category.upsert({
      where: {
        slug: categorySlug,
      },
      update: {
        name: categoryName,
        isActive: true,
      },
      create: {
        name: categoryName,
        slug: categorySlug,
        description: `${categoryName} services`,
        isActive: true,
      },
    });

    const expertProfile = await tx.expertProfile.create({
      data: {
        userId: dbUser.id,
        headline,
        bio,
        country: country || null,
        timezone,
        languages,
        skills,
        tags,
        status: "APPROVED",
        isVerified: false,
      },
    });

    await tx.service.create({
      data: {
        expertId: expertProfile.id,
        categoryId: category.id,
        title: serviceTitle,
        description: serviceDescription,
        durationMinutes: durationMinutes!,
        priceCents: priceCents!,
        currency: "EUR",
        isActive: true,
      },
    });

    return expertProfile.id;
  });

  revalidateExpertPaths(expertProfileId);

  redirect("/expert?profile=created");
}

export async function updateProviderProfileAction(formData: FormData) {
  const { user } = await requireRole(["expert", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirectWithError("/expert/profile", "not-signed-in");
  }

  const displayName = cleanText(getStringValue(formData, "displayName"), 80);
  const headline = cleanText(getStringValue(formData, "headline"), 120);
  const bio = getStringValue(formData, "bio").trim().slice(0, 1200);
  const country = cleanText(getStringValue(formData, "country"), 80);
  const timezone =
    cleanText(getStringValue(formData, "timezone"), 80) || "Europe/Paris";

  const languages = parseList(getStringValue(formData, "languages"));
  const skills = parseList(getStringValue(formData, "skills"));
  const tags = parseList(getStringValue(formData, "tags"));

  const avatarDataUrl = await getAvatarDataUrl(formData, "/expert/profile");
  const removeAvatar = getStringValue(formData, "removeAvatar") === "true";

  validateProfileUpdateInput({
    displayName,
    headline,
    bio,
    languages,
    skills,
    errorPath: "/expert/profile",
  });

  const dbUser = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      expertProfile: true,
    },
  });

  if (!dbUser?.expertProfile) {
    redirect("/become-expert");
  }

  const expertProfile = dbUser.expertProfile;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: dbUser.id,
      },
      data: {
        name: displayName,
        ...(avatarDataUrl
          ? {
              avatarUrl: avatarDataUrl,
            }
          : {}),
        ...(removeAvatar && !avatarDataUrl
          ? {
              avatarUrl: null,
            }
          : {}),
      },
    });

    await tx.expertProfile.update({
      where: {
        id: expertProfile.id,
      },
      data: {
        headline,
        bio,
        country: country || null,
        timezone,
        languages,
        skills,
        tags,
      },
    });
  });

  revalidateExpertPaths(expertProfile.id);

  redirect("/expert/profile?saved=1");
}

export async function createProviderServiceAction(formData: FormData) {
  const expert = await getCurrentExpertProfile();

  const categoryName = cleanText(getStringValue(formData, "category"), 80);
  const title = cleanText(getStringValue(formData, "title"), 120);
  const description = getStringValue(formData, "description")
    .trim()
    .slice(0, 800);

  const durationMinutes = parseDuration(
    getStringValue(formData, "durationMinutes"),
  );

  const priceCents = parsePriceCents(getStringValue(formData, "price"));

  validateServiceInput({
    categoryName,
    title,
    description,
    durationMinutes,
    priceCents,
    errorPath: "/expert/services",
  });

  const category = await getOrCreateCategory(categoryName);

  await prisma.service.create({
    data: {
      expertId: expert.id,
      categoryId: category.id,
      title,
      description,
      durationMinutes: durationMinutes!,
      priceCents: priceCents!,
      currency: "EUR",
      isActive: true,
    },
  });

  revalidateExpertPaths(expert.id);

  redirect("/expert/services?saved=1");
}

export async function updateProviderServiceAction(formData: FormData) {
  const expert = await getCurrentExpertProfile();

  const serviceId = getStringValue(formData, "serviceId");
  const categoryName = cleanText(getStringValue(formData, "category"), 80);
  const title = cleanText(getStringValue(formData, "title"), 120);
  const description = getStringValue(formData, "description")
    .trim()
    .slice(0, 800);

  const durationMinutes = parseDuration(
    getStringValue(formData, "durationMinutes"),
  );

  const priceCents = parsePriceCents(getStringValue(formData, "price"));

  if (!serviceId) {
    redirectWithError("/expert/services", "service-not-found");
  }

  validateServiceInput({
    categoryName,
    title,
    description,
    durationMinutes,
    priceCents,
    errorPath: "/expert/services",
  });

  const existingService = await prisma.service.findFirst({
    where: {
      id: serviceId,
      expertId: expert.id,
    },
  });

  if (!existingService) {
    redirectWithError("/expert/services", "service-not-found");
  }

  const category = await getOrCreateCategory(categoryName);

  await prisma.service.update({
    where: {
      id: existingService.id,
    },
    data: {
      categoryId: category.id,
      title,
      description,
      durationMinutes: durationMinutes!,
      priceCents: priceCents!,
      currency: "EUR",
    },
  });

  revalidateExpertPaths(expert.id);

  redirect("/expert/services?saved=1");
}

export async function toggleProviderServiceAction(formData: FormData) {
  const expert = await getCurrentExpertProfile();

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

  await prisma.service.update({
    where: {
      id: service.id,
    },
    data: {
      isActive: !service.isActive,
    },
  });

  revalidateExpertPaths(expert.id);

  redirect("/expert/services?saved=1");
}

export async function deleteProviderServiceAction(formData: FormData) {
  const expert = await getCurrentExpertProfile();

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
        where: {
          status: {
            in: ["PENDING", "PAID", "CONFIRMED"],
          },
        },
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
    redirectWithError("/expert/services", "service-has-active-bookings");
  }

  await prisma.service.delete({
    where: {
      id: service.id,
    },
  });

  revalidateExpertPaths(expert.id);

  redirect("/expert/services?saved=1");
}