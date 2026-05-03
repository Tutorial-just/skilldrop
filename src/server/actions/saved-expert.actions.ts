"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function saveExpertAction(formData: FormData) {
  const { user } = await requireRole(["buyer", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const expertId = getStringValue(formData, "expertId");

  if (!expertId) {
    redirect("/experts");
  }

  const buyer = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!buyer) {
    redirect("/sign-in");
  }

  const expert = await prisma.expertProfile.findUnique({
    where: {
      id: expertId,
    },
    include: {
      user: true,
    },
  });

  if (!expert) {
    redirect("/experts");
  }

  if (expert.userId === buyer.id) {
    redirect(`/experts/${expertId}?error=cannot-save-yourself`);
  }

  await prisma.savedExpert.upsert({
    where: {
      buyerId_expertId: {
        buyerId: buyer.id,
        expertId,
      },
    },
    update: {},
    create: {
      buyerId: buyer.id,
      expertId,
    },
  });

  revalidatePath("/buyer");
  revalidatePath("/buyer/saved");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expertId}`);

  redirect(`/experts/${expertId}?saved=1`);
}

export async function unsaveExpertAction(formData: FormData) {
  const { user } = await requireRole(["buyer", "admin"]);

  const email = user.email?.toLowerCase();

  if (!email) {
    redirect("/sign-in");
  }

  const expertId = getStringValue(formData, "expertId");
  const returnTo = getStringValue(formData, "returnTo") || "/buyer/saved";

  if (!expertId) {
    redirect(returnTo);
  }

  const buyer = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!buyer) {
    redirect("/sign-in");
  }

  await prisma.savedExpert.deleteMany({
    where: {
      buyerId: buyer.id,
      expertId,
    },
  });

  revalidatePath("/buyer");
  revalidatePath("/buyer/saved");
  revalidatePath("/experts");
  revalidatePath(`/experts/${expertId}`);

  redirect(returnTo);
}