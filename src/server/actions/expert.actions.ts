"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function applyExpertAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const country = String(formData.get("country") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  const languages = parseList(String(formData.get("languages") ?? ""));
  const skills = parseList(String(formData.get("skills") ?? ""));
  const tags = parseTags(String(formData.get("tags") ?? ""));

  const serviceTitle = String(formData.get("serviceTitle") ?? "").trim();
  const serviceDescription = String(
    formData.get("serviceDescription") ?? "",
  ).trim();

  const durationMinutes = Number(formData.get("durationMinutes") ?? 15);
  const priceEuros = Number(formData.get("priceEuros") ?? 15);

  if (
    !name ||
    !email ||
    !timezone ||
    !headline ||
    !bio ||
    languages.length === 0 ||
    skills.length === 0 ||
    !serviceTitle ||
    !serviceDescription ||
    !durationMinutes ||
    !priceEuros
  ) {
    throw new Error("Missing required expert application fields.");
  }

  const finalTags = Array.from(
    new Set([
      ...tags,
      ...skills.map((skill) => normalizeTag(skill)),
      ...serviceTitle
        .split(" ")
        .map((word) => normalizeTag(word))
        .filter((tag) => tag.length > 2),
    ]),
  ).slice(0, 20);

  const category =
    (await prisma.category.findFirst({
      orderBy: {
        createdAt: "asc",
      },
    })) ??
    (await prisma.category.create({
      data: {
        name: "Career",
        slug: "career",
        description: "Career advice and professional development.",
      },
    }));

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: {
        email,
      },
      update: {
        name,
        role: "EXPERT",
      },
      create: {
        email,
        name,
        role: "EXPERT",
      },
    });

    const expertProfile = await tx.expertProfile.upsert({
      where: {
        userId: user.id,
      },
      update: {
        headline,
        bio,
        country: country || null,
        timezone,
        languages,
        skills,
        tags: finalTags,
        status: "PENDING",
      },
      create: {
        userId: user.id,
        headline,
        bio,
        country: country || null,
        timezone,
        languages,
        skills,
        tags: finalTags,
        status: "PENDING",
      },
    });

    await tx.service.create({
      data: {
        expertId: expertProfile.id,
        categoryId: category.id,
        title: serviceTitle,
        description: serviceDescription,
        durationMinutes,
        priceCents: Math.round(priceEuros * 100),
        currency: "EUR",
        isActive: true,
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/experts");
  revalidatePath("/admin/metrics");
  revalidatePath("/experts");
  revalidatePath("/become-expert");

  redirect("/become-expert?submitted=1");
}

export async function approveExpertAction(formData: FormData) {
  const expertId = String(formData.get("expertId") ?? "");

  if (!expertId) {
    throw new Error("Expert ID is required.");
  }

  await prisma.expertProfile.update({
    where: {
      id: expertId,
    },
    data: {
      status: "APPROVED",
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/experts");
  revalidatePath("/admin/metrics");
  revalidatePath("/experts");
}

export async function rejectExpertAction(formData: FormData) {
  const expertId = String(formData.get("expertId") ?? "");

  if (!expertId) {
    throw new Error("Expert ID is required.");
  }

  await prisma.expertProfile.update({
    where: {
      id: expertId,
    },
    data: {
      status: "REJECTED",
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/experts");
  revalidatePath("/admin/metrics");
  revalidatePath("/experts");
}

export async function suspendExpertAction(formData: FormData) {
  const expertId = String(formData.get("expertId") ?? "");

  if (!expertId) {
    throw new Error("Expert ID is required.");
  }

  await prisma.expertProfile.update({
    where: {
      id: expertId,
    },
    data: {
      status: "SUSPENDED",
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/experts");
  revalidatePath("/admin/metrics");
  revalidatePath("/experts");
}

export async function verifyExpertAction(formData: FormData) {
  const expertId = String(formData.get("expertId") ?? "");

  if (!expertId) {
    throw new Error("Expert ID is required.");
  }

  await prisma.expertProfile.update({
    where: {
      id: expertId,
    },
    data: {
      isVerified: true,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/experts");
  revalidatePath("/admin/metrics");
  revalidatePath("/experts");
}

export async function unverifyExpertAction(formData: FormData) {
  const expertId = String(formData.get("expertId") ?? "");

  if (!expertId) {
    throw new Error("Expert ID is required.");
  }

  await prisma.expertProfile.update({
    where: {
      id: expertId,
    },
    data: {
      isVerified: false,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/experts");
  revalidatePath("/admin/metrics");
  revalidatePath("/experts");
}

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((item) => normalizeTag(item))
    .filter(Boolean);
}

function normalizeTag(value: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replaceAll("#", "")
    .replaceAll("/", "-")
    .replaceAll("_", "-")
    .replaceAll(" ", "-")
    .replace(/[^a-z0-9-]/g, "");

  if (!cleaned) return "";

  return `#${cleaned}`;
}