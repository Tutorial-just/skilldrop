"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/get-current-user";

const MAX_AVATAR_SIZE_BYTES = 1024 * 1024;

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter(
      (item, index, array) =>
        array.findIndex(
          (currentItem) => currentItem.toLowerCase() === item.toLowerCase(),
        ) === index,
    );
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function parsePriceCents(value: string) {
  const normalized = value.replace(",", ".").trim();
  const price = Number(normalized);

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  return Math.round(price * 100);
}

function parseDuration(value: string) {
  const duration = Number(value);
  const allowedDurations = [15, 30, 45, 60];

  if (!allowedDurations.includes(duration)) {
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

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(avatar.type)) {
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
  const categorySlug = createSlug(categoryName);

  return prisma.category.upsert({
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
}

export async function createProviderProfileAction(formData: FormData) {
  const { user } = await requireRole(["expert", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirectWithError("/become-expert", "not-signed-in");
  }

  const displayName = getStringValue(formData, "displayName") || user.name || email;

  const headline = getStringValue(formData, "headline");
  const bio = getStringValue(formData, "bio");
  const categoryName = getStringValue(formData, "category");
  const country = getStringValue(formData, "country");
  const timezone = getStringValue(formData, "timezone") || "Europe/Paris";
  const languages = parseList(getStringValue(formData, "languages"));
  const skills = parseList(getStringValue(formData, "skills"));
  const tags = parseList(getStringValue(formData, "tags"));

  const serviceTitle = getStringValue(formData, "serviceTitle");
  const serviceDescription = getStringValue(formData, "serviceDescription");
  const durationMinutes = parseDuration(
    getStringValue(formData, "durationMinutes"),
  );
  const priceCents = parsePriceCents(getStringValue(formData, "price"));
  const avatarDataUrl = await getAvatarDataUrl(formData, "/become-expert");

  if (!displayName) {
    redirectWithError("/become-expert", "missing-required-fields");
  }

  if (headline.length < 8) {
    redirectWithError("/become-expert", "headline-too-short");
  }

  if (bio.length < 80) {
    redirectWithError("/become-expert", "bio-too-short");
  }

  if (!categoryName) {
    redirectWithError("/become-expert", "missing-required-fields");
  }

  if (languages.length === 0) {
    redirectWithError("/become-expert", "missing-languages");
  }

  if (skills.length < 2) {
    redirectWithError("/become-expert", "missing-skills");
  }

  if (!serviceTitle) {
    redirectWithError("/become-expert", "missing-required-fields");
  }

  if (serviceDescription.length < 30) {
    redirectWithError("/become-expert", "service-description-too-short");
  }

  if (!durationMinutes) {
    redirectWithError("/become-expert", "invalid-duration");
  }

  if (!priceCents) {
    redirectWithError("/become-expert", "invalid-price");
  }

  const categorySlug = createSlug(categoryName);

  await prisma.$transaction(async (tx) => {
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

    const expertProfile = await tx.expertProfile.upsert({
      where: {
        userId: dbUser.id,
      },
      update: {
        headline,
        bio,
        country: country || null,
        timezone,
        languages,
        skills,
        tags,
        status: "APPROVED",
      },
      create: {
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

    const existingActiveService = await tx.service.findFirst({
      where: {
        expertId: expertProfile.id,
        isActive: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (existingActiveService) {
      await tx.service.update({
        where: {
          id: existingActiveService.id,
        },
        data: {
          categoryId: category.id,
          title: serviceTitle,
          description: serviceDescription,
          durationMinutes,
          priceCents,
          currency: "EUR",
          isActive: true,
        },
      });
    } else {
      await tx.service.create({
        data: {
          expertId: expertProfile.id,
          categoryId: category.id,
          title: serviceTitle,
          description: serviceDescription,
          durationMinutes,
          priceCents,
          currency: "EUR",
          isActive: true,
        },
      });
    }
  });

  revalidatePath("/expert");
  revalidatePath("/expert/profile");
  revalidatePath("/experts");

  redirect("/expert");
}

export async function updateProviderProfileAction(formData: FormData) {
  const { user } = await requireRole(["expert", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirectWithError("/expert/profile", "not-signed-in");
  }

  const displayName = getStringValue(formData, "displayName");
  const headline = getStringValue(formData, "headline");
  const bio = getStringValue(formData, "bio");
  const country = getStringValue(formData, "country");
  const timezone = getStringValue(formData, "timezone") || "Europe/Paris";
  const languages = parseList(getStringValue(formData, "languages"));
  const skills = parseList(getStringValue(formData, "skills"));
  const tags = parseList(getStringValue(formData, "tags"));
  const avatarDataUrl = await getAvatarDataUrl(formData, "/expert/profile");
  const removeAvatar = getStringValue(formData, "removeAvatar") === "true";

  if (!displayName) {
    redirectWithError("/expert/profile", "missing-required-fields");
  }

  if (headline.length < 8) {
    redirectWithError("/expert/profile", "headline-too-short");
  }

  if (bio.length < 80) {
    redirectWithError("/expert/profile", "bio-too-short");
  }

  if (languages.length === 0) {
    redirectWithError("/expert/profile", "missing-languages");
  }

  if (skills.length < 2) {
    redirectWithError("/expert/profile", "missing-skills");
  }

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

  revalidatePath("/expert");
  revalidatePath("/expert/profile");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expertProfile.id}`);

  redirect("/expert/profile?saved=1");
}

export async function createProviderServiceAction(formData: FormData) {
  const expert = await getCurrentExpertProfile();

  const categoryName = getStringValue(formData, "category");
  const title = getStringValue(formData, "title");
  const description = getStringValue(formData, "description");
  const durationMinutes = parseDuration(
    getStringValue(formData, "durationMinutes"),
  );
  const priceCents = parsePriceCents(getStringValue(formData, "price"));

  if (!categoryName) {
    redirectWithError("/expert/services", "missing-required-fields");
  }

  if (title.length < 4) {
    redirectWithError("/expert/services", "title-too-short");
  }

  if (description.length < 30) {
    redirectWithError("/expert/services", "description-too-short");
  }

  if (!durationMinutes) {
    redirectWithError("/expert/services", "invalid-duration");
  }

  if (!priceCents) {
    redirectWithError("/expert/services", "invalid-price");
  }

  const category = await getOrCreateCategory(categoryName);

  await prisma.service.create({
    data: {
      expertId: expert.id,
      categoryId: category.id,
      title,
      description,
      durationMinutes,
      priceCents,
      currency: "EUR",
      isActive: true,
    },
  });

  revalidatePath("/expert");
  revalidatePath("/expert/services");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expert.id}`);

  redirect("/expert/services");
}

export async function updateProviderServiceAction(formData: FormData) {
  const expert = await getCurrentExpertProfile();

  const serviceId = getStringValue(formData, "serviceId");
  const categoryName = getStringValue(formData, "category");
  const title = getStringValue(formData, "title");
  const description = getStringValue(formData, "description");
  const durationMinutes = parseDuration(
    getStringValue(formData, "durationMinutes"),
  );
  const priceCents = parsePriceCents(getStringValue(formData, "price"));

  if (!serviceId) {
    redirectWithError("/expert/services", "service-not-found");
  }

  if (!categoryName) {
    redirectWithError("/expert/services", "missing-required-fields");
  }

  if (title.length < 4) {
    redirectWithError("/expert/services", "title-too-short");
  }

  if (description.length < 30) {
    redirectWithError("/expert/services", "description-too-short");
  }

  if (!durationMinutes) {
    redirectWithError("/expert/services", "invalid-duration");
  }

  if (!priceCents) {
    redirectWithError("/expert/services", "invalid-price");
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

  const category = await getOrCreateCategory(categoryName);

  await prisma.service.update({
    where: {
      id: existingService.id,
    },
    data: {
      categoryId: category.id,
      title,
      description,
      durationMinutes,
      priceCents,
      currency: "EUR",
    },
  });

  revalidatePath("/expert");
  revalidatePath("/expert/services");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expert.id}`);

  redirect("/expert/services");
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

  revalidatePath("/expert");
  revalidatePath("/expert/services");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expert.id}`);

  redirect("/expert/services");
}