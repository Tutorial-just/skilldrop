"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/get-current-user";
import {
  assertRateLimit,
  getClientIp,
  rateLimitPresets,
} from "@/lib/rate-limit";
import { validateServicePrice } from "@/config/pricing";

const MAX_AVATAR_SIZE_BYTES = 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ALLOWED_DURATIONS = [15, 30, 45, 60];

const MAX_LIST_ITEMS = 24;
const MAX_TAG_LENGTH = 40;
const MAX_PRICE_EUR = 500;
const MAX_ACTIVE_SERVICES = 12;

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

function redirectWithError(
  path: string,
  message: string,
  extraParams: Record<string, string | number> = {},
): never {
  redirectWithSearch(path, {
    ...extraParams,
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

  const priceCents = Math.round(price * 100);
  const validation = validateServicePrice(priceCents);

  if (!validation.success) {
    return null;
  }

  return priceCents;
}

function parseDuration(value: string) {
  const duration = Number(value);

  if (!Number.isInteger(duration) || !ALLOWED_DURATIONS.includes(duration)) {
    return null;
  }

  return duration;
}

async function assertExpertRateLimit(userId: string, action: string) {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);

  assertRateLimit(
    `expert:${action}:${userId}:${ip}`,
    rateLimitPresets.profileUpdate,
    "Too many profile updates. Please try again later.",
  );
}

/**
 * Production note:
 * For a real launch, avatars should be uploaded to Supabase Storage/S3,
 * then avatarUrl should store only the public URL.
 *
 * This function currently validates avatar input but does not store base64
 * in the database, because base64 avatars can quickly bloat User rows.
 */
async function uploadAvatarFile(
  formData: FormData,
  errorPath: string,
  userId: string,
) {
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

  const extension = getSafeFileExtension(avatar.name, avatar.type);
  const storagePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const arrayBuffer = await avatar.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabaseAdmin.storage
    .from("avatars")
    .upload(storagePath, buffer, {
      contentType: avatar.type,
      upsert: true,
    });

  if (uploadError) {
    redirectWithError(errorPath, "avatar-upload-failed");
  }

  const { data } = supabaseAdmin.storage
    .from("avatars")
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

async function getCurrentExpertProfile() {
  const { user } = await requireRole(["expert", "admin"]);

  const expert = await prisma.expertProfile.findUnique({
    where: {
      userId: user.id,
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

async function ensureCanCreateActiveService(expertId: string) {
  const activeServicesCount = await prisma.service.count({
    where: {
      expertId,
      isActive: true,
    },
  });

  if (activeServicesCount >= MAX_ACTIVE_SERVICES) {
    redirectWithError("/expert/services", "too-many-active-services");
  }
}

async function hasActiveFutureBookings(serviceId: string) {
  const booking = await prisma.booking.findFirst({
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

  return Boolean(booking);
}

export async function createProviderProfileAction(formData: FormData) {
  const { user } = await requireRole(["buyer", "expert", "admin"]);

  await assertExpertRateLimit(user.id, "create-profile");

  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    include: {
      expertProfile: true,
    },
  });

  if (!existingUser) {
    redirect("/sign-in");
  }

  if (existingUser.expertProfile) {
    redirectWithError("/become-expert", "profile-already-exists");
  }

  const uploadedAvatarUrl = await uploadAvatarFile(
    formData,
    "/become-expert",
    existingUser.id,
  );

  const displayName = cleanText(
    getStringValue(formData, "displayName") ||
      user.name ||
      user.email.split("@")[0],
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
    const dbUser = await tx.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        name: displayName,
        role: "EXPERT",
        ...(uploadedAvatarUrl
          ? {
              avatarUrl: uploadedAvatarUrl,
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
      throw new Error("profile-already-exists");
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

  await assertExpertRateLimit(user.id, "update-profile");

  const displayName = cleanText(getStringValue(formData, "displayName"), 80);
  const headline = cleanText(getStringValue(formData, "headline"), 120);
  const bio = getStringValue(formData, "bio").trim().slice(0, 1200);
  const country = cleanText(getStringValue(formData, "country"), 80);
  const timezone =
    cleanText(getStringValue(formData, "timezone"), 80) || "Europe/Paris";

  const languages = parseList(getStringValue(formData, "languages"));
  const skills = parseList(getStringValue(formData, "skills"));
  const tags = parseList(getStringValue(formData, "tags"));

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
      id: user.id,
    },
    include: {
      expertProfile: true,
    },
  });

  if (!dbUser?.expertProfile) {
    redirect("/become-expert");
  }

  const expertProfile = dbUser.expertProfile;

  const uploadedAvatarUrl = removeAvatar
    ? null
    : await uploadAvatarFile(formData, "/expert/profile", dbUser.id);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: dbUser.id,
      },
      data: {
        name: displayName,
        ...(removeAvatar
          ? {
              avatarUrl: null,
            }
          : uploadedAvatarUrl
            ? {
                avatarUrl: uploadedAvatarUrl,
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

  await assertExpertRateLimit(expert.userId, "create-service");

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

  await ensureCanCreateActiveService(expert.id);

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

  await assertExpertRateLimit(expert.userId, "update-service");

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

  const activeFutureBookings = await hasActiveFutureBookings(serviceId);

  if (activeFutureBookings) {
    const changedCriticalFields =
      existingService.durationMinutes !== durationMinutes ||
      existingService.priceCents !== priceCents;

    if (changedCriticalFields) {
      redirectWithError("/expert/services", "service-has-active-bookings");
    }
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

  await assertExpertRateLimit(expert.userId, "toggle-service");

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
    await ensureCanCreateActiveService(expert.id);
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

  await assertExpertRateLimit(expert.userId, "delete-service");

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

    revalidateExpertPaths(expert.id);

    redirect("/expert/services?archived=1");
  }

  await prisma.service.delete({
    where: {
      id: service.id,
    },
  });

  revalidateExpertPaths(expert.id);

  redirect("/expert/services?deleted=1");
}

const MAX_EXPERT_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_EXPERT_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
];

function getSafeFileExtension(fileName: string, mimeType: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension && /^[a-z0-9]+$/.test(extension)) {
    return extension;
  }

  if (mimeType === "application/pdf") {
    return "pdf";
  }

  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }
  if (mimeType === "application/msword") {
    return "doc";
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) 
  {
   return "docx";
  }

  return "file";
}

export async function uploadExpertDocumentAction(formData: FormData) {
  const expert = await getCurrentExpertProfile();

  await assertExpertRateLimit(expert.userId, "upload-document");

  const type = getStringValue(formData, "type");
  const title = cleanText(getStringValue(formData, "title"), 80);
  const file = formData.get("file");

  if (type !== "CV" && type !== "PORTFOLIO") {
    redirectWithError("/expert/profile", "invalid-document-type");
  }

  if (!title) {
    redirectWithError("/expert/profile", "missing-document-title");
  }

  if (!(file instanceof File) || file.size === 0) {
    redirectWithError("/expert/profile", "missing-document-file");
  }

  if (file.size > MAX_EXPERT_DOCUMENT_SIZE_BYTES) {
    redirectWithError("/expert/profile", "document-too-large");
  }

  if (!ALLOWED_EXPERT_DOCUMENT_TYPES.includes(file.type)) {
    redirectWithError("/expert/profile", "invalid-document-file");
  }

  const extension = getSafeFileExtension(file.name, file.type);

  const storagePath = `${expert.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabaseAdmin.storage
    .from("expert-documents")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    redirectWithError("/expert/profile", "document-upload-failed");
  }

  const { data } = supabaseAdmin.storage
    .from("expert-documents")
    .getPublicUrl(storagePath);

  await prisma.expertDocument.create({
    data: {
      expertId: expert.id,
      type,
      title,
      fileUrl: data.publicUrl,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  });

  revalidateExpertPaths(expert.id);

  redirect("/expert/profile?saved=1");
}
function getStoragePathFromExpertDocumentUrl(fileUrl: string) {
  const marker = "/expert-documents/";
  const markerIndex = fileUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const rawPath = fileUrl.slice(markerIndex + marker.length).split("?")[0];

  if (!rawPath) {
    return null;
  }

  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath;
  }
}

export async function deleteExpertDocumentAction(formData: FormData) {
  const expert = await getCurrentExpertProfile();

  await assertExpertRateLimit(expert.userId, "delete-document");

  const documentId = getStringValue(formData, "documentId");

  if (!documentId) {
    redirectWithError("/expert/profile", "document-not-found");
  }

  const expertDocument = await prisma.expertDocument.findFirst({
    where: {
      id: documentId,
      expertId: expert.id,
    },
  });

  if (!expertDocument) {
    redirectWithError("/expert/profile", "document-not-found");
  }

  const storagePath = getStoragePathFromExpertDocumentUrl(expertDocument.fileUrl);

  if (storagePath) {
    await supabaseAdmin.storage.from("expert-documents").remove([storagePath]);
  }

  await prisma.expertDocument.delete({
    where: {
      id: expertDocument.id,
    },
  });

  revalidateExpertPaths(expert.id);

  redirect("/expert/profile?deleted=1");
}
