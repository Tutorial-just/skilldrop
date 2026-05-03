"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/get-current-user";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function redirectWithError(path: string, message: string) {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

async function getCurrentExpertProfile() {
  const { user } = await requireRole(["expert", "admin"]);
  const email = user.email?.toLowerCase();

  if (!email) {
    return null;
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
    redirectWithError("/become-expert", "Your account email is missing.");
  }

  const displayName =
    getStringValue(formData, "displayName") ||
    (user.user_metadata?.name as string | undefined) ||
    email;

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

  if (!displayName) {
    redirectWithError("/become-expert", "Please enter your display name.");
  }

  if (headline.length < 8) {
    redirectWithError("/become-expert", "Please write a clearer headline.");
  }

  if (bio.length < 80) {
    redirectWithError(
      "/become-expert",
      "Please write at least 80 characters about yourself.",
    );
  }

  if (!categoryName) {
    redirectWithError("/become-expert", "Please choose a category.");
  }

  if (languages.length === 0) {
    redirectWithError("/become-expert", "Please add at least one language.");
  }

  if (skills.length < 2) {
    redirectWithError("/become-expert", "Please add at least two skills.");
  }

  if (!serviceTitle) {
    redirectWithError("/become-expert", "Please enter your first service title.");
  }

  if (serviceDescription.length < 30) {
    redirectWithError(
      "/become-expert",
      "Please describe your service in at least 30 characters.",
    );
  }

  if (!durationMinutes) {
    redirectWithError("/become-expert", "Please choose a valid call duration.");
  }

  if (!priceCents) {
    redirectWithError("/become-expert", "Please enter a valid price.");
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
      },
      create: {
        email,
        name: displayName,
        role: "EXPERT",
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
  revalidatePath("/experts");

  redirect("/expert");
}

export async function updateProviderProfileAction(formData: FormData) {
  const { user } = await requireRole(["expert", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirectWithError("/expert/profile", "Your account email is missing.");
  }

  const displayName = getStringValue(formData, "displayName");
  const headline = getStringValue(formData, "headline");
  const bio = getStringValue(formData, "bio");
  const country = getStringValue(formData, "country");
  const timezone = getStringValue(formData, "timezone") || "Europe/Paris";
  const languages = parseList(getStringValue(formData, "languages"));
  const skills = parseList(getStringValue(formData, "skills"));
  const tags = parseList(getStringValue(formData, "tags"));

  if (!displayName) {
    redirectWithError("/expert/profile", "Please enter your display name.");
  }

  if (headline.length < 8) {
    redirectWithError("/expert/profile", "Please write a clearer headline.");
  }

  if (bio.length < 80) {
    redirectWithError(
      "/expert/profile",
      "Please write at least 80 characters about yourself.",
    );
  }

  if (languages.length === 0) {
    redirectWithError("/expert/profile", "Please add at least one language.");
  }

  if (skills.length < 2) {
    redirectWithError("/expert/profile", "Please add at least two skills.");
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

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: dbUser.id,
      },
      data: {
        name: displayName,
      },
    });

    await tx.expertProfile.update({
      where: {
        id: dbUser.expertProfile!.id,
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
  revalidatePath(`/experts/${dbUser.expertProfile.id}`);

  redirect("/expert");
}

export async function createProviderServiceAction(formData: FormData) {
  const expert = await getCurrentExpertProfile();

  if (!expert) {
    redirect("/become-expert");
  }

  const categoryName = getStringValue(formData, "category");
  const title = getStringValue(formData, "title");
  const description = getStringValue(formData, "description");
  const durationMinutes = parseDuration(getStringValue(formData, "durationMinutes"));
  const priceCents = parsePriceCents(getStringValue(formData, "price"));

  if (!categoryName) {
    redirectWithError("/expert/services", "Please choose a category.");
  }

  if (title.length < 4) {
    redirectWithError("/expert/services", "Please enter a clearer service title.");
  }

  if (description.length < 30) {
    redirectWithError(
      "/expert/services",
      "Please describe your service in at least 30 characters.",
    );
  }

  if (!durationMinutes) {
    redirectWithError("/expert/services", "Please choose a valid duration.");
  }

  if (!priceCents) {
    redirectWithError("/expert/services", "Please enter a valid price.");
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

  if (!expert) {
    redirect("/become-expert");
  }

  const serviceId = getStringValue(formData, "serviceId");
  const categoryName = getStringValue(formData, "category");
  const title = getStringValue(formData, "title");
  const description = getStringValue(formData, "description");
  const durationMinutes = parseDuration(getStringValue(formData, "durationMinutes"));
  const priceCents = parsePriceCents(getStringValue(formData, "price"));

  if (!serviceId) {
    redirectWithError("/expert/services", "Service not found.");
  }

  if (!categoryName) {
    redirectWithError("/expert/services", "Please choose a category.");
  }

  if (title.length < 4) {
    redirectWithError("/expert/services", "Please enter a clearer service title.");
  }

  if (description.length < 30) {
    redirectWithError(
      "/expert/services",
      "Please describe your service in at least 30 characters.",
    );
  }

  if (!durationMinutes) {
    redirectWithError("/expert/services", "Please choose a valid duration.");
  }

  if (!priceCents) {
    redirectWithError("/expert/services", "Please enter a valid price.");
  }

  const existingService = await prisma.service.findFirst({
    where: {
      id: serviceId,
      expertId: expert.id,
    },
  });

  if (!existingService) {
    redirectWithError("/expert/services", "Service not found.");
  }

  const category = await getOrCreateCategory(categoryName);

  await prisma.service.update({
    where: {
      id: serviceId,
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

  if (!expert) {
    redirect("/become-expert");
  }

  const serviceId = getStringValue(formData, "serviceId");

  if (!serviceId) {
    redirectWithError("/expert/services", "Service not found.");
  }

  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      expertId: expert.id,
    },
  });

  if (!service) {
    redirectWithError("/expert/services", "Service not found.");
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